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

function getAuthHeaders(requesterId?: number): Record<string, string> {
  const headers: Record<string, string> = {};
  if (requesterId !== undefined) {
    headers["x-requester-id"] = requesterId.toString();
  }
  try {
    const token = localStorage.getItem("toktickit_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  } catch {
    // Ignore storage errors in test environments
  }
  return headers;
}

/**
 * Submit a new ticket (Issue #2-5)
 */
export async function createTicket(payload: CreateTicketPayload, requesterId: number): Promise<Ticket> {
  const res = await fetch(`${API_URL}/api/tickets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(requesterId),
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    const errorMsg = data.message || data.error || "Failed to create ticket.";
    const err = new Error(errorMsg);
    (err as unknown as Record<string, unknown>).details = data.details;
    (err as unknown as Record<string, unknown>).status = res.status;
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
    headers: getAuthHeaders(requesterId),
  });

  if (!res.ok) {
    throw new Error("Failed to fetch ticket list.");
  }

  return res.json();
}

export interface AttachmentItem {
  id: number;
  ticketId?: number;
  filename?: string;
  originalName: string;
  mimeType?: string;
  sizeBytes?: number;
  isRemoved: boolean;
  removalReason?: string | null;
  removedAt?: string | null;
  createdAt?: string;
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
  itPriority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  currentStatus: string;
  resolutionIndicated?: boolean;
  resolutionIndicatedAt?: string | null;
  resolutionSummary?: string | null;
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
  requesterId?: number
): Promise<TicketDetail> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}`, {
    headers: getAuthHeaders(requesterId),
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
    (err as unknown as Record<string, unknown>).status = res.status;
    (err as unknown as Record<string, unknown>).error = data.error;
    throw err;
  }

  return data as TicketDetail;
}

export interface PublicComment {
  id: number;
  ticketId: number;
  content: string;
  author: {
    id: number;
    name: string;
    role: UserRole;
  };
  createdAt: string;
}

/**
 * Fetch public comments feed for a ticket (Issue #3-5, API-11)
 */
export async function fetchPublicComments(
  ticketId: number,
  requesterId?: number
): Promise<PublicComment[]> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/comments`, {
    headers: getAuthHeaders(requesterId),
  });

  let data: any;
  try {
    data = await res.json();
  } catch {}

  if (!res.ok) {
    const errorMsg = data?.error?.message || data?.message || "Failed to load public comments.";
    throw new Error(errorMsg);
  }

  return data as PublicComment[];
}

/**
 * Post a public comment on a ticket (Issue #3-5, API-11, API-12)
 */
export async function postPublicComment(
  ticketId: number,
  content: string,
  requesterId?: number
): Promise<PublicComment> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/comments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(requesterId),
    },
    body: JSON.stringify({ content }),
  });

  let data: any;
  try {
    data = await res.json();
  } catch {}

  if (!res.ok) {
    const errorMsg = data?.error?.message || data?.message || "Failed to post comment.";
    throw new Error(errorMsg);
  }

  return data as PublicComment;
}

export interface ResolveIndicationResponse {
  message: string;
  ticketId: number;
  resolutionIndicated: boolean;
  resolutionIndicatedAt: string;
}

/**
 * Requester signal that problem appears resolved (Issue #3-5, API-19, BR-05, BR-16)
 */
export async function indicateProblemResolved(
  ticketId: number,
  requesterId?: number
): Promise<ResolveIndicationResponse> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/resolve-indication`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(requesterId),
    },
  });

  let data: any;
  try {
    data = await res.json();
  } catch {}

  if (!res.ok) {
    const errorMsg = data?.error?.message || data?.message || "Failed to indicate problem resolution.";
    throw new Error(errorMsg);
  }

  return data as ResolveIndicationResponse;
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
      headers: getAuthHeaders(requesterId),
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
    (err as unknown as Record<string, unknown>).status = res.status;
    (err as unknown as Record<string, unknown>).code = data.error;
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
        ...getAuthHeaders(requesterId),
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
    (err as unknown as Record<string, unknown>).status = res.status;
    (err as unknown as Record<string, unknown>).code = data.error;
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
      headers: getAuthHeaders(requesterId),
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

export type UserRole = "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  mustChangePassword: boolean;
  isActive: boolean;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ChangePasswordResponse {
  message: string;
  user: AuthUser;
}

/**
 * Log in with email and password (Issue #3-3, #3-4, API-01, API-02)
 */
