import { useEffect, useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Github, Loader2, LockKeyhole, Mail, ShieldCheck } from "lucide-react";

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

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
      <path fill="#4285F4" d="M21.35 12.27c0-.72-.06-1.42-.18-2.09H12v3.95h5.24a4.48 4.48 0 0 1-1.94 2.94v2.44h3.14c1.84-1.7 2.91-4.2 2.91-7.24Z" />
      <path fill="#34A853" d="M12 21.72c2.63 0 4.84-.87 6.45-2.35l-3.14-2.44c-.87.58-1.98.92-3.31.92-2.54 0-4.69-1.72-5.46-4.03H3.3v2.52A9.73 9.73 0 0 0 12 21.72Z" />
      <path fill="#FBBC05" d="M6.54 13.82A5.85 5.85 0 0 1 6.23 12c0-.63.11-1.24.31-1.82V7.66H3.3A9.75 9.75 0 0 0 2.27 12c0 1.57.38 3.05 1.03 4.34l3.24-2.52Z" />
      <path fill="#EA4335" d="M12 6.15c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.83 3.15 14.63 2.28 12 2.28A9.73 9.73 0 0 0 3.3 7.66l3.24 2.52C7.31 7.87 9.46 6.15 12 6.15Z" />
    </svg>
  );
}

function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "github" | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.navigate({ to: "/dashboard" });
    });
  }, [router]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);

    if (mode === "signup") {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin + "/dashboard" },
      });
      setLoading(false);
      if (signUpError) {
        setError(signUpError.message);
        return;
      }
      if (data.session) {
        router.navigate({ to: "/dashboard" });
      } else {
        setNotice("Account created. Check your email to confirm your account, then sign in.");
      }
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

  const signInWithProvider = async (provider: "google" | "github") => {
    setOauthLoading(provider);
    setError(null);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin + "/dashboard" },
    });
    if (oauthError) {
      setOauthLoading(null);
      setError(oauthError.message);
    }
  };

  const resetPassword = async () => {
    if (!email) {
      setError("Enter your email address first.");
      return;
    }
    setLoading(true);
    setError(null);
    setNotice(null);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/auth",
    });
    setLoading(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setNotice("Password reset instructions have been sent to your email.");
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-app-gradient px-4 py-10">
      <div className="absolute right-4 top-4"><ThemeToggle /></div>
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute left-[12%] top-[15%] size-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-[8%] right-[10%] size-72 rounded-full bg-cyan-400/10 blur-3xl" />
      </div>
      <div className="glass-panel relative w-full max-w-md p-7 sm:p-8">
        <div className="mb-7 flex flex-col items-center text-center">
          <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm ring-1 ring-primary/15"><ShieldCheck className="size-5" /></div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80">Procurement Intelligence</p>
          <h1 className="text-2xl font-semibold tracking-tight">Jasmiq Procurement AI</h1>
          <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">{mode === "signin" ? "Secure access to your Company Vault." : "Create your secure procurement workspace."}</p>
        </div>
        <div className="mb-5 grid grid-cols-2 rounded-xl bg-muted/70 p-1 ring-1 ring-border/60">
          <button type="button" onClick={() => { setMode("signin"); setError(null); setNotice(null); }} className={`rounded-lg px-3 py-2 text-sm font-medium transition-all ${mode === "signin" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>Sign in</button>
          <button type="button" onClick={() => { setMode("signup"); setError(null); setNotice(null); }} className={`rounded-lg px-3 py-2 text-sm font-medium transition-all ${mode === "signup" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>Create account</button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Button type="button" variant="outline" className="h-11 rounded-xl bg-background/55" onClick={() => signInWithProvider("google")} disabled={Boolean(oauthLoading) || loading}>
            {oauthLoading === "google" ? <Loader2 className="mr-2 size-4 animate-spin" /> : <GoogleMark />} Continue with Google
          </Button>
          <Button type="button" variant="outline" className="h-11 rounded-xl bg-background/55" onClick={() => signInWithProvider("github")} disabled={Boolean(oauthLoading) || loading}>
            {oauthLoading === "github" ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Github className="size-4" />} Continue with GitHub
          </Button>
        </div>
        <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground"><div className="h-px flex-1 bg-border" /><span>or continue with email</span><div className="h-px flex-1 bg-border" /></div>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative"><Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="h-11 rounded-xl pl-9" placeholder="you@company.com" /></div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative"><LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input id="password" type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} className="h-11 rounded-xl pl-9" placeholder="Minimum 8 characters" /></div>
          </div>
          {mode === "signin" ? <div className="flex justify-end"><button type="button" onClick={resetPassword} className="text-xs font-medium text-primary hover:underline" disabled={loading}>Forgot password?</button></div> : null}
          {error ? <p role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p> : null}
          {notice ? <p role="status" className="rounded-xl border border-success/20 bg-success-soft px-3 py-2 text-sm text-foreground">{notice}</p> : null}
          <Button type="submit" className="h-11 w-full rounded-xl shadow-elegant" disabled={loading || Boolean(oauthLoading)}>
            {loading && <Loader2 className="mr-2 size-4 animate-spin" />}{mode === "signin" ? "Sign in securely" : "Create secure account"}
          </Button>
        </form>
        <p className="mt-6 text-center text-[11px] leading-5 text-muted-foreground">Your workspace is protected by Supabase authentication and JASMIQ company-scoped access controls.</p>
      </div>
    </div>
  );
}
