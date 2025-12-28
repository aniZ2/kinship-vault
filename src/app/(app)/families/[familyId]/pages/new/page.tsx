// src/app/(app)/families/[familyId]/pages/new/page.tsx
"use client";

import { useEffect, useState } from "react";
import { ScrapbookEditor } from "@/components/ScrapbookEditor";

export default function NewPageRoute() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <div>Loading editor...</div>
      </div>
    );
  }

  return <ScrapbookEditor mode="edit" initialState={null} />;
}
