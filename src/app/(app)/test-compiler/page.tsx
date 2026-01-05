// src/app/(app)/test-compiler/page.tsx
"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs, doc, getDoc, onSnapshot, Timestamp } from "firebase/firestore";

interface Page {
  id: string;
  title?: string;
  isLocked?: boolean;
}

interface Family {
  id: string;
  name: string;
  pages: Page[];
}

interface CompilationJob {
  id: string;
  status: string;
  pagesRendered: number;
  totalPages: number;
  bookSize: string;
  r2Key?: string;
  downloadUrl?: string;
  errorMessage?: string;
  createdAt?: Timestamp;
}

export default function TestCompilerPage() {
  const [user, setUser] = useState<{ uid: string; email: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [families, setFamilies] = useState<Family[]>([]);
  const [selectedFamily, setSelectedFamily] = useState<string>("");
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [bookSize, setBookSize] = useState<string>("8x8");
  const [compiling, setCompiling] = useState(false);
  const [currentJob, setCurrentJob] = useState<CompilationJob | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const log = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${timestamp}] ${msg}`]);
  };

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser({ uid: firebaseUser.uid, email: firebaseUser.email });
        log(`Authenticated as ${firebaseUser.email}`);

        // Fetch user's families
        if (db) {
          const firestore = db;
          try {
            const membershipsRef = collection(firestore, "memberships");
            const q = query(membershipsRef, where("uid", "==", firebaseUser.uid));
            const snapshot = await getDocs(q);

            const familyPromises = snapshot.docs.map(async (d) => {
              const familyId = d.data().familyId;
              const familyDoc = await getDoc(doc(firestore, `families/${familyId}`));
              const familyData = familyDoc.data();

              // Get locked pages
              const pagesRef = collection(firestore, `families/${familyId}/pages`);
              const pagesQuery = query(pagesRef, where("isLocked", "==", true));
              const pagesSnap = await getDocs(pagesQuery);
              const pages = pagesSnap.docs.map((p) => ({
                id: p.id,
                title: p.data().title,
                isLocked: p.data().isLocked,
              }));

              return {
                id: familyId,
                name: familyData?.name || "Unnamed",
                pages,
              };
            });

            const familiesData = await Promise.all(familyPromises);
            setFamilies(familiesData.filter((f) => f.pages.length > 0));
            log(`Found ${familiesData.filter((f) => f.pages.length > 0).length} families with locked pages`);
          } catch (error) {
            log(`Error fetching families: ${error}`);
          }
        }
      } else {
        setUser(null);
        log("Not authenticated");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Auto-select pages when family changes
  useEffect(() => {
    const family = families.find((f) => f.id === selectedFamily);
    if (family) {
      setSelectedPages(family.pages.map((p) => p.id));
    }
  }, [selectedFamily, families]);

  // Subscribe to job updates
  useEffect(() => {
    if (!currentJob || !selectedFamily || !db) return;
    const firestore = db;

    const unsubscribe = onSnapshot(
      doc(firestore, `families/${selectedFamily}/compilationJobs/${currentJob.id}`),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setCurrentJob({
            id: snapshot.id,
            status: data.status,
            pagesRendered: data.pagesRendered,
            totalPages: data.totalPages,
            bookSize: data.bookSize,
            r2Key: data.r2Key,
            downloadUrl: data.downloadUrl,
            errorMessage: data.errorMessage,
            createdAt: data.createdAt,
          });

          if (data.status === "complete") {
            log(`✓ Compilation complete! Download URL ready.`);
            setCompiling(false);
          } else if (data.status === "failed") {
            log(`✗ Compilation failed: ${data.errorMessage}`);
            setCompiling(false);
          } else {
            log(`Status: ${data.status} | Progress: ${data.pagesRendered}/${data.totalPages}`);
          }
        }
      }
    );

    return () => unsubscribe();
  }, [currentJob?.id, selectedFamily]);

  const startCompilation = async () => {
    if (!user || !selectedFamily || selectedPages.length === 0 || !auth) return;

    setCompiling(true);
    setCurrentJob(null);
    log("Starting compilation...");

    try {
      const idToken = await auth.currentUser?.getIdToken();

      const response = await fetch(
        "https://us-central1-kinshipvault-47ad0.cloudfunctions.net/compileBookInit",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            familyId: selectedFamily,
            bookSize,
            pageIds: selectedPages,
          }),
        }
      );

      const result = await response.json();

      if (response.ok) {
        if (result.status === "cached") {
          log(`Using cached compilation (Job ID: ${result.jobId})`);
          setCurrentJob({
            id: result.jobId,
            status: "complete",
            pagesRendered: result.totalPages,
            totalPages: result.totalPages,
            bookSize,
            downloadUrl: result.downloadUrl,
          });
          setCompiling(false);
        } else {
          log(`Job created: ${result.jobId}`);
          log(`Estimated time: ~${result.estimatedMinutes} minutes`);
          setCurrentJob({
            id: result.jobId,
            status: "pending",
            pagesRendered: 0,
            totalPages: result.totalPages,
            bookSize,
          });
        }
      } else {
        log(`Error: ${result.error || JSON.stringify(result)}`);
        setCompiling(false);
      }
    } catch (error) {
      log(`Request failed: ${error}`);
      setCompiling(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 24 }}>Loading...</div>;
  }

  if (!user) {
    return (
      <div style={{ padding: 24 }}>
        <h1>Book Compiler Test</h1>
        <p>Please sign in to test the book compiler.</p>
        <a href="/signin" className="btn">
          Sign In
        </a>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 8 }}>Book Compiler E2E Test</h1>
      <p style={{ color: "#64748b", marginBottom: 24 }}>
        Signed in as {user.email}
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 24,
          marginBottom: 24,
        }}
      >
        {/* Configuration Panel */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 16,
          }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
            Configuration
          </h2>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>
              Family
            </label>
            <select
              value={selectedFamily}
              onChange={(e) => setSelectedFamily(e.target.value)}
              style={{
                width: "100%",
                padding: 8,
                borderRadius: 8,
                border: "1px solid #e5e7eb",
              }}
            >
              <option value="">Select a family...</option>
              {families.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.pages.length} locked pages)
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>
              Book Size
            </label>
            <select
              value={bookSize}
              onChange={(e) => setBookSize(e.target.value)}
              style={{
                width: "100%",
                padding: 8,
                borderRadius: 8,
                border: "1px solid #e5e7eb",
              }}
            >
              <option value="8x8">8×8 inches</option>
              <option value="10x10">10×10 inches</option>
              <option value="8.5x11">8.5×11 inches</option>
            </select>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>
              Pages to Compile ({selectedPages.length})
            </label>
            <div
              style={{
                maxHeight: 150,
                overflowY: "auto",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                padding: 8,
              }}
            >
              {families
                .find((f) => f.id === selectedFamily)
                ?.pages.map((p) => (
                  <label
                    key={p.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "4px 0",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedPages.includes(p.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPages((prev) => [...prev, p.id]);
                        } else {
                          setSelectedPages((prev) =>
                            prev.filter((id) => id !== p.id)
                          );
                        }
                      }}
                    />
                    {p.title || "(untitled)"}
                  </label>
                )) || <p style={{ color: "#94a3b8" }}>Select a family first</p>}
            </div>
          </div>

          <button
            onClick={startCompilation}
            disabled={compiling || !selectedFamily || selectedPages.length === 0}
            className="btn primary"
            style={{ width: "100%" }}
          >
            {compiling ? "Compiling..." : "Start Compilation Test"}
          </button>
        </div>

        {/* Job Status Panel */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 16,
          }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
            Job Status
          </h2>

          {currentJob ? (
            <div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Job ID</div>
                <code
                  style={{
                    background: "#f1f5f9",
                    padding: "4px 8px",
                    borderRadius: 4,
                    fontSize: 12,
                  }}
                >
                  {currentJob.id}
                </code>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Status</div>
                <span
                  style={{
                    display: "inline-block",
                    padding: "4px 12px",
                    borderRadius: 100,
                    fontSize: 12,
                    fontWeight: 600,
                    background:
                      currentJob.status === "complete"
                        ? "#dcfce7"
                        : currentJob.status === "failed"
                        ? "#fee2e2"
                        : "#fef3c7",
                    color:
                      currentJob.status === "complete"
                        ? "#166534"
                        : currentJob.status === "failed"
                        ? "#991b1b"
                        : "#92400e",
                  }}
                >
                  {currentJob.status.toUpperCase()}
                </span>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Progress</div>
                <div
                  style={{
                    background: "#e5e7eb",
                    borderRadius: 100,
                    height: 8,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      background: "#22c55e",
                      height: "100%",
                      width: `${
                        (currentJob.pagesRendered / currentJob.totalPages) * 100
                      }%`,
                      transition: "width 0.3s",
                    }}
                  />
                </div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                  {currentJob.pagesRendered} / {currentJob.totalPages} pages
                </div>
              </div>

              {currentJob.downloadUrl && (
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>
                    Download
                  </div>
                  <a
                    href={currentJob.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn primary"
                    style={{ display: "inline-block" }}
                  >
                    Download PDF
                  </a>
                </div>
              )}

              {currentJob.errorMessage && (
                <div
                  style={{
                    background: "#fee2e2",
                    padding: 12,
                    borderRadius: 8,
                    color: "#991b1b",
                    fontSize: 13,
                  }}
                >
                  {currentJob.errorMessage}
                </div>
              )}
            </div>
          ) : (
            <p style={{ color: "#94a3b8" }}>
              No active compilation job. Start a test to see status here.
            </p>
          )}
        </div>
      </div>

      {/* Logs Panel */}
      <div
        style={{
          background: "#1e293b",
          borderRadius: 12,
          padding: 16,
          color: "#e2e8f0",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Logs</h2>
          <button
            onClick={() => setLogs([])}
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            Clear
          </button>
        </div>
        <div
          style={{
            fontFamily: "monospace",
            fontSize: 12,
            maxHeight: 200,
            overflowY: "auto",
          }}
        >
          {logs.length === 0 ? (
            <div style={{ color: "#64748b" }}>No logs yet...</div>
          ) : (
            logs.map((log, i) => (
              <div key={i} style={{ marginBottom: 4 }}>
                {log}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
