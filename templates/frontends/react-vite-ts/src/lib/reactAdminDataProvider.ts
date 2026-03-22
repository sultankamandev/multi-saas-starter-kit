import { DataProvider } from "react-admin";
import { api } from "@/lib/api";

const dataProvider: DataProvider = {
  getList: async (resource, params) => {
    const { page, perPage } = params.pagination!;
    const { field, order } = params.sort!;
    const query: Record<string, string> = {
      page: String(page),
      limit: String(perPage),
      sort_field: field,
      sort_order: order,
    };
    if (params.filter?.q) query.q = params.filter.q;
    const { data, headers } = await api.get(`/api/admin/${resource}`, { params: query });
    const total = parseInt(headers["x-total-count"] || "0", 10) || data.total || 0;
    return { data: data.data || data, total };
  },
  getOne: async (resource, params) => {
    const { data } = await api.get(`/api/admin/${resource}/${params.id}`);
    return { data: data.user || data };
  },
  create: async (resource, params) => {
    const { data } = await api.post(`/api/admin/${resource}`, params.data);
    return { data: data.user || data };
  },
  update: async (resource, params) => {
    const { data } = await api.put(`/api/admin/${resource}/${params.id}`, params.data);
    return { data: data.user || data };
  },
  updateMany: async (resource, params) => {
    const data = await Promise.all(
      params.ids.map((id) =>
        api.put(`/api/admin/${resource}/${id}`, params.data).then((r) => r.data.user || r.data)
      )
    );
    return { data };
  },
  delete: async (resource, params) => {
    await api.delete(`/api/admin/${resource}/${params.id}`);
    return { data: { id: params.id } as any };
  },
  deleteMany: async (resource, params) => {
    await Promise.all(params.ids.map((id) => api.delete(`/api/admin/${resource}/${id}`)));
    return { data: params.ids };
  },
  getMany: async (resource, params) => {
    const results = await Promise.all(params.ids.map((id) => api.get(`/api/admin/${resource}/${id}`)));
    return { data: results.map((r) => r.data.user || r.data) };
  },
  getManyReference: async (resource, params) => {
    const { page, perPage } = params.pagination;
    const { data, headers } = await api.get(`/api/admin/${resource}`, {
      params: { page: String(page), limit: String(perPage), [params.target]: params.id },
    });
    const total = parseInt(headers["x-total-count"] || "0", 10) || data.total || 0;
    return { data: data.data || data, total };
  },
};

export default dataProvider;
