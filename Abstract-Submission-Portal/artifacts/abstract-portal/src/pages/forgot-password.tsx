import React, { useState } from "react";
import { Link } from "wouter";
import { customFetch } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, ArrowLeft, ShieldCheck } from "lucide-react";
import faviconUrl from "@assets/favicon.png";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await customFetch("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
        credentials: "include",
      });
      setSent(true);
    } catch (err: any) {
      setError(err?.data?.error || err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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
                <Mail className="w-6 h-6 text-[#015845]" />
              </div>
            </div>
            <CardTitle className="text-xl font-serif text-foreground">Reset Password</CardTitle>
            <CardDescription>
              {sent
                ? "Check your inbox for the reset link."
                : "Enter your email and we'll send you a link to reset your password."}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {sent ? (
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                  <ShieldCheck className="w-8 h-8 text-[#015845]" />
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  If an account exists for <strong>{email}</strong>, a password reset link has been sent. Check your inbox (and spam folder).
                </p>
                <p className="text-xs text-muted-foreground text-center">The link expires in 1 hour.</p>
                <Link href="/login">
                  <Button variant="outline" className="mt-2 gap-2">
                    <ArrowLeft className="h-4 w-4" /> Back to Sign In
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
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
                  {loading ? "Sending..." : "Send Reset Link"}
                </Button>

                <div className="text-center">
                  <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                    <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
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
