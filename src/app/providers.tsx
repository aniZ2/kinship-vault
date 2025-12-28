// src/app/providers.tsx
"use client";

import { ReactNode } from "react";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/context/AuthContext";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <AuthProvider>
      {children}
      <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
    </AuthProvider>
  );
}
