// src/lib/activeFamily.ts

/**
 * Active family state management
 * Uses Firestore userProfile as source of truth, with in-memory fallback for the session
 */

let sessionFamilyId: string | null = null;

export const activeFamily = {
  get(): string | null {
    return sessionFamilyId;
  },
  
  set(id: string | null): void {
    sessionFamilyId = id;
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("active-family-changed", { detail: id || null }));
    }
  },
  
  clear(): void {
    sessionFamilyId = null;
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("active-family-changed", { detail: null }));
    }
  },
};
