// src/components/FamilySwitcher.tsx
"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase/client";
import { activeFamily } from "@/lib/activeFamily";
import styles from "./FamilySwitcher.module.css";

interface Family {
  id: string;
  name: string;
}

export function FamilySwitcher() {
  const [families, setFamilies] = useState<Family[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const user = auth.currentUser;
      if (!user) { setLoading(false); return; }

      try {
        const memberships = await getDocs(query(collection(db, "memberships"), where("uid", "==", user.uid)));
        const list: Family[] = [];
        for (const m of memberships.docs) {
          const data = m.data();
          const famSnap = await getDoc(doc(db, "families", data.familyId));
          if (famSnap.exists()) {
            list.push({ id: famSnap.id, name: famSnap.data().name || "Unnamed" });
          }
        }
        setFamilies(list);

        const last = activeFamily.get();
        if (last && list.some((f) => f.id === last)) {
          setSelected(last);
        } else if (list.length > 0) {
          setSelected(list[0].id);
          activeFamily.set(list[0].id);
        }
      } catch (e) {
        console.error("Failed to load families:", e);
      } finally {
        setLoading(false);
      }
    };

    const unsub = auth.onAuthStateChanged(() => load());
    return () => unsub();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelected(id);
    activeFamily.set(id);
  };

  if (loading) return <div className={styles.loading}>Loading...</div>;
  if (families.length === 0) return <div className={styles.empty}>No families</div>;

  return (
    <select className={styles.select} value={selected || ""} onChange={handleChange} aria-label="Select family">
      {families.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
    </select>
  );
}
