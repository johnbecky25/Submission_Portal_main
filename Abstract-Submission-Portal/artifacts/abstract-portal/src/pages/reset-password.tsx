import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { customFetch } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LockKeyhole, ShieldCheck, AlertTriangle } from "lucide-react";
import faviconUrl from "@assets/favicon.png";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const token = new URLSearchParams(window.location.search).get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await customFetch("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, newPassword }),
        credentials: "include",
      });
      setSuccess(true);
      setTimeout(() => setLocation("/login"), 3000);
    } catch (err: any) {
      setError(err?.data?.error || err?.message || "Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "linear-gradient(135deg, #015845 0%, #027a60 40%, #0381ED 100%)" }}>
        <div className="w-full max-w-md">
          <Card className="border-0 shadow-2xl">
            <CardContent className="flex flex-col items-center gap-4 py-10">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <p className="text-foreground font-semibold text-center">Invalid Reset Link</p>
              <p className="text-sm text-muted-foreground text-center">This link is missing a reset token. Please request a new password reset.</p>
              <Link href="/forgot-password">
                <Button className="bg-[#015845] hover:bg-[#014535] text-white">Request New Link</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "linear-gradient(135deg, #015845 0%, #027a60 40%, #0381ED 100%)" }}>
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8 gap-3">
          <img src={faviconUrl} alt="Africa Water and Sanitation Systems Leadership Symposium" className="h-16 w-16 drop-shadow-lg" />
          <div className="text-center">
            <h1 className="text-white font-serif font-bold text-base tracking-wide">Africa Water and Sanitation Systems Leadership Symposium</h1>
          </div>
        </div>

        <Card className="border-0 shadow-2xl">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-3">
              <div className="w-12 h-12 rounded-full bg-[#015845]/10 flex items-center justify-center">
                <LockKeyhole className="w-6 h-6 text-[#015845]" />
              </div>
            </div>
            <CardTitle className="text-xl font-serif text-foreground">Set New Password</CardTitle>
            <CardDescription>Choose a strong new password for your account.</CardDescription>
          </CardHeader>

          <CardContent>
            {success ? (
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                  <ShieldCheck className="w-8 h-8 text-[#015845]" />
                </div>
                <p className="text-[#015845] font-semibold text-lg">Password reset!</p>
                <p className="text-sm text-muted-foreground text-center">Your password has been updated. Redirecting you to sign in…</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="At least 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Repeat your new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full bg-[#015845] hover:bg-[#014535] text-white font-semibold h-11"
                >
                  {loading ? "Resetting..." : "Reset Password"}
                </Button>

                <div className="text-center">
                  <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
                    Back to Sign In
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
