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
      { title: "Access JASMIQ Procurement AI" },
      { name: "description", content: "Sign in or create a JASMIQ account to access your Company Vault." },
      { property: "og:title", content: "Access JASMIQ Procurement AI" },
      {
        property: "og:description",
        content: "Sign in or create a JASMIQ account to access your Company Vault.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

type AuthMode = "sign-in" | "sign-up" | "forgot-password" | "reset-password";

function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleInitialSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) router.navigate({ to: "/dashboard" });
    };

    void handleInitialSession();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("reset-password");
        setError(null);
        setMessage(null);
        return;
      }

      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session && mode !== "reset-password") {
        router.navigate({ to: "/dashboard" });
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [mode, router]);

  const switchMode = (nextMode: AuthMode) => {
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

    try {
      if (mode === "sign-up") {
        const trimmedName = fullName.trim();
        if (!trimmedName) {
          setError("Please enter your full name.");
          return;
        }
        if (password.length < 8) {
          setError("Use at least 8 characters for your password.");
          return;
        }
        if (password !== confirmPassword) {
          setError("The passwords do not match.");
          return;
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth`,
            data: {
              full_name: trimmedName,
              display_name: trimmedName,
            },
          },
        });

        if (signUpError) {
          setError(signUpError.message);
          return;
        }

        if (data.session) {
          router.navigate({ to: "/dashboard" });
          return;
        }

        setMessage("Account created. Check your email to confirm your account, then sign in.");
        switchMode("sign-in");
        return;
      }

      if (mode === "forgot-password") {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/auth`,
        });

        if (resetError) {
          setError(resetError.message);
          return;
        }

        setMessage("If an account exists for that email, a password reset link has been sent.");
        return;
      }

      if (mode === "reset-password") {
        if (password.length < 8) {
          setError("Use at least 8 characters for your new password.");
          return;
        }
        if (password !== confirmPassword) {
          setError("The passwords do not match.");
          return;
        }

        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) {
          setError(updateError.message);
          return;
        }

        setPassword("");
        setConfirmPassword("");
        setMessage("Your password has been updated. You can now continue to JASMIQ.");
        setMode("sign-in");
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      router.navigate({ to: "/dashboard" });
    } finally {
      setLoading(false);
    }
  };

  const isSignUp = mode === "sign-up";
  const isForgot = mode === "forgot-password";
  const isReset = mode === "reset-password";

  const title = isSignUp
    ? "Create your JASMIQ account"
    : isForgot
      ? "Reset your password"
      : isReset
        ? "Set a new password"
        : "JASMIQ Procurement AI";

  const subtitle = isSignUp
    ? "Create your secure account to get started."
    : isForgot
      ? "Enter your email and we'll send a secure reset link."
      : isReset
        ? "Choose a new password for your JASMIQ account."
        : "Sign in to your Company Vault";

  return (
    <div className="flex min-h-screen items-center justify-center bg-app-gradient px-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="glass-panel w-full max-w-sm p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ShieldCheck className="size-5" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          {isSignUp ? (
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

          {!isReset ? (
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
          ) : null}

          {!isForgot ? (
            <div className="space-y-2">
              <Label htmlFor="password">{isReset ? "New password" : "Password"}</Label>
              <Input
                id="password"
                type="password"
                autoComplete={isReset || isSignUp ? "new-password" : "current-password"}
                required
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="rounded-xl"
              />
            </div>
          ) : null}

          {(isSignUp || isReset) ? (
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm password</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="rounded-xl"
              />
            </div>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}

          <Button type="submit" className="w-full rounded-xl shadow-elegant" disabled={loading}>
            {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
            {isSignUp ? "Create account" : isForgot ? "Send reset link" : isReset ? "Update password" : "Sign in"}
          </Button>
        </form>

        {!isReset ? (
          <div className="mt-5 space-y-2 text-center text-sm">
            {isForgot ? (
              <button type="button" className="text-primary hover:underline" onClick={() => switchMode("sign-in")}>
                Back to sign in
              </button>
            ) : (
              <>
                {!isSignUp ? (
                  <button type="button" className="block w-full text-muted-foreground hover:text-foreground" onClick={() => switchMode("forgot-password")}>
                    Forgot your password?
                  </button>
                ) : null}
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => switchMode(isSignUp ? "sign-in" : "sign-up")}
                >
                  {isSignUp ? "Already have an account? Sign in" : "New to JASMIQ? Create an account"}
                </button>
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
