const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface Category {
  id: number;
  name: string;
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
  // Filter active requesters if API returns isActive property
  return Array.isArray(data) ? data.filter((r: Requester) => r.isActive !== false) : [];
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

export async function fetchWithRequesterContext(url: string, options: RequestInit = {}): Promise<Response> {
  const requesterId = getSelectedRequesterId();
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
    headers["X-Requester-Id"] = requesterId;
  }

  return fetch(url, { ...options, headers });
}

export async function fetchMyTickets(): Promise<any> {
  const res = await fetchWithRequesterContext(`${API_URL}/api/tickets`);
  if (!res.ok) {
    throw new Error(`Failed to fetch tickets: ${res.status}`);
  }
  return res.json();
}
