// src/app/(auth)/signin/page.tsx
"use client";

import Image from "next/image";
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
      <div className="min-h-screen grid place-items-center font-sans bg-[#FDF8F0]">
        <div className="w-full max-w-[420px] border border-gray-200 rounded-2xl p-5 bg-white shadow-sm text-center">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid place-items-center font-sans bg-[#FDF8F0]">
      <div className="w-full max-w-[420px] border border-gray-200 rounded-2xl p-5 bg-white shadow-sm">
        <h1 className="m-0 text-xl font-bold text-gray-900">Kinship Vault</h1>
        <p className="mt-1.5 text-gray-500 text-sm">
          Sign in with a one-time magic link or Google
        </p>

        {status !== "signed" ? (
          <>
            <input
              className="w-full p-3 border border-gray-300 rounded-xl mt-4 text-sm"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              inputMode="email"
              autoComplete="email"
            />
            <button
              onClick={send}
              disabled={!email || status === "sending"}
              className="w-full p-3 border-0 rounded-xl bg-rose-600 text-white font-semibold mt-3 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-rose-700 transition-colors"
            >
              {status === "sending" ? "Sending…" : "Send magic link"}
            </button>

            <div className="text-center text-gray-400 text-xs my-3">or</div>

            <button
              onClick={handleGoogle}
              className="w-full p-3 rounded-xl border border-gray-300 bg-white font-semibold cursor-pointer flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
            >
              <Image
                alt=""
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                width={18}
                height={18}
              />
              Continue with Google
            </button>

            {sent && (
              <div className="mt-4 bg-rose-50 p-3 rounded-xl text-xs text-rose-900">
                Check your email and open the link on this device.
              </div>
            )}
          </>
        ) : (
          <button
            onClick={() => router.push("/families")}
            className="w-full p-3 border-0 rounded-xl bg-rose-600 text-white font-semibold mt-4 cursor-pointer hover:bg-rose-700 transition-colors"
          >
            Continue to Family Gate
          </button>
        )}

        {errMsg && (
          <div className="mt-4 bg-amber-50 p-3 rounded-xl text-xs text-amber-800">
            {errMsg}
          </div>
        )}
      </div>

      <div className="mt-4 text-xs text-gray-400">
        Your family • Your stories • Your ritual
      </div>
    </div>
  );
}
