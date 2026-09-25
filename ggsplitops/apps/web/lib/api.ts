const BASE = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Thin fetch wrapper. `credentials: "include"` is what carries the Better Auth
 * session cookie to the API on a different origin — without it every request
 * is anonymous and the cause is invisible in the network tab.
 */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new ApiError(res.status, body?.error ?? `Request failed with ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// --- Response shapes the UI relies on. ------------------------------------
// Amounts are always decimal strings paired with a currency code; see
// apps/api/src/lib/json.ts for why they are never numbers.

export interface Group {
  id: string;
  name: string;
  type: string;
  defaultCurrency: string;
  simplifyDebts: boolean;
  memberId: string;
  role: string;
}

export interface Member {
  id: string;
  userId: string | null;
  displayName: string;
  role: string;
  placeholder: boolean;
}

export interface Expense {
  id: string;
  description: string;
  amount: string;
  currency: string;
  splitMethod: string;
  spentAt: string;
}

export interface MemberBalance {
  memberId: string;
  displayName: string;
  amount: string;
  currency: string;
}

export interface Transfer {
  fromMemberId: string;
  fromName: string;
  toMemberId: string;
  toName: string;
  amount: string;
  currency: string;
}

export const getGroups = () => api<{ groups: Group[] }>("/groups");

export const getGroup = (id: string) =>
  api<{ group: Group; members: Member[] }>(`/groups/${id}`);

export const getExpenses = (id: string) =>
  api<{ expenses: Expense[]; nextCursor: string | null }>(`/groups/${id}/expenses`);

export const getBalances = (id: string) =>
  api<{
    simplifyDebts: boolean;
    members: { memberId: string; displayName: string; placeholder: boolean }[];
    balances: MemberBalance[];
    transfers: Transfer[];
  }>(`/groups/${id}/balances`);

export const createExpense = (groupId: string, body: unknown) =>
  api(`/groups/${groupId}/expenses`, { method: "POST", body: JSON.stringify(body) });

export const recordSettlement = (groupId: string, body: unknown) =>
  api(`/groups/${groupId}/settlements`, { method: "POST", body: JSON.stringify(body) });

export const deleteGroup = (groupId: string) =>
  api<void>(`/groups/${groupId}`, { method: "DELETE" });
