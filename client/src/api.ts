const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export type Role = "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  requiresPasswordChange: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  user: User;
  token?: string;
  message?: string;
}

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
    const healthRes = await fetch(`${API_URL}/api/health`, { credentials: "include" });
    if (!healthRes.ok) {
      throw new Error(`Server responded with status ${healthRes.status}`);
    }

    const categoriesRes = await fetch(`${API_URL}/api/categories`, { credentials: "include" });
    if (!categoriesRes.ok) {
      throw new Error(`Server responded with status ${categoriesRes.status}`);
    }

    const categories: Category[] = await categoriesRes.json();
    return { online: true, categories };
  } catch (err) {
    throw new Error("Unable to connect to the server. Please check your connection and try again.");
  }
}

export async function loginApi(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw { status: res.status, data };
  }
  return data;
}

export async function logoutApi(): Promise<any> {
  const res = await fetch(`${API_URL}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw { status: res.status, data };
  }
  return data;
}

export async function fetchCurrentUserApi(): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/api/auth/me`, {
    method: "GET",
    credentials: "include",
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw { status: res.status, data };
  }
  return data;
}

export async function changePasswordApi(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/api/auth/change-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw { status: res.status, data };
  }
  return data;
}

export async function fetchActiveRequesters(): Promise<Requester[]> {
  const res = await fetch(`${API_URL}/api/requesters/active`, { credentials: "include" });
  if (!res.ok) {
    throw new Error("Unable to load requesters. Please check your connection and try again.");
  }
  const data = await res.json();
  return Array.isArray(data) ? data.filter((r: Requester) => r.isActive !== false) : [];
}

export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(`${API_URL}/api/categories`, { credentials: "include" });
  if (!res.ok) {
    throw new Error("Unable to load categories.");
  }
  return res.json();
}

export async function fetchRelatedSystems(): Promise<RelatedSystem[]> {
  const res = await fetch(`${API_URL}/api/related-systems`, { credentials: "include" });
  if (!res.ok) {
    throw new Error("Unable to load related systems.");
  }
  return res.json();
}

export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
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

  return fetch(url, { ...options, headers, credentials: "include" });
}

export async function fetchMyTickets(
  params?: TicketQueryParams
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

  const res = await fetchWithAuth(url);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw { status: res.status, data: errorData };
  }
  return res.json();
}

export async function fetchTicketById(id: string): Promise<any> {
  const res = await fetchWithAuth(`${API_URL}/api/tickets/${id}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw { status: res.status, data: errorData };
  }
  return res.json();
}

export async function createTicket(payload: CreateTicketPayload): Promise<any> {
  const res = await fetchWithAuth(
    `${API_URL}/api/tickets`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw { status: res.status, data: errorData };
  }

  return res.json();
}

export async function uploadAttachment(ticketId: string, file: File): Promise<any> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetchWithAuth(
    `${API_URL}/api/tickets/${ticketId}/attachments`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw { status: res.status, data: errorData };
  }

  return res.json();
}

export async function downloadAttachment(attachmentId: string): Promise<Response> {
  const res = await fetchWithAuth(`${API_URL}/api/attachments/${attachmentId}/download`);

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw { status: res.status, data: errorData };
  }

  return res;
}

export async function softRemoveAttachment(
  attachmentId: string,
  removalReason: string
): Promise<any> {
  const res = await fetchWithAuth(
    `${API_URL}/api/attachments/${attachmentId}`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ removalReason }),
    }
  );

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw { status: res.status, data: errorData };
  }

  return res.json();
}

export interface PublicComment {
  id: string;
  ticketId: string;
  authorId: number;
  content: string;
  createdAt: string;
  author?: {
    id: number;
    name: string;
    role: Role;
  };
}

export async function fetchTicketComments(ticketId: string): Promise<{ comments: PublicComment[] }> {
  const res = await fetchWithAuth(`${API_URL}/api/tickets/${ticketId}/comments`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw { status: res.status, data: errorData };
  }
  return res.json();
}

export async function postTicketComment(ticketId: string, content: string): Promise<PublicComment> {
  const res = await fetchWithAuth(`${API_URL}/api/tickets/${ticketId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw { status: res.status, data: errorData };
  }
  return res.json();
}

export async function indicateResolveApi(ticketId: string): Promise<any> {
  const res = await fetchWithAuth(`${API_URL}/api/tickets/${ticketId}/resolve-indicator`, {
    method: "POST",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw { status: res.status, data: errorData };
  }
  return res.json();
}

export async function requestReopenApi(ticketId: string): Promise<any> {
  const res = await fetchWithAuth(`${API_URL}/api/tickets/${ticketId}/reopen-request`, {
    method: "POST",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw { status: res.status, data: errorData };
  }
  return res.json();
}
