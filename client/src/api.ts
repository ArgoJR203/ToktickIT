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
  // Issue 2: call the health endpoint
  let healthRes: Response;
  try {
    healthRes = await fetch(`${API_URL}/api/health`);
  } catch {
    throw new Error(`Unable to connect to API at ${API_URL}`);
  }
  if (!healthRes.ok) throw new Error("Backend is not responding");

  // Issue 4: call the categories endpoint
  let catRes: Response;
  try {
    catRes = await fetch(`${API_URL}/api/categories`);
  } catch {
    throw new Error(`Unable to connect to API at ${API_URL}`);
  }
  if (!catRes.ok) throw new Error("Failed to load categories");
  const categories: Category[] = await catRes.json();

  return { online: true, categories };
}
