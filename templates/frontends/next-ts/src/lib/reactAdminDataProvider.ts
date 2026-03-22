import { DataProvider, fetchUtils } from 'react-admin';
import { api } from './api';

const httpClient = (url: string, options: any = {}) => {
  // Use the existing api instance which already has interceptors configured
  // This ensures Authorization headers and Accept-Language are set automatically
  // The api instance has baseURL configured, so we use the full URL path
  // Remove leading slash if present since api baseURL may already include the path
  const cleanUrl = url.startsWith('/') ? url.slice(1) : url;
  const method = options.method || 'GET';
  const body = options.body ? JSON.parse(options.body) : undefined;

  return api({
    method: method as any,
    url: cleanUrl,
    data: body,
  }).then((response) => ({
    status: response.status,
    headers: response.headers,
    body: response.data,
    json: response.data,
  })).catch((error) => {
    // Handle errors in a format React-Admin expects
    if (error.response) {
      return {
        status: error.response.status,
        headers: error.response.headers,
        body: error.response.data,
        json: error.response.data,
      };
    }
    throw error;
  });
};

/**
 * Custom data provider for React-Admin that integrates with the existing API setup
 * Uses the existing api instance to maintain authentication and i18n headers
 */
export const dataProvider: DataProvider = {
  getList: async (resource, params) => {
    const { page, perPage } = params.pagination!;
    const { field, order } = params.sort!;
    const query = {
      ...fetchUtils.flattenObject(params.filter),
      _page: page,
      _limit: perPage,
      _sort: field,
      _order: order,
    };
    // Use /api/admin prefix for admin endpoints
    const url = `/api/admin/${resource}?${new URLSearchParams(query as any).toString()}`;
    
    const { json } = await httpClient(url);
    
    // Transform backend response format to React-Admin format
    // Backend may return: { users: [...], count: number } or { actions: [...], count: number }
    // React-Admin expects: { data: [...], total: number }
    const resourceKey = resource === 'users' ? 'users' : resource === 'actions' ? 'actions' : null;
    if (resourceKey && json[resourceKey] && Array.isArray(json[resourceKey])) {
      return {
        data: json[resourceKey],
        total: json.count || json[resourceKey].length,
      };
    }
    
    // Fallback to standard format if backend uses different structure
    return {
      data: json.data || json,
      total: json.total || json.count || (Array.isArray(json) ? json.length : 0),
    };
  },

  getOne: async (resource, params) => {
    const { json } = await httpClient(`/api/admin/${resource}/${params.id}`);
    
    // Backend may return { user: {...} } or direct user object
    return {
      data: json.user || json.data || json,
    };
  },

  getMany: async (resource, params) => {
    const query = `?id=${params.ids.join('&id=')}`;
    const { json } = await httpClient(`/api/admin/${resource}${query}`);
    
    // Backend may return { users: [...] } or direct array
    return {
      data: json.users || json.data || json,
    };
  },

  getManyReference: async (resource, params) => {
    const { page, perPage } = params.pagination!;
    const { field, order } = params.sort!;
    const query = {
      ...fetchUtils.flattenObject(params.filter),
      [params.target]: params.id,
      _page: page,
      _limit: perPage,
      _sort: field,
      _order: order,
    };
    const url = `/api/admin/${resource}?${new URLSearchParams(query as any).toString()}`;
    const { json } = await httpClient(url);
    
    // Transform backend response format
    if (json.users && Array.isArray(json.users)) {
      return {
        data: json.users,
        total: json.count || json.users.length,
      };
    }
    
    return {
      data: json.data || json,
      total: json.total || json.count || (Array.isArray(json) ? json.length : 0),
    };
  },

  create: async (resource, params) => {
    const { json } = await httpClient(`/api/admin/${resource}`, {
      method: 'POST',
      body: JSON.stringify(params.data),
    });
    
    // Backend may return { user: {...} } or direct user object
    return {
      data: json.user || json.data || json,
    };
  },

  update: async (resource, params) => {
    const { json } = await httpClient(`/api/admin/${resource}/${params.id}`, {
      method: 'PUT',
      body: JSON.stringify(params.data),
    });
    
    // Backend may return { user: {...} } or direct user object
    return {
      data: json.user || json.data || json,
    };
  },

  updateMany: async (resource, params) => {
    const responses = await Promise.all(
      params.ids.map((id) =>
        httpClient(`/api/admin/${resource}/${id}`, {
          method: 'PUT',
          body: JSON.stringify(params.data),
        })
      )
    );
    return {
      data: responses.map(({ json }) => json.data || json.id || json),
    };
  },

  delete: async (resource, params) => {
    await httpClient(`/api/admin/${resource}/${params.id}`, {
      method: 'DELETE',
    });
    return {
      data: { id: params.id } as any,
    };
  },

  deleteMany: async (resource, params) => {
    await Promise.all(
      params.ids.map((id) =>
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

