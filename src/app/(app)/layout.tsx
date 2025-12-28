// src/app/(app)/layout.tsx
import { ReactNode } from "react";
import { NavBar } from "@/components/NavBar";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <NavBar />
      <main style={{ minHeight: "100dvh" }}>{children}</main>
    </>
  );
}