export async function login(credentials: { email: string; password: string }): Promise<LoginResponse> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });
  } catch {
    throw new Error("Unable to connect to the backend server. The server may be offline or unreachable.");
  }

  let data: Record<string, any> = {};
  try {
    data = await res.json();
  } catch {
    // Non-JSON
  }

  if (!res.ok) {
    const errorMsg = data.error?.message || data.message || "Invalid email or password. Please try again.";
    const err = new Error(errorMsg);
    (err as unknown as Record<string, unknown>).code = data.error?.code;
    (err as unknown as Record<string, unknown>).status = res.status;
    throw err;
  }

  return data as LoginResponse;
}

/**
 * Log out and revoke active token (Issue #3-3, #3-4, API-06)
 */
export async function logout(token: string): Promise<void> {
  try {
    await fetch(`${API_URL}/api/auth/logout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    // Ignore network failure on logout
  }
}

/**
 * Get current authenticated user profile (Issue #3-3, #3-4, FR-05)
 */
export async function getMe(token: string): Promise<{ user: AuthUser }> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    throw new Error("Unable to connect to the backend server.");
  }

  if (!res.ok) {
    throw new Error(`Authentication check failed (${res.status})`);
  }

  return res.json();
}

/**
 * Change user password (Issue #3-3, #3-4, API-03..05)
 */
export async function changePassword(
  payload: ChangePasswordPayload,
  token: string
): Promise<ChangePasswordResponse> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/auth/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error("Unable to connect to the backend server. The server may be offline or unreachable.");
  }

  let data: Record<string, any> = {};
  try {
    data = await res.json();
  } catch {
    // Non-JSON
  }

  if (!res.ok) {
    const errorMsg = data.error?.message || data.message || "Failed to change password.";
    const err = new Error(errorMsg);
    (err as unknown as Record<string, unknown>).code = data.error?.code;
    (err as unknown as Record<string, unknown>).details = data.error?.details;
    (err as unknown as Record<string, unknown>).status = res.status;
    throw err;
  }

  return data as ChangePasswordResponse;
}

// ---------------------------------------------------------------------------
// Lab 3 — IT Staff Ticket Queue API (Issue #3-6, API-13, API-14)
// ---------------------------------------------------------------------------

export interface StaffTicketItem {
  id: number;
  ticketNumber: string;
  summary: string;
  description?: string;
  category: { id: number; name: string };
  relatedSystem?: { id: number; name: string } | null;
  requester: { id: number; name: string; email: string };
  requestedPriority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  itPriority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  currentStatus: string;
  owner: { id: number; name: string; email: string } | null;
  resolutionIndicated?: boolean;
  resolutionIndicatedAt?: string | null;
  resolutionSummary?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    attachments?: number;
    publicComments?: number;
    internalNotes?: number;
  };
}

export interface FetchStaffTicketsParams {
  search?: string;
  categoryId?: string | number;
  status?: string;
  currentStatus?: string;
  requestedPriority?: string;
  itPriority?: string;
  ownerId?: string | number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface PaginatedStaffTicketsResponse {
  data: StaffTicketItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

/**
 * Fetch IT Staff ticket queue (Issue #3-6, API-13, API-14)
 */
export async function fetchStaffTickets(
  params: FetchStaffTicketsParams = {}
): Promise<PaginatedStaffTicketsResponse> {
  const query = new URLSearchParams();

  if (params.search && params.search.trim()) query.set("search", params.search.trim());
  if (params.categoryId) query.set("categoryId", params.categoryId.toString());
  if (params.status) query.set("status", params.status);
  if (params.currentStatus) query.set("currentStatus", params.currentStatus);
  if (params.requestedPriority) query.set("requestedPriority", params.requestedPriority);
  if (params.itPriority) query.set("itPriority", params.itPriority);
  if (params.ownerId !== undefined && params.ownerId !== "") query.set("ownerId", params.ownerId.toString());
  if (params.sortBy) query.set("sortBy", params.sortBy);
  if (params.sortOrder) query.set("sortOrder", params.sortOrder);
  if (params.page) query.set("page", params.page.toString());
  if (params.pageSize) query.set("pageSize", params.pageSize.toString());

  const url = `${API_URL}/api/staff/tickets?${query.toString()}`;

  const res = await fetch(url, {
    headers: getAuthHeaders(),
  });

  let data: Record<string, any> = {};
  try {
    data = await res.json();
  } catch {
    // Non-JSON response
  }

  if (!res.ok) {
    const errorMsg = data.error?.message || data.message || `Failed to fetch staff tickets (${res.status})`;
    throw new Error(errorMsg);
  }

  return data as PaginatedStaffTicketsResponse;
}

// ---------------------------------------------------------------------------
// Lab 3 — Internal Notes & Staff Ticket Detail API (Issue #3-7, API-08, API-15..18, UI-04..05)
// ---------------------------------------------------------------------------

export interface InternalNote {
  id: number;
  ticketId: number;
  content: string;
  author: {
    id: number;
    name: string;
    role: UserRole;
  };
  createdAt: string;
}

/**
 * Fetch confidential internal notes (Issue #3-7, API-08, UI-05)
 * Restricted to IT_STAFF and ADMINISTRATOR roles.
 */
export async function fetchInternalNotes(ticketId: number): Promise<InternalNote[]> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/notes`, {
    headers: getAuthHeaders(),
  });

  let data: any;
  try {
    data = await res.json();
  } catch {}

  if (!res.ok) {
    const errorMsg = data?.error?.message || data?.message || "Failed to load internal notes.";
    throw new Error(errorMsg);
  }

  return data as InternalNote[];
}

/**
 * Post a confidential internal note (Issue #3-7, API-08, UI-05)
 * Restricted to IT_STAFF and ADMINISTRATOR roles.
 */
export async function postInternalNote(
  ticketId: number,
  content: string
): Promise<InternalNote> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/notes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ content }),
  });

  let data: any;
  try {
    data = await res.json();
  } catch {}

  if (!res.ok) {
    const errorMsg = data?.error?.message || data?.message || "Failed to post internal note.";
    throw new Error(errorMsg);
  }

  return data as InternalNote;
}

