// src/components/NavBar.tsx
"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import { FamilySwitcher } from "./FamilySwitcher";
import { activeFamily } from "@/lib/activeFamily";
import { cfURL } from "@/lib/utils";
import styles from "./NavBar.module.css";

export function NavBar() {
  const { currentUser, userProfile, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const [activeFallback, setActiveFallback] = useState<string | null>(null);

  useEffect(() => {
    setActiveFallback(activeFamily.get());
    const onChange = () => setActiveFallback(activeFamily.get());
    window.addEventListener("active-family-changed", onChange);
    return () => window.removeEventListener("active-family-changed", onChange);
  }, []);

  useEffect(() => {
    if (userProfile?.activeFamilyId) {
      activeFamily.set(userProfile.activeFamilyId);
      setActiveFallback(userProfile.activeFamilyId);
    }
  }, [userProfile?.activeFamilyId]);

  const familyId = userProfile?.activeFamilyId ?? activeFallback ?? userProfile?.defaultFamilyId ?? null;
  const storyHref = familyId ? `/families/${familyId}/story` : "/families";

  const avatarSrc = useMemo(() => {
    const cfId = userProfile?.photo?.ref || userProfile?.avatarRef;
    return cfURL(cfId);
  }, [userProfile]);

  const close = () => setOpen(false);

  const goNewPage = () => {
    if (!currentUser) { toast.error("Please sign in first."); return; }
    if (!familyId) { toast("Pick a family first (top-left)."); return; }
    router.push(`/families/${familyId}/pages/new`);
    close();
  };

  const newPageDisabled = !currentUser || !familyId;
  const isActive = (path: string) => pathname === path;

  return (
    <header className={styles.wrap}>
      <nav className={styles.nav} aria-label="Primary">
        <div className={styles.left}>
          <button className={styles.burger} aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}>
            <span className={styles.burgerBar} />
            <span className={styles.burgerBar} />
            <span className={styles.burgerBar} />
          </button>
          <Link href="/" className={styles.brand} onClick={close}>
            <span className={styles.logoDot} aria-hidden /> Kinship&nbsp;Vault
          </Link>
          <div className={styles.hideOnMobile} style={{ marginLeft: 10 }}><FamilySwitcher /></div>
        </div>

        <ul id="nav-menu" className={`${styles.menu} ${open ? styles.menuOpen : ""}`}>
          <li className={styles.showOnMobile}><FamilySwitcher /></li>
          <li><Link href="/" onClick={close} className={isActive("/") ? styles.active : undefined}>Home</Link></li>
          <li><Link href="/families" onClick={close} className={isActive("/families") ? styles.active : undefined}>Families</Link></li>
          <li><Link href={storyHref} onClick={close} className={pathname.includes("/story") ? styles.active : undefined}>Family Story</Link></li>
          <li><Link href="/profile" onClick={close} className={isActive("/profile") ? styles.active : undefined}>Profile</Link></li>
          <li className={styles.showOnMobile}>
            <button className={styles.primaryBtn} onClick={goNewPage} disabled={newPageDisabled}>+ New Page</button>
          </li>
        </ul>

        <div className={styles.right}>
          <button className={`${styles.primaryBtn} ${styles.hideOnMobile}`} onClick={goNewPage} disabled={newPageDisabled}>+ New Page</button>
          {currentUser ? (
            <div className={styles.userBox}>
              <Link href="/profile" className={styles.userLink} onClick={close}>
                {avatarSrc ? <Image src={avatarSrc} alt="Avatar" width={32} height={32} className={styles.avatar} unoptimized /> : (
                  <div className={styles.avatarFallback}>{(userProfile?.displayName || currentUser.email || "U").slice(0, 1).toUpperCase()}</div>
                )}
                <span className={styles.userName}>{userProfile?.displayName || currentUser.email}</span>
              </Link>
              <button className={styles.signOut} onClick={() => { close(); signOut(); }}>Sign out</button>
            </div>
          ) : (
            <Link href="/signin" className={styles.signIn} onClick={close}>Sign in</Link>
          )}
        </div>
      </nav>
    </header>
  );
}
