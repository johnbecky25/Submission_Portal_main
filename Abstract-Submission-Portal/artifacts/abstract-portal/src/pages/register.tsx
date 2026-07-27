import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRegister, getGetCurrentUserQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import faviconUrl from "@assets/favicon.png";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function Register() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { markLoggedIn } = useAuth();
  const [errorMsg, setErrorMsg] = useState("");

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const registerMutation = useRegister();

  const onSubmit = (data: z.infer<typeof registerSchema>) => {
    setErrorMsg("");
    registerMutation.mutate(
      { data: { ...data, role: "author" } },
      {
        onSuccess: (userData) => {
          markLoggedIn();
          queryClient.setQueryData(getGetCurrentUserQueryKey(), userData);
          setLocation("/dashboard");
        },
        onError: (error: any) => {
          setErrorMsg(error.error || error?.data?.error || "Failed to register. Please try again.");
        }
      }
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 py-12" style={{ background: "linear-gradient(135deg, #015845 0%, #027a60 40%, #0381ED 100%)" }}>
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8 gap-3">
          <img src={faviconUrl} alt="Africa Water and Sanitation Systems Leadership Symposium" className="h-14 w-14 drop-shadow-lg" />
          <div className="text-center">
            <h1 className="text-white font-serif font-bold text-base tracking-wide">Africa Water and Sanitation Systems Leadership Symposium</h1>
          </div>
        </div>

        <Card className="border-0 shadow-2xl">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-serif">Create an Account</CardTitle>
            <CardDescription>Register to submit your work to the Symposium</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Dr. Jane Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="jane.doe@organisation.org" type="email" autoComplete="email" {...field} />
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
                        <Input placeholder="••••••••" type="password" autoComplete="new-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {errorMsg && <div className="text-sm text-destructive font-medium">{errorMsg}</div>}

                <Button type="submit" className="w-full mt-4 rounded-full" disabled={registerMutation.isPending}>
                  {registerMutation.isPending ? "Creating account..." : "Create Account"}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline font-medium">Sign in</Link>
            </p>
          </CardFooter>
        </Card>

        <p className="text-center text-white/50 text-xs mt-6">
          Reviewer and admin accounts are created by portal administrators.
        </p>
      </div>
    </div>
  );
}
