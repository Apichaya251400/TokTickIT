const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface Category {
  id: number;
  name: string;
}

export interface SystemStatus {
  online: boolean;
  categories: Category[];
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
