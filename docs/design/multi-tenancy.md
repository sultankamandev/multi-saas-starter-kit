# Design: Multi-Tenancy

**Status: OUT OF SCOPE — not planned.**

This project is deliberately an **auth kit**, not a SaaS kit. Organizations, teams,
billing, and per-tenant data are explicitly not part of it. This document is kept as a
record of the decision and as a starting point for anyone building tenancy *on top of* a
generated project.

## Why it is out of scope

Tenancy is not a feature you bolt on — it is a property of every query in the system. In a
single-stack starter that is a large change; here it would mean implementing and keeping
in sync the same tenant model across three backends and three frontends, and every future
auth feature would then have to be written six times against it. That width is what makes
the multi-stack promise valuable, and it is also what makes tenancy the wrong thing to
take on.

The kit's value is being excellent at the layer below: identity, sessions, 2FA, OAuth,
admin, and i18n, provably identical across stacks. Tenancy belongs in your application.

## If you are adding it yourself

The rest of this document is a workable design, written against this codebase's existing
conventions (`public_id` UUIDs in responses, `snake_case` JSON, soft deletes). It is not
maintained and no template implements it.

## Model

Two new tables, plus one column on the existing `users` table.

### `organizations`

| Column | Type | Notes |
| ------ | ---- | ----- |
| `id` | bigserial PK | internal only, never exposed |
| `public_id` | uuid, unique, not null | the `id` in API responses, matching the existing user convention |
| `name` | varchar(120), not null | display name |
| `slug` | varchar(60), unique, not null | URL-safe; used for `/orgs/:slug` routes |
| `created_at` / `updated_at` / `deleted_at` | timestamptz | soft delete, as with `users` |

### `organization_members`

| Column | Type | Notes |
| ------ | ---- | ----- |
| `id` | bigserial PK | |
| `organization_id` | bigint FK → organizations, not null | |
| `user_id` | bigint FK → users, not null | |
| `role` | varchar(20), not null | `owner \| admin \| member` — scoped to the org, distinct from the global `users.role` |
| `invited_by` | bigint FK → users, null | |
| `invite_email` | citext, null | set while the invite is pending and the user does not exist yet |
| `invite_token_hash` | varchar(64), null | sha256 of the emailed token; never store the raw token |
| `invite_expires_at` | timestamptz, null | |
| `accepted_at` | timestamptz, null | null = pending invite |
| `created_at` / `updated_at` | timestamptz | |

Constraints:

- `unique (organization_id, user_id)` where `user_id is not null`
- `unique (organization_id, invite_email)` where `accepted_at is null`
- at least one `owner` per organization — enforce in the service layer on demote/remove,
  not with a constraint

### `users.default_organization_id`

Nullable FK. Which org to open on login when the JWT does not name one.

## Two roles, deliberately

`users.role` (`user | admin`) stays exactly as it is: it governs the **platform** admin
console that already exists — the one that lists every user and every setting.

`organization_members.role` (`owner | admin | member`) governs data **inside** one tenant.
Conflating them is the classic mistake; a platform admin is staff, an org owner is a
customer.

## Request scoping

The tenant travels in the **access token**, not in the URL, so no endpoint can forget to
scope itself:

```
{
  "sub": "<user public_id>",
  "role": "user",              // existing platform role
  "org": "<org public_id>",    // new
  "org_role": "owner"          // new
}
```

- `POST /auth/login` issues a token scoped to `default_organization_id`.
- `POST /auth/switch-org` exchanges a token for one scoped to another org the user belongs
  to. Refresh tokens keep their org, so a stolen refresh token cannot widen scope.
- Middleware resolves `org` to an internal id once per request and puts it in the request
  context. Every repository method for tenant-owned data takes that id.

The alternative — `/api/orgs/{slug}/...` in the path — was rejected: it makes every
handler responsible for remembering to filter, and one forgotten `WHERE` is a cross-tenant
data leak.

### Defence in depth

Scoping in the repository layer is the primary control. Postgres row-level security is
worth adding for the Go and Python templates as a backstop, but it needs a per-request
`SET LOCAL app.current_org`, which interacts badly with connection pooling — treat it as a
follow-up, not part of the first cut.

## Contract additions

```
GET    /api/orgs                      list orgs the caller belongs to
POST   /api/orgs                      create (caller becomes owner)
GET    /api/orgs/current              current org from token
PATCH  /api/orgs/current              rename / update (owner|admin)
DELETE /api/orgs/current              soft delete (owner)

GET    /api/orgs/current/members      list members and pending invites
POST   /api/orgs/current/invites      invite by email (owner|admin)
DELETE /api/orgs/current/invites/{id} revoke a pending invite
POST   /api/orgs/accept-invite        accept via emailed token (public)
PATCH  /api/orgs/current/members/{id} change org role (owner)
DELETE /api/orgs/current/members/{id} remove member (owner|admin)

POST   /auth/switch-org               re-scope the access token
```

All responses keep the existing conventions: `snake_case` keys, `public_id` as `id`,
errors as `{ error, message, error_code?, errors? }`.

## Migration for existing installs

Backfill, so nobody logs into an empty app:

1. Create `organizations` and `organization_members`.
2. For each existing user, create a personal org (`name = first_name + "'s Workspace"`,
   slug derived from username with a uniqueness suffix) and an `owner` membership.
3. Set `users.default_organization_id`.
4. Only then add `not null` to the tenant FK on any tenant-owned table.

Ship as a numbered SQL migration alongside `001_schema_hardening.sql`, because auto-migrate
cannot express the backfill.

## What implementing it would involve

Recorded for anyone taking this on in their own project. Order matters — contract first,
then one backend end-to-end to validate the design, then fan out.

| # | Work | Where |
| - | ---- | ----- |
| 1 | Contract: schemas, paths, regenerate types | `contract/` |
| 2 | Compliance tests, including a **cross-tenant isolation test** that proves org A cannot read org B | `contract/compliance/` |
| 3 | Reference implementation | `templates/backends/go-gin` |
| 4 | Port | `templates/backends/python-fastapi` |
| 5 | Port | `templates/backends/node-express` (blocked on its 501 stubs) |
| 6 | Org switcher, members page, invite-accept page | all three frontends |
| 7 | Locale keys for the new UI, all 7 languages | all three frontends |

Step 2 before step 3 is deliberate: the isolation test is the thing that makes tenancy
trustworthy, and writing it first stops it being shaped around one implementation's
quirks.

## Also out of scope

- **Billing** — would need this model to exist first. A `subscriptions` table keyed by
  `organization_id`, plus Stripe webhooks, is a separate design.
- **Per-org custom domains and SSO** — enterprise features, much later.
- **Sharding or database-per-tenant** — shared-schema with a tenant column is right at this
  scale; revisit only with a concrete reason.
