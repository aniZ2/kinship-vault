// src/app/(marketing)/LandingClient.tsx
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import "@/styles/landing.css";

type AuthState = "loading" | "in" | "out";

export function LandingClient() {
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>("loading");
  const signedIn = authState === "in";

  useEffect(() => {
    // Guard against SSR - auth is null on server
    if (!auth) {
      setAuthState("out");
      return;
    }
    
    const unsub = onAuthStateChanged(auth, (u) => {
      setAuthState(u ? "in" : "out");
    });
    return () => unsub();
  }, []);

  function handleCTA() {
    if (signedIn) {
      router.push("/families");
    } else {
      router.push("/signin");
    }
  }

  return (
    <div className="landing-root">
      <header className="landing-header">
        <div className="wrap header-inner">
          <div className="brand">
            <div className="brand-mark">KV</div>
            <div className="brand-text">Kinship Vault</div>
          </div>

          <nav className="nav">
            {authState !== "loading" && (
              signedIn ? (
                <button className="btn" onClick={handleCTA}>
                  Open your vault
                </button>
              ) : (
                <>
                  <Link href="/signin" className="nav-link">
                    Sign in
                  </Link>
                  <button className="btn" onClick={handleCTA}>
                    Get started
                  </button>
                </>
              )
            )}
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="hero">
          <div className="wrap hero-grid">
            <div className="hero-copy">
              <h1>A private scrapbook for your family&apos;s living story.</h1>
              <p>
                Invite only. No ads. No algorithms. Just memories—photos, voice notes, recipes,
                and letters—kept safe for the people who matter.
              </p>

              {authState !== "loading" && (
                <div className="hero-ctas">
                  {signedIn ? (
                    <button className="btn" onClick={handleCTA}>
                      Open your vault
                    </button>
                  ) : (
                    <>
                      <button className="btn" onClick={handleCTA}>
                        Create your family space
                      </button>
                      <Link href="/demo" className="btn ghost">
                        Try the demo
                      </Link>
                    </>
                  )}
                </div>
              )}

              {!signedIn && authState !== "loading" && (
                <p className="tiny">
                  Already have an invite code?{" "}
                  <Link href="/signin">Sign in</Link> then join on the Family Gate.
                </p>
              )}
            </div>

            <div className="hero-collage">
              <div className="polaroid a">
                <div className="tape"></div>
                <Image
                  src="https://placehold.co/420x260/EEE/222?text=Summer+at+the+Lake"
                  alt="Summer at the Lake"
                  width={420}
                  height={260}
                />
                <div className="cap">Skipping stones with Grandpa</div>
              </div>
              <div className="polaroid b">
                <div className="tape"></div>
                <Image
                  src="https://placehold.co/380x240/FEE/222?text=Recipe+Card"
                  alt="Recipe card"
                  width={380}
                  height={240}
                />
                <div className="cap">Grandma&apos;s apple pie</div>
              </div>
              <div className="note c">
                <div className="pin"></div>
                <p>&quot;Call your cousins on their birthdays.&quot;</p>
                <div className="author">— Aunt Rose</div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="features">
          <div className="wrap features-grid">
            <div className="feature">
              <div className="icon">🔒</div>
              <h3>Invite-only privacy</h3>
              <p>
                Only family members you invite can see or contribute. Your stories stay in the
                circle.
              </p>
            </div>
            <div className="feature">
              <div className="icon">📖</div>
              <h3>Feels like a scrapbook</h3>
              <p>
                Photos, sticky notes, and tape—beautifully imperfect, like real albums passed down.
              </p>
            </div>
            <div className="feature">
              <div className="icon">🎁</div>
              <h3>Yearbook you can hold</h3>
              <p>
                At year&apos;s end, print a hardcover &quot;Family Yearbook&quot; straight from your
                scrapbook.
              </p>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="how">
          <div className="wrap">
            <h2>How it works</h2>
            <ol className="steps">
              <li>
                <span>1</span> Create your family space
              </li>
              <li>
                <span>2</span> Share an invite code
              </li>
              <li>
                <span>3</span> Everyone adds memories
              </li>
            </ol>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="wrap footer-inner">
          <div>© {new Date().getFullYear()} Kinship Vault</div>
          <div className="footer-links">
            <a href="#" onClick={(e) => e.preventDefault()}>
              Privacy
            </a>
            <a href="#" onClick={(e) => e.preventDefault()}>
              Terms
            </a>
            {authState !== "loading" && (
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  handleCTA();
                }}
              >
                {signedIn ? "Open" : "Get started"}
              </a>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
