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
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/requesters`);
  } catch {
    throw new Error(
      `Unable to connect to the backend server (${API_URL}). The server may be offline or unreachable. Please ensure the backend server is running.`
    );
  }

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

export interface TicketItem extends Ticket {
  category: { id: number; name: string };
  relatedSystem: { id: number; name: string };
  _count?: { attachments: number };
}

export interface FetchTicketsParams {
  search?: string;
  categoryId?: string | number;
  requestedPriority?: string;
  currentStatus?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface PaginatedTicketsResponse {
  data: TicketItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

/**
 * Fetch paginated ticket list for current requester (Issue #2-6)
 */
export async function fetchTickets(
  params: FetchTicketsParams,
  requesterId: number
): Promise<PaginatedTicketsResponse> {
  const query = new URLSearchParams();

  if (params.search && params.search.trim()) query.set("search", params.search.trim());
  if (params.categoryId) query.set("categoryId", params.categoryId.toString());
  if (params.requestedPriority) query.set("requestedPriority", params.requestedPriority);
  if (params.currentStatus) query.set("currentStatus", params.currentStatus);
  if (params.sortBy) query.set("sortBy", params.sortBy);
  if (params.sortOrder) query.set("sortOrder", params.sortOrder);
  if (params.page) query.set("page", params.page.toString());
  if (params.pageSize) query.set("pageSize", params.pageSize.toString());

  const url = `${API_URL}/api/tickets?${query.toString()}`;

  const res = await fetch(url, {
    headers: {
      "x-requester-id": requesterId.toString(),
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch ticket list.");
  }

  return res.json();
}

export interface AttachmentItem {
  id: number;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  isRemoved: boolean;
  removalReason?: string | null;
  removedAt?: string | null;
  createdAt: string;
}

export interface TicketDetail {
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
  category: { id: number; name: string };
  relatedSystem: { id: number; name: string };
  requester: { id: number; name: string; email: string };
  attachments: AttachmentItem[];
}

/**
 * Fetch owned ticket detail by ID (Issue #2-7)
 */
export async function fetchTicketDetail(
  ticketId: number,
  requesterId: number
): Promise<TicketDetail> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}`, {
    headers: {
      "x-requester-id": requesterId.toString(),
    },
  });

  let data: Record<string, any> = {};
  try {
    data = await res.json();
  } catch {
    // Non-JSON response
  }

  if (!res.ok) {
    const errorMsg = data.message || data.error || `Failed to load ticket details (${res.status})`;
    const err = new Error(errorMsg);
    (err as Record<string, unknown>).status = res.status;
    (err as Record<string, unknown>).error = data.error;
    throw err;
  }

  return data as TicketDetail;
}

/**
 * Upload an attachment to a ticket (Issue #2-8)
 */
export async function uploadAttachment(
  ticketId: number,
  file: File,
  requesterId: number
): Promise<AttachmentItem> {
  const formData = new FormData();
  formData.append("file", file);

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/tickets/${ticketId}/attachments`, {
      method: "POST",
      headers: {
        "x-requester-id": requesterId.toString(),
      },
      body: formData,
    });
  } catch {
    throw new Error(
      "Unable to connect to the backend server. The server may be offline or unreachable."
    );
  }

  let data: Record<string, any> = {};
  try {
    data = await res.json();
  } catch {
    // Non-JSON response
  }

  if (!res.ok) {
    const errorMsg = data.message || data.error || `Failed to upload attachment (${res.status})`;
    const err = new Error(errorMsg);
    (err as Record<string, unknown>).status = res.status;
    (err as Record<string, unknown>).code = data.error;
    throw err;
  }

  return data as AttachmentItem;
}

/**
 * Soft-remove an attachment (Issue #2-8)
 */
export async function softRemoveAttachment(
  attachmentId: number,
  removalReason: string,
  requesterId: number
): Promise<AttachmentItem> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/attachments/${attachmentId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "x-requester-id": requesterId.toString(),
      },
      body: JSON.stringify({ removalReason }),
    });
  } catch {
    throw new Error(
      "Unable to connect to the backend server. The server may be offline or unreachable."
    );
  }

  let data: Record<string, any> = {};
  try {
    data = await res.json();
  } catch {
    // Non-JSON response
  }

  if (!res.ok) {
    const errorMsg = data.message || data.error || `Failed to remove attachment (${res.status})`;
    const err = new Error(errorMsg);
    (err as Record<string, unknown>).status = res.status;
    (err as Record<string, unknown>).code = data.error;
    throw err;
  }

  return data as AttachmentItem;
}

/**
 * Download an active attachment file (Issue #2-8)
 */
export async function downloadAttachment(
  attachmentId: number,
  originalName: string,
  requesterId: number
): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/attachments/${attachmentId}/download`, {
      headers: {
        "x-requester-id": requesterId.toString(),
      },
    });
  } catch {
    throw new Error(
      "Unable to connect to the backend server. The server may be offline or unreachable."
    );
  }

  if (res.status === 410) {
    let data: Record<string, any> = {};
    try {
      data = await res.json();
    } catch {
      // Non-JSON
    }
    throw new Error(data.message || "This attachment was removed and cannot be downloaded.");
  }

  if (!res.ok) {
    let data: Record<string, any> = {};
    try {
      data = await res.json();
    } catch {
      // Non-JSON
    }
    throw new Error(data.message || data.error || `Failed to download file (${res.status})`);
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.style.display = "none";
  a.href = url;
  a.download = originalName;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

