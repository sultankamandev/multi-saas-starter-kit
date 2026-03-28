import {
  DataProvider,
  fetchUtils,
  type CreateParams,
  type DeleteManyParams,
  type DeleteParams,
  type GetListParams,
  type GetManyParams,
  type GetManyReferenceParams,
  type GetOneParams,
  type RaRecord,
  type UpdateManyParams,
  type UpdateParams,
} from 'react-admin';
import type { AxiosError } from 'axios';
import { api } from './api';

type HttpClientResult = {
  status: number;
  headers: unknown;
  body: unknown;
  json: unknown;
};

/**
 * Axios wrapper for React-Admin: rejects on HTTP/network errors so list responses
 * are never shaped as { data: errorObject } (which triggers data_provider_error).
 */
const httpClient = async (
  url: string,
  options: Record<string, unknown> = {}
): Promise<HttpClientResult> => {
  const cleanUrl = url.startsWith('/') ? url.slice(1) : url;
  const method = (options.method as string) || 'GET';
  const body = options.body ? JSON.parse(options.body as string) : undefined;

  try {
    const response = await api({
      method: method as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
      url: cleanUrl,
      data: body,
    });
    return {
      status: response.status,
      headers: response.headers,
      body: response.data,
      json: response.data,
    };
  } catch (err: unknown) {
    const ax = err as AxiosError<{ message?: string; error?: string }>;
    if (ax.response) {
      const d = ax.response.data;
      const msg =
        (typeof d === 'object' &&
          d &&
          'message' in d &&
          typeof (d as { message: string }).message === 'string' &&
          (d as { message: string }).message) ||
        (typeof d === 'object' &&
          d &&
          'error' in d &&
          typeof (d as { error: string }).error === 'string' &&
          (d as { error: string }).error) ||
        ax.message ||
        `Request failed (${ax.response.status})`;
      const error = new Error(msg) as Error & { status?: number; body?: unknown };
      error.status = ax.response.status;
      error.body = d;
      throw error;
    }
    throw err;
  }
};

function ensureListResult(data: unknown, total: unknown): { data: RaRecord[]; total: number } {
  const rows = (Array.isArray(data) ? data : []) as RaRecord[];
  const t =
    typeof total === 'number' && !Number.isNaN(total) ? total : rows.length;
  return { data: rows, total: t };
}

/** Node-express admin template expects page, limit, sort_order (not _page/_limit). */
function listQueryParams(resource: string, params: GetListParams): Record<string, string> {
  const page = params.pagination?.page ?? 1;
  const perPage = params.pagination?.perPage ?? 10;
  const field = params.sort?.field ?? 'id';
  const order = params.sort?.order ?? 'ASC';
  const filter = fetchUtils.flattenObject(params.filter ?? {}) as Record<string, string>;
  const out: Record<string, string> = { ...filter };

  if (resource === 'users' || resource === 'actions') {
    out.page = String(page);
    out.limit = String(perPage);
    out.sort_order = String(order).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    return out;
  }

  out._page = String(page);
  out._limit = String(perPage);
  out._sort = String(field);
  out._order = String(order);
  return out;
}

