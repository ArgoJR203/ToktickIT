const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface Category {
  id: number;
  name: string;
}

export interface RelatedSystem {
  id: number;
  name: string;
  categoryId: number | null;
  isActive: boolean;
}

export interface RequesterUser {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
}

export interface SystemStatus {
  online: boolean;
  categories: Category[];
}

/**
 * Fetch active Development Requesters (Issue #2-3, #2-4)
 */
export async function fetchRequesters(): Promise<RequesterUser[]> {
  const res = await fetch(`${API_URL}/api/requesters`);
  if (!res.ok) {
    throw new Error("Failed to load active development requesters.");
  }
  return res.json();
}

/**
 * Fetch Categories (Issue #2-3)
 */
export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(`${API_URL}/api/categories`);
  if (!res.ok) {
    throw new Error("Failed to load categories.");
  }
  return res.json();
}

/**
 * Fetch Related Systems (Issue #2-3)
 */
export async function fetchRelatedSystems(categoryId?: number): Promise<RelatedSystem[]> {
  const url = categoryId
    ? `${API_URL}/api/related-systems?categoryId=${categoryId}`
    : `${API_URL}/api/related-systems`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Failed to load related systems.");
  }
  return res.json();
}

/**
 * Check System health and categories
 */
export async function checkSystem(): Promise<SystemStatus> {
  let healthRes: Response;
  try {
    healthRes = await fetch(`${API_URL}/api/health`);
  } catch {
    throw new Error(`Unable to connect to API at ${API_URL}`);
  }
  if (!healthRes.ok) throw new Error("Backend is not responding");

  const categories = await fetchCategories();
  return { online: true, categories };
}

export interface CreateTicketPayload {
  categoryId: number;
  relatedSystemId: number;
  summary: string;
  description: string;
  requestedPriority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
}

export interface Ticket {
  id: number;
  ticketNumber: string;
  requesterId: number;
  categoryId: number;
  relatedSystemId: number;
  summary: string;
  description: string;
  requestedPriority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  currentStatus: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Submit a new ticket (Issue #2-5)
 */
export async function createTicket(payload: CreateTicketPayload, requesterId: number): Promise<Ticket> {
  const res = await fetch(`${API_URL}/api/tickets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-requester-id": requesterId.toString(),
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    const errorMsg = data.message || data.error || "Failed to create ticket.";
    const err = new Error(errorMsg);
    (err as Record<string, unknown>).details = data.details;
    (err as Record<string, unknown>).status = res.status;
    throw err;
  }
  return data;
}

