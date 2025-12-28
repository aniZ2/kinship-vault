// src/lib/firebase/functions.ts
import { auth } from "./client";

const FUNCTIONS_BASE = "https://us-central1-kinshipvault-47ad0.cloudfunctions.net";

async function callFunction<T>(name: string, data?: Record<string, unknown>): Promise<T> {
  const token = auth?.currentUser ? await auth.currentUser.getIdToken() : null;
  
  const res = await fetch(`${FUNCTIONS_BASE}/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ data }),
  });
  
  const json = await res.json();
  
  if (json.error) {
    const error = new Error(json.error.message || "Function error");
    (error as Error & { code: string }).code = json.error.code;
    throw error;
  }
  
  return json.result as T;
}

// Export typed function callers
export const functions = {
  getMembershipUsage: () => 
    callFunction<{ current: number; limit: number }>("getMembershipUsage"),
  
  createFamily: (data: { name: string }) => 
    callFunction<{ id: string; name: string; createdAt: unknown }>("createFamily", data),
  
  getFamilyMeta: (data: { familyId: string }) => 
    callFunction<{ id: string; name: string; memberCount: number; ownerCount: number; adminCount: number; memberLimit: number }>("getFamilyMeta", data),
  
  joinFamily: (data: { familyId?: string; inviteCode?: string }) => 
    callFunction<{ alreadyMember?: boolean; id: string; name?: string; createdAt?: unknown }>("joinFamily", data),
  
  leaveFamily: (data: { familyId: string }) => 
    callFunction<{ ok: boolean; id: string }>("leaveFamily", data),
  
  deleteFamily: (data: { familyId: string; confirmName?: string }) => 
    callFunction<{ ok: boolean; mode: string }>("deleteFamily", data),
  
  setAdminRoles: (data: { familyId: string; adminUids: string[] }) => 
    callFunction<{ ok: boolean }>("setAdminRoles", data),
  
  transferOwnership: (data: { familyId: string; newOwnerUid: string }) => 
    callFunction<{ ok: boolean; newOwnerUid: string }>("transferOwnership", data),
};