const dataProviderImpl = {
  getList: async (resource: string, params: GetListParams) => {
    const query = listQueryParams(resource, params);
    const url = `/api/admin/${resource}?${new URLSearchParams(query).toString()}`;

    const { json } = await httpClient(url);

    if (resource === 'users' && json && typeof json === 'object' && Array.isArray((json as { data?: unknown }).data)) {
      const j = json as { data: unknown[]; total?: number };
      return ensureListResult(j.data, j.total ?? j.data.length);
    }

    if (resource === 'actions' && json && typeof json === 'object' && Array.isArray((json as { data?: unknown }).data)) {
      const j = json as { data: unknown[]; total?: number };
      return ensureListResult(j.data, j.total ?? j.data.length);
    }

    if (resource === 'blocked-ips') {
      const raw =
        Array.isArray(json) ? json : (json as { data?: unknown; blocked_ips?: unknown })?.data ??
          (json as { blocked_ips?: unknown })?.blocked_ips ??
          [];
      const rows = Array.isArray(raw) ? raw : [];
      const data = rows.map((r: Record<string, unknown> & { id?: string | number; ip?: string }) => ({
        ...r,
        id: r.id ?? r.ip,
      }));
      const total =
        typeof json === 'object' && json !== null && 'total' in json && typeof (json as { total: unknown }).total === 'number'
          ? (json as { total: number }).total
          : data.length;
      return ensureListResult(data, total);
    }

    if (resource === 'settings') {
      if (Array.isArray(json)) {
        return ensureListResult(json, json.length);
      }
      if (
        json &&
        typeof json === 'object' &&
        Array.isArray((json as { settings?: unknown }).settings)
      ) {
        const j = json as { settings: unknown[]; count?: number };
        const rows = j.settings as Record<string, unknown>[];
        const data = rows.map((r) => ({
          ...r,
          id: r.id ?? r.key,
        }));
        return ensureListResult(data, j.count ?? data.length);
      }
    }

    const resourceKey = resource === 'users' ? 'users' : resource === 'actions' ? 'actions' : null;
    if (
      resourceKey &&
      json &&
      typeof json === 'object' &&
      Array.isArray((json as Record<string, unknown>)[resourceKey])
    ) {
      const j = json as { count?: number } & Record<string, unknown[]>;
      const arr = j[resourceKey]!;
      return ensureListResult(arr, j.count ?? arr.length);
    }

    const j = json as { data?: unknown; total?: number; count?: number } | unknown[] | null;
    if (j && typeof j === 'object' && !Array.isArray(j) && Array.isArray(j.data)) {
      return ensureListResult(j.data, j.total ?? j.count ?? j.data.length);
    }
    if (Array.isArray(j)) {
      return ensureListResult(j, j.length);
    }

    return ensureListResult([], 0);
  },

  getOne: async (resource: string, params: GetOneParams) => {
    const { json } = await httpClient(`/api/admin/${resource}/${params.id}`);

    return {
      data: ((json as { user?: RaRecord; data?: RaRecord }).user ||
        (json as { data?: RaRecord }).data ||
        json) as RaRecord,
    };
  },

  getMany: async (resource: string, params: GetManyParams) => {
    const query = `?id=${params.ids.join('&id=')}`;
    const { json } = await httpClient(`/api/admin/${resource}${query}`);

    const data = (json as { users?: RaRecord[]; data?: RaRecord[] }).users ||
      (json as { data?: RaRecord[] }).data ||
      json;
    return {
      data: Array.isArray(data) ? data : ([] as RaRecord[]),
    };
  },

  getManyReference: async (resource: string, params: GetManyReferenceParams) => {
    const query = {
      ...fetchUtils.flattenObject(params.filter ?? {}),
      [params.target]: params.id,
      page: String(params.pagination?.page ?? 1),
      limit: String(params.pagination?.perPage ?? 10),
      sort_order: String(params.sort?.order ?? 'ASC').toUpperCase() === 'DESC' ? 'DESC' : 'ASC',
    } as Record<string, string>;
    const url = `/api/admin/${resource}?${new URLSearchParams(query).toString()}`;
    const { json } = await httpClient(url);

    if (json && typeof json === 'object' && Array.isArray((json as { users?: unknown }).users)) {
      const j = json as { users: unknown[]; count?: number };
      return ensureListResult(j.users, j.count ?? j.users.length);
    }

    const j = json as { data?: unknown[]; total?: number; count?: number };
    if (j.data && Array.isArray(j.data)) {
      return ensureListResult(j.data, j.total ?? j.count ?? j.data.length);
    }

    return ensureListResult([], 0);
  },

  create: async (resource: string, params: CreateParams) => {
    const { json } = await httpClient(`/api/admin/${resource}`, {
      method: 'POST',
      body: JSON.stringify(params.data),
    });

    return {
      data: ((json as { user?: RaRecord; data?: RaRecord }).user ||
        (json as { data?: RaRecord }).data ||
        json) as RaRecord,
    };
  },

  update: async (resource: string, params: UpdateParams) => {
    const { json } = await httpClient(`/api/admin/${resource}/${params.id}`, {
      method: 'PUT',
      body: JSON.stringify(params.data),
    });

    return {
      data: ((json as { user?: RaRecord; data?: RaRecord }).user ||
        (json as { data?: RaRecord }).data ||
        json) as RaRecord,
    };
  },

  updateMany: async (resource: string, params: UpdateManyParams) => {
    const responses = await Promise.all(
      params.ids.map((id: string | number) =>
        httpClient(`/api/admin/${resource}/${id}`, {
          method: 'PUT',
          body: JSON.stringify(params.data),
        })
      )
    );
    return {
      data: responses.map(
        ({ json: j }) =>
          ((j as { data?: RaRecord; id?: RaRecord['id'] }).data ||
            (j as { id?: RaRecord['id'] }).id ||
            j) as RaRecord['id']
      ),
    };
  },

  delete: async (resource: string, params: DeleteParams) => {
    await httpClient(`/api/admin/${resource}/${params.id}`, {
      method: 'DELETE',
    });
    return {
      data: { id: params.id } as never,
    };
  },

  deleteMany: async (resource: string, params: DeleteManyParams) => {
    await Promise.all(
      params.ids.map((id: string | number) =>
        httpClient(`/api/admin/${resource}/${id}`, {
          method: 'DELETE',
        })
      )
    );
    return {
      data: params.ids,
    };
  },
};

export const dataProvider = dataProviderImpl as unknown as DataProvider;
