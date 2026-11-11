"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError("Missing or invalid reset token");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to reset password");
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/auth/signin");
      }, 3000);
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-12 bg-linear-to-b from-slate-900 via-indigo-950 to-slate-950 text-white">
        <Card className="w-full max-w-md bg-slate-900/90 border-slate-800 text-white p-6 text-center space-y-4">
          <h2 className="text-xl font-bold text-red-400">Invalid Reset Link</h2>
          <p className="text-sm text-gray-400">This password reset link is missing a valid token.</p>
          <Link href="/auth/forgot-password">
            <Button className="bg-indigo-600 hover:bg-indigo-500 text-white w-full">Request New Link</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12 bg-linear-to-b from-slate-900 via-indigo-950 to-slate-950 text-white">
      <Card className="w-full max-w-md bg-slate-900/90 border-slate-800 text-white shadow-2xl backdrop-blur-xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-2">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <span className="text-white font-black text-2xl">A</span>
            </div>
          </div>
          <CardTitle className="text-2xl font-black tracking-tight text-white">Set New Password</CardTitle>
          <CardDescription className="text-gray-400 text-xs">
            Please enter your new secure password below
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-xl bg-red-950/60 border border-red-800/80 p-3 text-xs text-red-300 font-medium">
              {error}
            </div>
          )}

          {success ? (
            <div className="rounded-xl bg-emerald-950/60 border border-emerald-800/80 p-4 text-center space-y-2">
              <p className="text-emerald-300 text-sm font-semibold">Password reset successful! 🎉</p>
              <p className="text-gray-300 text-xs">Redirecting you to sign in...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs text-gray-300">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="bg-slate-950/60 border-slate-800 text-white placeholder:text-gray-500 focus:border-indigo-500 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-xs text-gray-300">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="bg-slate-950/60 border-slate-800 text-white placeholder:text-gray-500 focus:border-indigo-500 rounded-xl"
                />
              </div>

              <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl mouse-btn" disabled={isLoading}>
                {isLoading ? "Updating password..." : "Reset Password"}
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <p className="text-xs text-gray-400 text-center">
            Remembered your password?{" "}
            <Link href="/auth/signin" className="text-indigo-400 hover:underline font-semibold">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
