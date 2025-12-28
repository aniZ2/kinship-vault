// src/context/AuthContext.tsx
"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { onAuthStateChanged, signOut as fbSignOut, User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { activeFamily } from "@/lib/activeFamily";

interface UserProfile {
  id: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
  bio?: string;
  location?: string;
  birthday?: string;
  timezone?: string;
  activeFamilyId?: string;
  defaultFamilyId?: string;
  photo?: { ref?: string };
  avatarRef?: string;
  [key: string]: unknown;
}

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  authChecked: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Listen to auth state changes
  useEffect(() => {
    if (!auth) {
      setAuthChecked(true);
      return;
    }
    
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user || null);
      // Clear active family when user signs out
      if (!user) {
        activeFamily.clear();
      }
      setAuthChecked(true);
    });
    return () => unsub();
  }, []);

  // Listen to user profile changes
  useEffect(() => {
    if (!currentUser || !db) {
      setUserProfile(null);
      return;
    }
    
    const ref = doc(db, "users", currentUser.uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const profile = snap.exists() ? { id: snap.id, ...snap.data() } as UserProfile : null;
        setUserProfile(profile);
        
        // Sync active family from profile
        if (profile?.activeFamilyId) {
          activeFamily.set(profile.activeFamilyId);
        } else if (profile?.defaultFamilyId) {
          activeFamily.set(profile.defaultFamilyId);
        }
      },
      () => setUserProfile(null)
    );
    
    return () => unsub();
  }, [currentUser]);

  const signOut = async () => {
    if (!auth) return;
    activeFamily.clear();
    await fbSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ currentUser, userProfile, authChecked, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
