// src/app/(app)/families/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { User } from "firebase/auth";
import { auth, db } from "@/lib/firebase/client";
import { functions } from "@/lib/firebase/functions";
import "@/styles/familygate.css";

interface Family {
  id: string;
  name: string;
  role: string;
  createdAt?: { toMillis?: () => number };
}

interface Usage {
  current: number;
  limit: number;
}

export default function FamilyGatePage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [usage, setUsage] = useState<Usage>({ current: 0, limit: 2 });
  const [families, setFamilies] = useState<Family[]>([]);
  const [loading, setLoading] = useState(true);

  const [newName, setNewName] = useState("");
  const [joinId, setJoinId] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!auth) return;
    
    const unsub = auth.onAuthStateChanged((u) => {
      if (!u) router.push("/signin");
      setUser(u || null);
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (!user || !db) return;
    
    (async () => {
      try {
        try {
          const res = await functions.getMembershipUsage();
          setUsage(res);
        } catch (e) {
          console.warn("getMembershipUsage failed", e);
          setUsage({ current: 0, limit: 2 });
        }

        const ms = await getDocs(
          query(collection(db, "memberships"), where("uid", "==", user.uid))
        );
        const list: Family[] = [];
        for (const d of ms.docs) {
          const m = d.data();
          const famSnap = await getDoc(doc(db, "families", m.familyId));
          if (famSnap.exists()) {
            list.push({ id: famSnap.id, ...famSnap.data(), role: m.role } as Family);
          }
        }
        list.sort((a, b) => (b?.createdAt?.toMillis?.() ?? 0) - (a?.createdAt?.toMillis?.() ?? 0));
        setFamilies(list);
      } catch (e) {
        console.error(e);
        setMsg("Could not load your families.");
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const limitReached = useMemo(() => usage.current >= usage.limit, [usage]);

  function openFamilyStory(id: string) {
    router.push(`/families/${id}/story`);
  }

  async function onCreate() {
    setMsg("");
    try {
      const data = await functions.createFamily({ name: newName });
      setMsg(`Created "${data.name}".`);
      setNewName("");
      const u = await functions.getMembershipUsage();
      setUsage(u);
      setFamilies((prev) => [{ id: data.id, name: data.name, role: "owner" }, ...prev]);
    } catch (e: unknown) {
      setMsg((e as Error).message || "Create failed");
    }
  }

  async function onJoin() {
    if (!db) return;
    setMsg("");
    try {
      const data = await functions.joinFamily({ familyId: joinId || undefined, inviteCode: inviteCode || undefined });
      if (data.alreadyMember) setMsg("You are already a member.");
      else setMsg("Joined!");
      setJoinId("");
      setInviteCode("");
      const u = await functions.getMembershipUsage();
      setUsage(u);
      const famSnap = await getDoc(doc(db, "families", data.id));
      if (famSnap.exists()) {
        setFamilies((prev) => [{ id: famSnap.id, ...famSnap.data(), role: "member" } as Family, ...prev]);
      }
    } catch (e: unknown) {
      setMsg((e as Error).message || "Join failed");
    }
  }

  async function onLeave(familyId: string) {
    if (!window.confirm("Leave this family?")) return;
    try {
      await functions.leaveFamily({ familyId });
      setFamilies((prev) => prev.filter((f) => f.id !== familyId));
      const u = await functions.getMembershipUsage();
      setUsage(u);
    } catch (e: unknown) {
      alert((e as Error).message || "Leave failed");
    }
  }

  // Show loading state during SSR/hydration
  if (!auth || !db) {
    return (
      <div className="familygate-root">
        <div style={{ padding: "4rem", textAlign: "center" }}>Loading...</div>
      </div>
    );
  }

  return (
    <div className="familygate-root">
      <header className="familygate-header">
        <div>
          <h1>Family Gate</h1>
          <p>{user?.email}</p>
        </div>
        <div className="familygate-header-right">
          <span>{usage.current}/{usage.limit} families</span>
          <button className="btn ghost" onClick={() => router.push("/profile")}>Profile</button>
        </div>
      </header>

      <main className="familygate-main">
        {msg && <div className="familygate-message">{msg}</div>}

        <section className="familygate-section">
          <h2>Create a new family</h2>
          <div className="familygate-form">
            <input className="input" style={{ flex: 1 }} placeholder="Family name" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <button className="btn" disabled={limitReached || !newName.trim()} onClick={onCreate}>Create</button>
          </div>
          {limitReached && <p className="familygate-limit-warning">You&apos;ve reached your limit.</p>}
        </section>

        <section className="familygate-section">
          <h2>Join an existing family</h2>
          <div className="familygate-form-grid">
            <input className="input" placeholder="Family ID (optional)" value={joinId} onChange={(e) => setJoinId(e.target.value)} />
            <input className="input" placeholder="Invite code (optional)" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} />
            <button className="btn" disabled={limitReached || (!joinId && !inviteCode)} onClick={onJoin}>Join</button>
          </div>
        </section>

        <section className="familygate-section">
          <h2>Your families</h2>
          {loading ? (
            <p className="familygate-empty">Loading…</p>
          ) : families.length === 0 ? (
            <p className="familygate-empty">You haven&apos;t joined any families yet.</p>
          ) : (
            <ul className="familygate-list">
              {families.map((f) => (
                <li key={f.id} className="familygate-list-item">
                  <div className="familygate-list-item-info">
                    <div className="familygate-list-item-name">{f.name}</div>
                    <div className="familygate-list-item-meta">ID: {f.id} • Role: {f.role}</div>
                  </div>
                  <div className="familygate-list-item-actions">
                    <button className="btn" onClick={() => openFamilyStory(f.id)}>Open Family Story</button>
                    <button className="btn ghost" onClick={() => onLeave(f.id)}>Leave</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