export interface StaffTicketDetailData {
  id: number;
  ticketNumber: string;
  summary: string;
  description: string;
  category: { id: number; name: string };
  relatedSystem?: { id: number; name: string } | null;
  requester: { id: number; name: string; email: string };
  requestedPriority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  itPriority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  currentStatus: string;
  owner: { id: number; name: string; email: string } | null;
  resolutionIndicated?: boolean;
  resolutionIndicatedAt?: string | null;
  resolutionSummary?: string | null;
  permittedNextStatuses: string[];
  attachments: AttachmentItem[];
  createdAt: string;
  updatedAt: string;
  _count?: {
    publicComments?: number;
    internalNotes?: number;
  };
}

export interface StaffAssignee {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

/**
 * Fetch full ticket detail for IT Staff with permittedNextStatuses (Issue #3-7, UI-04)
 */
export async function fetchStaffTicketDetail(ticketId: number): Promise<StaffTicketDetailData> {
  const res = await fetch(`${API_URL}/api/staff/tickets/${ticketId}`, {
    headers: getAuthHeaders(),
  });

  let data: Record<string, any> = {};
  try {
    data = await res.json();
  } catch {}

  if (!res.ok) {
    const errorMsg = data.error?.message || data.message || `Failed to fetch ticket detail (${res.status})`;
    throw new Error(errorMsg);
  }

  return data as StaffTicketDetailData;
}

/**
 * Claim or reassign ticket ownership (Issue #3-7, API-16, UI-04)
 */
export async function updateTicketOwner(
  ticketId: number,
  ownerId: number | null
): Promise<{ id: number; owner: { id: number; name: string; email: string } | null }> {
  const res = await fetch(`${API_URL}/api/staff/tickets/${ticketId}/owner`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ ownerId }),
  });

  let data: Record<string, any> = {};
  try {
    data = await res.json();
  } catch {}

  if (!res.ok) {
    const errorMsg = data.error?.message || data.message || "Failed to update ticket owner.";
    throw new Error(errorMsg);
  }

  return data as { id: number; owner: { id: number; name: string; email: string } | null };
}

/**
 * Update IT Priority independently (Issue #3-7, API-15, UI-04)
 */
export async function updateTicketPriority(
  ticketId: number,
  itPriority: string
): Promise<{ id: number; itPriority: string; updatedAt: string }> {
  const res = await fetch(`${API_URL}/api/staff/tickets/${ticketId}/priority`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ itPriority }),
  });

  let data: Record<string, any> = {};
  try {
    data = await res.json();
  } catch {}

  if (!res.ok) {
    const errorMsg = data.error?.message || data.message || "Failed to update IT priority.";
    throw new Error(errorMsg);
  }

  return data as { id: number; itPriority: string; updatedAt: string };
}

/**
 * Transition ticket status and optionally save resolution summary (Issue #3-7, API-17, API-18, UI-04)
 */
