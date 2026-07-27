import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLogin, getGetCurrentUserQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import faviconUrl from "@assets/favicon.png";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export default function Login() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { markLoggedIn } = useAuth();
  const [errorMsg, setErrorMsg] = useState("");

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const loginMutation = useLogin();

  const onSubmit = (data: z.infer<typeof loginSchema>) => {
    setErrorMsg("");
    loginMutation.mutate(
      { data },
      {
        onSuccess: (userData) => {
          // Re-enable the user query, then immediately seed the cache with the
          // login response. This avoids a brief isLoading=false/user=null window
          // that would cause ProtectedRoute to redirect back to /login.
          markLoggedIn();
          queryClient.setQueryData(getGetCurrentUserQueryKey(), userData);
          setLocation("/dashboard");
        },
        onError: (error: any) => {
          setErrorMsg(error.error || "Failed to login. Please check your credentials.");
        }
      }
    );
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
          <CardHeader className="space-y-1 text-center pb-4">
            <CardTitle className="text-xl font-serif text-foreground">Sign In</CardTitle>
            <CardDescription>Enter your credentials to access the portal</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="name@example.com" type="email" autoComplete="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input placeholder="••••••••" type="password" autoComplete="current-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {errorMsg && <div className="text-sm text-destructive font-medium">{errorMsg}</div>}
                <div className="flex justify-end">
                  <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-primary">
                    Forgot password?
                  </Link>
                </div>
                <Button type="submit" className="w-full mt-1 rounded-full" disabled={loginMutation.isPending}>
                  {loginMutation.isPending ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className="text-xs text-muted-foreground text-center">
              Contact your administrator to request access.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
