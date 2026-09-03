const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface Category {
  id: number;
  name: string;
  isActive?: boolean;
}

export interface RelatedSystem {
  id: number;
  name: string;
  isActive?: boolean;
}

export interface SystemStatus {
  online: boolean;
  categories: Category[];
}

export interface Requester {
  id: number;
  name: string;
  email: string;
  isActive?: boolean;
}

export interface CreateTicketPayload {
  categoryId: number;
  relatedSystemId: number;
  requestedPriority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  summary: string;
  description: string;
}

export interface TicketQueryParams {
  search?: string;
  categoryId?: string | number;
  relatedSystemId?: string | number;
  requestedPriority?: string;
  currentStatus?: string;
  sortBy?: string;
  sortOrder?: string;
  page?: number;
  pageSize?: number;
}

export async function checkSystem(): Promise<SystemStatus> {
  try {
    const healthRes = await fetch(`${API_URL}/api/health`);
    if (!healthRes.ok) {
      throw new Error(`Server responded with status ${healthRes.status}`);
    }

    const categoriesRes = await fetch(`${API_URL}/api/categories`);
    if (!categoriesRes.ok) {
      throw new Error(`Server responded with status ${categoriesRes.status}`);
    }

    const categories: Category[] = await categoriesRes.json();
    return { online: true, categories };
  } catch (err) {
    throw new Error("Unable to connect to the server. Please check your connection and try again.");
  }
}

export async function fetchActiveRequesters(): Promise<Requester[]> {
  const res = await fetch(`${API_URL}/api/requesters/active`);
  if (!res.ok) {
    throw new Error("Unable to load requesters. Please check your connection and try again.");
  }
  const data = await res.json();
  return Array.isArray(data) ? data.filter((r: Requester) => r.isActive !== false) : [];
}

export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(`${API_URL}/api/categories`);
  if (!res.ok) {
    throw new Error("Unable to load categories.");
  }
  return res.json();
}

export async function fetchRelatedSystems(): Promise<RelatedSystem[]> {
  const res = await fetch(`${API_URL}/api/related-systems`);
  if (!res.ok) {
    throw new Error("Unable to load related systems.");
  }
  return res.json();
}

export function getSelectedRequesterId(): string | null {
  return localStorage.getItem("selectedRequesterId");
}

export function setSelectedRequesterId(id: string | null): void {
  if (id) {
    localStorage.setItem("selectedRequesterId", id);
  } else {
    localStorage.removeItem("selectedRequesterId");
  }
}

export async function fetchWithRequesterContext(
  url: string,
  options: RequestInit = {},
  explicitRequesterId?: string
): Promise<Response> {
  const requesterId = explicitRequesterId ?? getSelectedRequesterId();
  const headers: Record<string, string> = {};

  if (options.headers) {
    if (options.headers instanceof Headers) {
      options.headers.forEach((value, key) => {
        headers[key] = value;
      });
    } else if (Array.isArray(options.headers)) {
      options.headers.forEach(([key, value]) => {
        headers[key] = value;
      });
    } else {
      Object.assign(headers, options.headers);
    }
  }

  if (requesterId) {
    headers["X-Requester-Id"] = String(requesterId);
  }

  return fetch(url, { ...options, headers });
}

export async function fetchMyTickets(
  params?: TicketQueryParams,
  explicitRequesterId?: string
): Promise<any> {
  const searchParams = new URLSearchParams();

  if (params) {
    if (params.search && params.search.trim()) searchParams.set("search", params.search.trim());
    if (params.categoryId) searchParams.set("categoryId", String(params.categoryId));
    if (params.relatedSystemId) searchParams.set("relatedSystemId", String(params.relatedSystemId));
    if (params.requestedPriority) searchParams.set("requestedPriority", params.requestedPriority);
    if (params.currentStatus) searchParams.set("currentStatus", params.currentStatus);
    if (params.sortBy) searchParams.set("sortBy", params.sortBy);
    if (params.sortOrder) searchParams.set("sortOrder", params.sortOrder);
    if (params.page) searchParams.set("page", String(params.page));
    if (params.pageSize) searchParams.set("pageSize", String(params.pageSize));
  }

  const queryString = searchParams.toString();
  const url = `${API_URL}/api/tickets${queryString ? `?${queryString}` : ""}`;

  const res = await fetchWithRequesterContext(url, {}, explicitRequesterId);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw { status: res.status, data: errorData };
  }
  return res.json();
}

export async function fetchTicketById(id: string, explicitRequesterId?: string): Promise<any> {
  const res = await fetchWithRequesterContext(`${API_URL}/api/tickets/${id}`, {}, explicitRequesterId);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw { status: res.status, data: errorData };
  }
  return res.json();
}

export async function createTicket(payload: CreateTicketPayload, explicitRequesterId?: string): Promise<any> {
  const res = await fetchWithRequesterContext(
    `${API_URL}/api/tickets`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
    explicitRequesterId
  );

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw { status: res.status, data: errorData };
  }

  return res.json();
}

export async function uploadAttachment(ticketId: string, file: File, explicitRequesterId?: string): Promise<any> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetchWithRequesterContext(
    `${API_URL}/api/tickets/${ticketId}/attachments`,
    {
      method: "POST",
      body: formData,
    },
    explicitRequesterId
  );

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw { status: res.status, data: errorData };
  }

  return res.json();
}

export async function downloadAttachment(attachmentId: string, explicitRequesterId?: string): Promise<Response> {
  const res = await fetchWithRequesterContext(
    `${API_URL}/api/attachments/${attachmentId}/download`,
    {},
    explicitRequesterId
  );

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw { status: res.status, data: errorData };
  }

  return res;
}

export async function softRemoveAttachment(
  attachmentId: string,
  removalReason: string,
  explicitRequesterId?: string
): Promise<any> {
  const res = await fetchWithRequesterContext(
    `${API_URL}/api/attachments/${attachmentId}`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ removalReason }),
    },
    explicitRequesterId
  );

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw { status: res.status, data: errorData };
  }

  return res.json();
}
