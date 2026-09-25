import { useEffect, useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Loader2, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in | Jasmiq Procurement AI" },
      { name: "description", content: "Sign in to access your Jasmiq Company Vault." },
      { property: "og:title", content: "Sign in | Jasmiq Procurement AI" },
      {
        property: "og:description",
        content: "Sign in to access your Jasmiq Company Vault.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.navigate({ to: "/dashboard" });
    });
  }, [router]);

  const switchMode = (nextMode: "signin" | "register") => {
    setMode(nextMode);
    setError(null);
    setMessage(null);
    setPassword("");
    setConfirmPassword("");
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (mode === "register") {
      if (password.length < 6) {
        setLoading(false);
        setError("Password must be at least 6 characters.");
        return;
      }
      if (password !== confirmPassword) {
        setLoading(false);
        setError("Passwords do not match.");
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      setLoading(false);
      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (data.session) {
        router.navigate({ to: "/dashboard" });
        return;
      }

      setMessage("Your account has been created. Check your email to confirm your account, then sign in.");
      setMode("signin");
      setPassword("");
      setConfirmPassword("");
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    router.navigate({ to: "/dashboard" });
  };

  const isRegister = mode === "register";

  return (
    <div className="flex min-h-screen items-center justify-center bg-app-gradient px-4 py-8">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="glass-panel w-full max-w-sm p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ShieldCheck className="size-5" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Jasmiq Procurement AI</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isRegister ? "Create your Company Vault account" : "Sign in to your Company Vault"}
          </p>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          {isRegister ? (
            <div className="space-y-2">
              <Label htmlFor="full-name">Full name</Label>
              <Input
                id="full-name"
                type="text"
                autoComplete="name"
                required
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="rounded-xl"
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete={isRegister ? "new-password" : "current-password"}
              minLength={isRegister ? 6 : undefined}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="rounded-xl"
            />
          </div>

          {isRegister ? (
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm password</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                minLength={6}
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="rounded-xl"
              />
            </div>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {message ? <p className="text-sm text-success">{message}</p> : null}

          <Button type="submit" className="w-full rounded-xl shadow-elegant" disabled={loading}>
            {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
            {isRegister ? "Create account" : "Sign in"}
          </Button>
        </form>

        <div className="mt-6 border-t border-border/50 pt-5 text-center text-sm">
          {isRegister ? (
            <p className="text-muted-foreground">
              Already have an account?{" "}
              <button type="button" onClick={() => switchMode("signin")} className="font-medium text-primary underline-offset-4 hover:underline">
                Sign in
              </button>
            </p>
          ) : (
            <p className="text-muted-foreground">
              New to Jasmiq?{" "}
              <button type="button" onClick={() => switchMode("register")} className="font-medium text-primary underline-offset-4 hover:underline">
                Create an account
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
