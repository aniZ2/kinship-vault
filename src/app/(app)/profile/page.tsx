// src/app/(app)/profile/page.tsx
"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { updateProfile, User } from "firebase/auth";
import { auth, db } from "@/lib/firebase/client";
import { uploadToCloudflare } from "@/lib/cfImages";
import { initialsFrom } from "@/lib/utils";
import "@/styles/profile.css";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [birthday, setBirthday] = useState("");
  const [timezone, setTimezone] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    // Get timezone on client only
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
    
    // Guard against SSR - auth is null on server
    if (!auth) return;
    
    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      if (!u) {
        router.push("/signin");
        return;
      }
      setUser(u);
      
      if (!db) return;
      
      try {
        const snap = await getDoc(doc(db, "users", u.uid));
        if (snap.exists()) {
          const d = snap.data();
          setDisplayName(d.displayName || u.displayName || "");
          setBio(d.bio || "");
          setLocation(d.location || "");
          setBirthday(d.birthday || "");
          setTimezone(d.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
          setPhotoURL(d.photoURL || u.photoURL || "");
        } else {
          setDisplayName(u.displayName || "");
          setPhotoURL(u.photoURL || "");
        }
      } catch (e) {
        console.error("Error loading profile:", e);
      } finally {
        setLoading(false);
      }
    });
    
    return () => unsubscribe();
  }, [router]);

  async function onSave(e?: React.FormEvent) {
    e?.preventDefault?.();
    if (!user || !db) return;
    
    try {
      setBusy(true);
      setErr("");
      setMsg("");
      
      const payload = {
        displayName: displayName.trim(),
        bio: bio.trim(),
        location: location.trim(),
        birthday: birthday || null,
        timezone: timezone || null,
        photoURL: photoURL || null,
        updatedAt: serverTimestamp(),
      };
      
      await setDoc(doc(db, "users", user.uid), payload, { merge: true });
      await updateProfile(user, {
        displayName: payload.displayName || null,
        photoURL: payload.photoURL || null,
      });
      
      setMsg("Profile saved ✓");
    } catch {
      setErr("Could not save profile");
    } finally {
      setBusy(false);
    }
  }

  async function onUploadAvatar() {
    if (!user || !avatarFile || !auth) return;
    
    try {
      setBusy(true);
      setErr("");
      setMsg("");
      
      const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : undefined;
      const up = await uploadToCloudflare(undefined, avatarFile, idToken, "public");
      setPhotoURL(up.deliveryURL);
      setAvatarFile(null);
      setMsg("Avatar updated (remember to Save)");
    } catch (e: unknown) {
      setErr(`Avatar upload failed${(e as Error)?.message ? `: ${(e as Error).message}` : ""}`);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="profile-wrap">
        <div className="profile-paper" style={{ textAlign: "center", padding: "4rem" }}>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="profile-wrap">
      <div className="profile-paper">
        <header className="profile-hero">
          <div className="hero-left">
            <h1 className="hero-title">Your Page</h1>
            <p className="hero-sub">Tuck in a bio, pin a place, add a face — make it yours.</p>
          </div>
          <div className="hero-right">
            <button className="btn link" onClick={() => router.push("/families")}>
              ← Back to Family Gate
            </button>
          </div>
        </header>

        {(msg || err) && (
          <div className={`ribbon ${err ? "ribbon-error" : "ribbon-ok"}`}>{err || msg}</div>
        )}

        <section className="card card-avatar">
          <div className="card-title">
            <h2>Avatar</h2>
            <span className="card-hint">A friendly face for your scrapbook notes & pages.</span>
          </div>
          <div className="avatar-grid">
            <div className="polaroid avatar-polaroid">
              <span className="tape tl" />
              <span className="tape tr" />
              <div className="photo">
                {photoURL ? (
                  <Image src={photoURL} alt="Your avatar" width={120} height={120} unoptimized />
                ) : (
                  <div className="avatar-fallback">{initialsFrom(user)}</div>
                )}
              </div>
              <div className="caption">{displayName || user?.email || "You"}</div>
            </div>
            <div className="avatar-actions">
              <label className="btn" htmlFor="avatar-input">Choose Image</label>
              <input
                id="avatar-input"
                className="hidden-file"
                type="file"
                accept="image/*"
                onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
              />
              <button
                className="btn"
                onClick={onUploadAvatar}
                disabled={!avatarFile || busy}
              >
                {busy && avatarFile ? "Uploading…" : "Upload"}
              </button>
              <button
                className="btn ghost"
                onClick={() => {
                  setPhotoURL("");
                  setMsg("Avatar cleared");
                }}
                disabled={busy || !photoURL}
              >
                Remove
              </button>
            </div>
          </div>
        </section>

        <form className="card" onSubmit={onSave} noValidate>
          <div className="card-title">
            <h2>Details</h2>
            <span className="card-hint">A few tidbits that make your notes feel like you.</span>
          </div>
          <div className="field-row">
            <label className="label" htmlFor="displayName">Display name</label>
            <input
              id="displayName"
              className="input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          <div className="field-row">
            <label className="label" htmlFor="bio">Bio</label>
            <textarea
              id="bio"
              className="input textarea"
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </div>
          <div className="grid two">
            <div className="field-row">
              <label className="label" htmlFor="location">Location</label>
              <input
                id="location"
                className="input"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <div className="field-row">
              <label className="label" htmlFor="birthday">Birthday</label>
              <input
                id="birthday"
                className="input"
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
              />
            </div>
          </div>
          <div className="field-row">
            <label className="label" htmlFor="timezone">Time zone</label>
            <input
              id="timezone"
              className="input"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            />
          </div>
          <div className="actions">
            <button className="btn primary" type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save Profile"}
            </button>
          </div>
        </form>

        <footer className="footer-note">
          <span className="pin" />
          Your profile helps sign your pages & replies in the Family Story.
        </footer>
      </div>
    </div>
  );
}
