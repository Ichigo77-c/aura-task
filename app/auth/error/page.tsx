"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ErrorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const errorMessages: Record<string, string> = {
    Configuration:
      "Something is misconfigured on the server. Check your environment variables (NEXTAUTH_SECRET, DATABASE_URL).",
    Credentials:
      "Invalid email or password. Make sure the account exists and you're using the right credentials.",
    CallbackUrl:
      "The sign-in URL is not configured for this provider.",
    OAuthSignin: "The provider could not be reached. Check the provider configuration.",
    OAuthCallback: "The provider failed to authorize you.",
    Signin: "Sign in was not permitted.",
    AccessDenied: "Access to the account was denied.",
    Verify: "Please check your inbox to verify your email.",
  };

  useEffect(() => {
    const t = setTimeout(() => router.replace("/auth/signin"), 8000);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 text-center shadow-aura-lg backdrop-blur-xl">
        <div className="mb-4 text-5xl">😵‍💫</div>
        <h1 className="mb-2 text-xl font-bold text-white">
          Authentication Error
        </h1>
        <p className="mb-4 text-sm text-slate-400">
          {error ? errorMessages[error] ?? `Error: ${error}` : "Unknown error"}
        </p>
        <p className="mb-6 text-xs text-slate-500">
          Redirecting to sign in…
        </p>
        <button
          onClick={() => router.replace("/auth/signin")}
          className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-6 py-2.5 text-sm font-semibold text-white shadow-aura transition-transform hover:scale-105"
        >
          Go to Sign In
        </button>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={null}>
      <ErrorContent />
    </Suspense>
  );
}