export async function updateTicketStatus(
  ticketId: number,
  status: string,
  resolutionSummary?: string
): Promise<{
  id: number;
  currentStatus: string;
  resolutionSummary: string | null;
  permittedNextStatuses: string[];
  updatedAt: string;
}> {
  const res = await fetch(`${API_URL}/api/staff/tickets/${ticketId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ status, resolutionSummary }),
  });

  let data: Record<string, any> = {};
  try {
    data = await res.json();
  } catch {}

  if (!res.ok) {
    const errorMsg = data.error?.message || data.message || "Failed to update ticket status.";
    throw new Error(errorMsg);
  }

  return data as {
    id: number;
    currentStatus: string;
    resolutionSummary: string | null;
    permittedNextStatuses: string[];
    updatedAt: string;
  };
}

/**
 * Fetch active IT Staff and Administrator assignees (Issue #3-7, UI-04)
 */
export async function fetchStaffAssignees(): Promise<StaffAssignee[]> {
  const res = await fetch(`${API_URL}/api/staff/assignees`, {
    headers: getAuthHeaders(),
  });

  let data: any;
  try {
    data = await res.json();
  } catch {}

  if (!res.ok) {
    const errorMsg = data?.error?.message || data?.message || "Failed to load staff assignees.";
    throw new Error(errorMsg);
  }

  return data as StaffAssignee[];
}

// ---------------------------------------------------------------------------
// Lab 3 — Administrator User Management API (Issue #3-8, API-20..25, UI-06)
// ---------------------------------------------------------------------------

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";
  isActive?: boolean;
  initialPassword?: string;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  role?: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";
  isActive?: boolean;
}

export interface FetchAdminUsersParams {
  search?: string;
  role?: string;
}

/**
 * Fetch all users for administrator management (Issue #3-8, API-25, UI-06)
 */
export async function fetchAdminUsers(params: FetchAdminUsersParams = {}): Promise<AdminUser[]> {
  const query = new URLSearchParams();
  if (params.search && params.search.trim()) query.set("search", params.search.trim());
  if (params.role && params.role !== "ALL") query.set("role", params.role);

  const url = `${API_URL}/api/admin/users?${query.toString()}`;
  const res = await fetch(url, {
    headers: getAuthHeaders(),
  });

  let data: any;
  try {
    data = await res.json();
  } catch {}

  if (!res.ok) {
    const errorMsg = data?.error?.message || data?.message || "Failed to load users.";
    const err = new Error(errorMsg);
    (err as any).code = data?.error?.code;
    (err as any).status = res.status;
    throw err;
  }

  const countHeader = res.headers?.get ? res.headers.get("x-active-admin-count") : null;
  if (countHeader !== null && Array.isArray(data)) {
    (data as any).activeAdminCount = parseInt(countHeader, 10);
  }

  return data as AdminUser[];
}

/**
 * Fetch the authoritative global active administrator count (independent of table filters)
 */
export async function fetchActiveAdminCount(): Promise<number> {
  try {
    const res = await fetch(`${API_URL}/api/admin/users/summary`, {
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      const data = await res.json();
      if (typeof data.activeAdminCount === "number") {
        return data.activeAdminCount;
      }
    }
  } catch {}

  // Fallback: fetch administrators without keyword search
  const admins = await fetchAdminUsers({ role: "ADMINISTRATOR" });
  return admins.filter((u) => u.isActive).length;
}

/**
 * Administrator creates a new user (Issue #3-8, API-20, API-21, UI-06)
 */
export async function createAdminUser(payload: CreateUserPayload): Promise<AdminUser> {
  const res = await fetch(`${API_URL}/api/admin/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });

  let data: any;
  try {
    data = await res.json();
  } catch {}

  if (!res.ok) {
    const errorMsg = data?.error?.message || data?.message || "Failed to create user.";
    const err = new Error(errorMsg);
    (err as any).code = data?.error?.code;
    (err as any).details = data?.error?.details;
    (err as any).status = res.status;
    throw err;
  }

  return data as AdminUser;
}

/**
 * Administrator updates a user (Issue #3-8, API-22, API-23, UI-06)
 */
export async function updateAdminUser(id: number, payload: UpdateUserPayload): Promise<AdminUser> {
  const res = await fetch(`${API_URL}/api/admin/users/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });

  let data: any;
  try {
    data = await res.json();
  } catch {}

  if (!res.ok) {
    const errorMsg = data?.error?.message || data?.message || "Failed to update user.";
    const err = new Error(errorMsg);
    (err as any).code = data?.error?.code;
    (err as any).status = res.status;
    throw err;
  }

  return data as AdminUser;
}

/**
 * Administrator sets a new initial password for a user (Issue #3-8, API-24, UI-06)
 */
export async function resetAdminUserPassword(
  id: number,
  newInitialPassword: string
): Promise<{ message: string; userId: number; mustChangePassword: boolean }> {
  const res = await fetch(`${API_URL}/api/admin/users/${id}/reset-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ newInitialPassword }),
  });

  let data: any;
  try {
    data = await res.json();
  } catch {}

  if (!res.ok) {
    const errorMsg = data?.error?.message || data?.message || "Failed to reset initial password.";
    const err = new Error(errorMsg);
    (err as any).code = data?.error?.code;
    (err as any).details = data?.error?.details;
    (err as any).status = res.status;
    throw err;
  }

  return data;
}


