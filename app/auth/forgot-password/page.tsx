"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to send reset email");
        return;
      }

      setIsSubmitted(true);
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12 bg-linear-to-b from-slate-900 via-indigo-950 to-slate-950 text-white">
      <Card className="w-full max-w-md bg-slate-900/90 border-slate-800 text-white shadow-2xl backdrop-blur-xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-2">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <span className="text-white font-black text-2xl">A</span>
            </div>
          </div>
          <CardTitle className="text-2xl font-black tracking-tight text-white">Forgot Password</CardTitle>
          <CardDescription className="text-gray-400 text-xs">
            Enter your email to receive a secure password reset link
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-xl bg-red-950/60 border border-red-800/80 p-3 text-xs text-red-300 font-medium">
              {error}
            </div>
          )}

          {isSubmitted ? (
            <div className="rounded-xl bg-emerald-950/60 border border-emerald-800/80 p-4 text-center space-y-2">
              <p className="text-emerald-300 text-sm font-semibold">Check your inbox! ✉️</p>
              <p className="text-gray-300 text-xs">
                If an account exists with <strong className="text-white">{email}</strong>, we've sent password reset instructions.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs text-gray-300">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="bg-slate-950/60 border-slate-800 text-white placeholder:text-gray-500 focus:border-indigo-500 rounded-xl"
                />
              </div>

              <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl mouse-btn" disabled={isLoading}>
                {isLoading ? "Sending link..." : "Send Reset Link"}
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
