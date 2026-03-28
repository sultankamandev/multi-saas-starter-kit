"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";
import Navigation from "@/components/Navigation";

const featureIconClass =
  "flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-elevated text-accent shadow-sm";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();
  const t = useTranslations("landing");
  const tc = useTranslations("common");
  const tn = useTranslations("nav");

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return (
      <>
        <Navigation />
        <main className="bg-app-mesh bg-noise flex min-h-[calc(100dvh-4.25rem)] flex-col items-center justify-center px-4">
          <div className="h-12 w-12 animate-pulse rounded-2xl border border-border bg-elevated shadow-lg" />
          <p className="mt-6 text-sm font-medium text-muted">{tc("loading")}</p>
        </main>
      </>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <>
      <Navigation />
      <main className="bg-app-mesh bg-noise text-foreground">
        <section className="relative overflow-hidden px-4 pb-24 pt-16 sm:px-6 sm:pt-20 lg:px-8 lg:pb-32">
          <div className="relative mx-auto grid max-w-7xl gap-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center lg:gap-12">
            <div>
              <div className="flex items-center gap-3">
                <span className="h-px w-10 bg-accent/60" aria-hidden />
                <span className="font-display text-xs font-semibold uppercase tracking-[0.28em] text-muted">
                  {tn("appName")}
                </span>
              </div>
              <h1 className="font-display mt-6 text-balance text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
                <span className="text-foreground">{t("hero.title")}</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted sm:text-xl">
                {t("hero.subtitle")}
              </p>
              <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center rounded-full bg-accent px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-accent/30 transition hover:bg-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                >
                  {t("hero.ctaPrimary")}
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-full border border-border-strong bg-elevated/90 px-8 py-3.5 text-base font-semibold text-foreground shadow-sm backdrop-blur-sm transition hover:border-accent/40 hover:bg-elevated focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
                >
                  {t("hero.ctaSecondary")}
                </Link>
              </div>
            </div>

            <div className="relative lg:pl-4">
              <div className="absolute -right-6 -top-6 h-40 w-40 rounded-full bg-accent/15 blur-3xl" aria-hidden />
              <div className="absolute -bottom-10 left-10 h-48 w-48 rounded-full bg-accent-glow/20 blur-3xl" aria-hidden />
              <div className="animate-float relative overflow-hidden rounded-3xl border border-border bg-elevated/90 p-8 shadow-[0_24px_80px_-24px_oklch(0.35_0.06_265_/_0.35)] backdrop-blur-md">
                <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
                  <div className="flex gap-2">
                    <span className="h-3 w-3 rounded-full bg-[oklch(0.78_0.12_25)]" />
                    <span className="h-3 w-3 rounded-full bg-[oklch(0.88_0.14_85)]" />
                    <span className="h-3 w-3 rounded-full bg-[oklch(0.72_0.14_155)]" />
                  </div>
                  <span className="rounded-full bg-subtle px-3 py-1 text-xs font-medium text-muted">
                    live
                  </span>
                </div>
                <div className="space-y-4">
                  <div className="h-3 max-w-[85%] rounded-full bg-subtle animate-shimmer sm:w-3/4" />
                  <div className="h-3 w-full max-w-full rounded-full bg-subtle" />
                  <div className="h-3 max-w-[70%] rounded-full bg-subtle sm:w-5/6" />
                  <div className="mt-8 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-border bg-canvas p-4">
                      <div className="text-2xl font-display font-bold text-accent">24/7</div>
                      <div className="mt-1 text-xs text-muted">Auth &amp; sessions</div>
                    </div>
                    <div className="rounded-2xl border border-border bg-canvas p-4">
                      <div className="text-2xl font-display font-bold text-foreground">i18n</div>
                      <div className="mt-1 text-xs text-muted">7 locales</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-border/70 bg-elevated/50 px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                {t("features.title")}
              </h2>
            </div>
            <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <article className="group flex flex-col rounded-3xl border border-border bg-elevated p-8 shadow-sm transition hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-md">
                <div className={featureIconClass}>
                  <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.75}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <h3 className="font-display mt-6 text-lg font-semibold">{t("features.items.auth.title")}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">{t("features.items.auth.description")}</p>
              </article>

              <article className="group flex flex-col rounded-3xl border border-border bg-elevated p-8 shadow-sm transition hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-md">
                <div className={featureIconClass}>
                  <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.75}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.75}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
                <h3 className="font-display mt-6 text-lg font-semibold">{t("features.items.admin.title")}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">{t("features.items.admin.description")}</p>
              </article>

              <article className="group flex flex-col rounded-3xl border border-border bg-elevated p-8 shadow-sm transition hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-md">
                <div className={featureIconClass}>
                  <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.75}
                      d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                    />
                  </svg>
                </div>
                <h3 className="font-display mt-6 text-lg font-semibold">{t("features.items.i18n.title")}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">{t("features.items.i18n.description")}</p>
              </article>

              <article className="group flex flex-col rounded-3xl border border-border bg-elevated p-8 shadow-sm transition hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-md">
                <div className={featureIconClass}>
                  <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.75}
                      d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h3 className="font-display mt-6 text-lg font-semibold">{t("features.items.api.title")}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">{t("features.items.api.description")}</p>
              </article>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden px-4 py-24 sm:px-6 lg:px-8">
          <div className="absolute inset-0 bg-foreground" aria-hidden />
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "radial-gradient(ellipse 80% 60% at 20% 40%, oklch(0.55 0.13 195 / 0.5), transparent), radial-gradient(ellipse 60% 50% at 80% 60%, oklch(0.45 0.08 265 / 0.4), transparent)",
            }}
            aria-hidden
          />
          <div className="relative mx-auto max-w-3xl text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight text-ink-inverse sm:text-4xl md:text-5xl">
              {t("cta.title")}
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-ink-inverse/80">{t("cta.description")}</p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex w-full items-center justify-center rounded-full bg-ink-inverse px-8 py-3.5 text-base font-semibold text-foreground shadow-lg transition hover:bg-ink-inverse/90 sm:w-auto"
              >
                {t("cta.register")}
              </Link>
              <Link
                href="/login"
                className="inline-flex w-full items-center justify-center rounded-full border-2 border-ink-inverse/35 px-8 py-3.5 text-base font-semibold text-ink-inverse transition hover:border-ink-inverse/70 hover:bg-ink-inverse/10 sm:w-auto"
              >
                {t("cta.login")}
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
