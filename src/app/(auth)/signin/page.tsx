// src/app/(auth)/signin/page.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  linkWithCredential,
  EmailAuthProvider,
  signInWithCredential,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  fetchSignInMethodsForEmail,
  Auth,
} from "firebase/auth";
import { auth } from "@/lib/firebase/client";

const PENDING_OAUTH_KEY = "kv_pending_oauth";
const EMAIL_FOR_SIGNIN = "kv_emailForSignIn";

type Status = "idle" | "sending" | "signed";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [errMsg, setErrMsg] = useState("");
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();

  // Mark as client-side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Prefill stored email
  useEffect(() => {
    if (!isClient) return;
    const stored = window.localStorage.getItem(EMAIL_FOR_SIGNIN);
    if (stored) setEmail(stored);
  }, [isClient]);

  // Reflect auth state
  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, (u) => {
      if (u) setStatus("signed");
    });
  }, []);

  // Handle OAuth redirect result
  useEffect(() => {
    if (!auth) return;
    (async () => {
      try {
        const res = await getRedirectResult(auth);
        if (res?.user) {
          setStatus("signed");
          router.push("/families");
        }
      } catch (e) {
        console.error(e);
        setErrMsg("Google sign-in via redirect failed.");
      }
    })();
  }, [router]);

  // Handle magic link sign-in
  useEffect(() => {
    if (!auth || !isClient) return;

    (async () => {
      if (!isSignInWithEmailLink(auth, window.location.href)) return;

      setErrMsg("");
      const stored = window.localStorage.getItem(EMAIL_FOR_SIGNIN) || "";
      const confirmedEmail =
        stored || window.prompt("Confirm your email to finish sign-in") || "";
      if (!confirmedEmail) return;

      const emailCred = EmailAuthProvider.credentialWithLink(
        confirmedEmail,
        window.location.href
      );

      try {
        if (auth.currentUser) {
          await linkWithCredential(auth.currentUser, emailCred);
        } else {
          await signInWithEmailLink(auth, confirmedEmail, window.location.href);
        }
        window.localStorage.removeItem(EMAIL_FOR_SIGNIN);

        // Link pending Google credential if exists
        const pending = window.localStorage.getItem(PENDING_OAUTH_KEY);
        if (pending) {
          const { providerId, idToken, accessToken } = JSON.parse(pending);
          if (providerId === "google.com") {
            const gcred = GoogleAuthProvider.credential(idToken, accessToken);
            try {
              if (auth.currentUser) {
                await linkWithCredential(auth.currentUser, gcred);
              } else {
                await signInWithCredential(auth, gcred);
              }
            } catch (e) {
              console.error("Link pending Google credential failed:", e);
            }
          }
          window.localStorage.removeItem(PENDING_OAUTH_KEY);
        }

        setStatus("signed");
        router.push("/families");
      } catch (err: unknown) {
        console.error(err);
        const error = err as { code?: string };
        if (error?.code === "auth/credential-already-in-use") {
          try {
            await signInWithCredential(auth, emailCred);
            window.localStorage.removeItem(EMAIL_FOR_SIGNIN);
            setStatus("signed");
            router.push("/families");
          } catch (e2) {
            console.error(e2);
            setErrMsg(
              "This email is already linked to another account, and we could not switch to it."
            );
          }
        } else {
          setErrMsg("Sign-in/link failed. Try resending the link.");
        }
      }
    })();
  }, [router, isClient]);

  async function send() {
    if (!auth) return;
    try {
      setErrMsg("");
      setStatus("sending");
      await sendSignInLinkToEmail(auth, email, {
        url: window.location.origin + "/signin",
        handleCodeInApp: true,
      });
      window.localStorage.setItem(EMAIL_FOR_SIGNIN, email);
      setSent(true);
      setStatus("idle");
    } catch (e) {
      console.error(e);
      setStatus("idle");
      setErrMsg("Could not send link. Check the email and try again.");
    }
  }

  async function handleGoogle() {
    if (!auth) return;
    setErrMsg("");
    try {
      if (auth.currentUser) {
        await signInOrLinkWithGoogle(auth, "link");
      } else {
        await signInOrLinkWithGoogle(auth, "signIn");
      }
      setStatus("signed");
      router.push("/families");
    } catch (e) {
      console.error(e);
      setErrMsg("Google sign-in failed.");
    }
  }

  async function signInOrLinkWithGoogle(authInstance: Auth, mode: "link" | "signIn") {
    const googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: "select_account" });

    try {
      if (mode === "link") {
        await signInWithRedirect(authInstance, googleProvider);
        throw new Error("redirecting");
      } else {
        await signInWithPopup(authInstance, googleProvider);
      }
    } catch (err: unknown) {
      const error = err as { code?: string; customData?: { email?: string }; message?: string };

      if (error?.message === "redirecting") return;

      if (error?.code === "auth/account-exists-with-different-credential") {
        const errorEmail = error?.customData?.email;
        const pending = GoogleAuthProvider.credentialFromError(err as Parameters<typeof GoogleAuthProvider.credentialFromError>[0]);
        if (pending) {
          window.localStorage.setItem(
            PENDING_OAUTH_KEY,
            JSON.stringify({
              providerId: "google.com",
              idToken: (pending as { idToken?: string }).idToken || null,
              accessToken: (pending as { accessToken?: string }).accessToken || null,
            })
          );
        }
        if (errorEmail) {
          const methods = await fetchSignInMethodsForEmail(authInstance, errorEmail);
          if (methods.includes("emailLink")) {
            setErrMsg(
              "This email is already in use. Sign in with the email link, and we'll link Google automatically."
            );
          } else {
            setErrMsg(
              `This email is already in use with: ${methods.join(", ") || "another method"}. Sign in with that, then try linking Google.`
            );
          }
        } else {
          setErrMsg(
            "Account exists with a different sign-in method. Use that method first, then link Google."
          );
        }
        return;
      }

      if (
        error?.code === "auth/popup-blocked" ||
        error?.code === "auth/popup-closed-by-user"
      ) {
        await signInWithRedirect(authInstance, googleProvider);
        return;
      }

      throw err;
    }
  }

  // Show loading during SSR
  if (!isClient) {
    return (
      <div className="signin-page">
        <div className="signin-card">
          <div className="signin-loading">
            <div className="spinner"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="signin-page">
      {/* Decorative background */}
      <div className="signin-bg">
        <div className="signin-bg-blob signin-bg-blob-1"></div>
        <div className="signin-bg-blob signin-bg-blob-2"></div>
      </div>

      <div className="signin-card">
        {/* Logo */}
        <Link href="/" className="signin-brand">
          <div className="signin-brand-mark">KV</div>
          <span className="signin-brand-text">Kinship Vault</span>
        </Link>

        <div className="signin-header">
          <h1>Welcome back</h1>
          <p>Sign in with a magic link or Google to continue</p>
        </div>

        {status !== "signed" ? (
          <div className="signin-form">
            <div className="signin-input-group">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                className="signin-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                inputMode="email"
                autoComplete="email"
              />
            </div>

            <button
              onClick={send}
              disabled={!email || status === "sending"}
              className="signin-btn signin-btn-primary"
            >
              {status === "sending" ? (
                <>
                  <span className="spinner spinner-sm"></span>
                  Sending...
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                  Send magic link
                </>
              )}
            </button>

            <div className="signin-divider">
              <span>or</span>
            </div>

            <button
              onClick={handleGoogle}
              className="signin-btn signin-btn-google"
            >
              <Image
                alt="Google"
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                width={18}
                height={18}
              />
              Continue with Google
            </button>

            {sent && (
              <div className="signin-message signin-message-success">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <span>Check your email and click the link to sign in</span>
              </div>
            )}
          </div>
        ) : (
          <div className="signin-form">
            <div className="signin-success">
              <div className="signin-success-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
              <h2>You&apos;re signed in!</h2>
            </div>
            <button
              onClick={() => router.push("/families")}
              className="signin-btn signin-btn-primary"
            >
              Continue to Family Gate
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
            </button>
          </div>
        )}

        {errMsg && (
          <div className="signin-message signin-message-error">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>{errMsg}</span>
          </div>
        )}
      </div>

      <div className="signin-footer">
        Your family &bull; Your stories &bull; Your legacy
      </div>

      <style jsx>{`
        .signin-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem 1rem;
          background: linear-gradient(180deg, #FDF8F0 0%, #FAF5ED 100%);
          position: relative;
          overflow: hidden;
        }

        .signin-bg {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
        }

        .signin-bg-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(60px);
          opacity: 0.5;
        }

        .signin-bg-blob-1 {
          top: -20%;
          right: -10%;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(225, 29, 72, 0.15) 0%, transparent 70%);
          animation: float 8s ease-in-out infinite;
        }

        .signin-bg-blob-2 {
          bottom: -20%;
          left: -10%;
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(251, 146, 60, 0.1) 0%, transparent 70%);
          animation: float 6s ease-in-out infinite reverse;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }

        .signin-card {
          position: relative;
          width: 100%;
          max-width: 420px;
          background: #fff;
          border-radius: 1.5rem;
          padding: 2.5rem;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.08), 0 8px 20px rgba(0, 0, 0, 0.04);
          animation: scaleIn 0.4s ease forwards;
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .signin-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 3rem;
        }

        .spinner {
          width: 24px;
          height: 24px;
          border: 2.5px solid #e5e7eb;
          border-top-color: #e11d48;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .spinner-sm {
          width: 18px;
          height: 18px;
          border-width: 2px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .signin-brand {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          text-decoration: none;
          margin-bottom: 2rem;
        }

        .signin-brand-mark {
          width: 3rem;
          height: 3rem;
          background: linear-gradient(135deg, #e11d48 0%, #f43f5e 50%, #fb7185 100%);
          color: #fff;
          border-radius: 0.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 1.125rem;
          box-shadow: 0 4px 12px rgba(225, 29, 72, 0.3);
          transition: transform 0.2s ease;
        }

        .signin-brand:hover .signin-brand-mark {
          transform: scale(1.05) rotate(-3deg);
        }

        .signin-brand-text {
          font-weight: 800;
          font-size: 1.5rem;
          color: #1f2937;
          letter-spacing: -0.02em;
        }

        .signin-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .signin-header h1 {
          margin: 0 0 0.5rem;
          font-size: 1.75rem;
          font-weight: 700;
          color: #1f2937;
        }

        .signin-header p {
          margin: 0;
          font-size: 0.9375rem;
          color: #6b7280;
        }

        .signin-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .signin-input-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .signin-input-group label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
        }

        .signin-input {
          width: 100%;
          padding: 0.875rem 1rem;
          border: 1.5px solid #e5e7eb;
          border-radius: 0.875rem;
          font-size: 1rem;
          background: #fff;
          transition: all 0.15s ease;
        }

        .signin-input:hover {
          border-color: #d1d5db;
        }

        .signin-input:focus {
          outline: none;
          border-color: #e11d48;
          box-shadow: 0 0 0 3px rgba(225, 29, 72, 0.1);
        }

        .signin-input::placeholder {
          color: #9ca3af;
        }

        .signin-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.625rem;
          width: 100%;
          padding: 0.875rem 1.25rem;
          border-radius: 0.875rem;
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
        }

        .signin-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .signin-btn-primary {
          background: linear-gradient(135deg, #e11d48 0%, #be123c 100%);
          color: #fff;
          box-shadow: 0 4px 12px rgba(225, 29, 72, 0.25);
        }

        .signin-btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(225, 29, 72, 0.35);
        }

        .signin-btn-primary:active:not(:disabled) {
          transform: translateY(0);
        }

        .signin-btn-google {
          background: #fff;
          color: #374151;
          border: 1.5px solid #e5e7eb;
        }

        .signin-btn-google:hover:not(:disabled) {
          background: #f9fafb;
          border-color: #d1d5db;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
        }

        .signin-divider {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin: 0.5rem 0;
        }

        .signin-divider::before,
        .signin-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #e5e7eb;
        }

        .signin-divider span {
          font-size: 0.8125rem;
          color: #9ca3af;
          font-weight: 500;
        }

        .signin-message {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 1rem;
          border-radius: 0.875rem;
          font-size: 0.875rem;
          line-height: 1.5;
          margin-top: 0.5rem;
        }

        .signin-message svg {
          flex-shrink: 0;
          margin-top: 1px;
        }

        .signin-message-success {
          background: #ecfdf5;
          color: #065f46;
          border: 1px solid #a7f3d0;
        }

        .signin-message-error {
          background: #fef3c7;
          color: #92400e;
          border: 1px solid #fcd34d;
        }

        .signin-success {
          text-align: center;
          padding: 1rem 0;
        }

        .signin-success-icon {
          width: 64px;
          height: 64px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: #fff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1rem;
          box-shadow: 0 8px 20px rgba(16, 185, 129, 0.3);
        }

        .signin-success h2 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: #1f2937;
        }

        .signin-footer {
          margin-top: 2rem;
          font-size: 0.875rem;
          color: #9ca3af;
          text-align: center;
        }

        @media (max-width: 640px) {
          .signin-page {
            padding: 1.5rem 1rem;
          }

          .signin-bg-blob-1 {
            width: 300px;
            height: 300px;
            top: -15%;
            right: -15%;
          }

          .signin-bg-blob-2 {
            width: 250px;
            height: 250px;
            bottom: -15%;
            left: -15%;
          }

          .signin-card {
            padding: 2rem 1.5rem;
            border-radius: 1.25rem;
            box-shadow: 0 12px 30px rgba(0, 0, 0, 0.06), 0 4px 12px rgba(0, 0, 0, 0.03);
          }

          .signin-brand {
            margin-bottom: 1.5rem;
          }

          .signin-brand-mark {
            width: 2.5rem;
            height: 2.5rem;
            font-size: 1rem;
            border-radius: 0.625rem;
          }

          .signin-brand-text {
            font-size: 1.25rem;
          }

          .signin-header {
            margin-bottom: 1.5rem;
          }

          .signin-header h1 {
            font-size: 1.5rem;
          }

          .signin-header p {
            font-size: 0.875rem;
          }

          .signin-input {
            padding: 0.75rem 0.875rem;
            font-size: 0.9375rem;
            border-radius: 0.75rem;
          }

          .signin-btn {
            padding: 0.75rem 1rem;
            font-size: 0.875rem;
            border-radius: 0.75rem;
          }

          .signin-message {
            padding: 0.875rem;
            font-size: 0.8125rem;
            border-radius: 0.75rem;
          }

          .signin-success-icon {
            width: 56px;
            height: 56px;
          }

          .signin-success-icon svg {
            width: 28px;
            height: 28px;
          }

          .signin-success h2 {
            font-size: 1.125rem;
          }

          .signin-footer {
            margin-top: 1.5rem;
            font-size: 0.8125rem;
          }
        }

        @media (max-width: 360px) {
          .signin-page {
            padding: 1rem 0.75rem;
          }

          .signin-card {
            padding: 1.5rem 1.25rem;
            border-radius: 1rem;
          }

          .signin-brand {
            gap: 0.5rem;
            margin-bottom: 1.25rem;
          }

          .signin-brand-mark {
            width: 2.25rem;
            height: 2.25rem;
            font-size: 0.875rem;
          }

          .signin-brand-text {
            font-size: 1.125rem;
          }

          .signin-header h1 {
            font-size: 1.375rem;
          }

          .signin-form {
            gap: 0.875rem;
          }

          .signin-input-group label {
            font-size: 0.8125rem;
          }

          .signin-input {
            padding: 0.625rem 0.75rem;
            font-size: 0.875rem;
          }

          .signin-btn {
            padding: 0.625rem 0.875rem;
            font-size: 0.8125rem;
            gap: 0.5rem;
          }

          .signin-btn svg {
            width: 16px;
            height: 16px;
          }

          .signin-divider {
            margin: 0.25rem 0;
          }

          .signin-divider span {
            font-size: 0.75rem;
          }
        }

        /* Touch device optimizations */
        @media (hover: none) and (pointer: coarse) {
          .signin-btn-primary:hover:not(:disabled) {
            transform: none;
          }

          .signin-btn-primary:active:not(:disabled) {
            transform: scale(0.98);
          }

          .signin-btn-google:hover:not(:disabled) {
            transform: none;
            box-shadow: none;
          }

          .signin-btn-google:active:not(:disabled) {
            background: #f3f4f6;
            transform: scale(0.98);
          }

          .signin-brand:hover .signin-brand-mark {
            transform: none;
          }
        }
      `}</style>
    </div>
  );
}
