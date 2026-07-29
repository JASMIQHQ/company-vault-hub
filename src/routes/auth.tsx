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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.navigate({ to: "/vault" });
    });
  }, [router]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    router.navigate({ to: "/vault" });
  };

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
          <h1 className="text-xl font-semibold tracking-tight">Jasmiq Procurement AI</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to your Company Vault</p>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
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
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="rounded-xl"
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full rounded-xl shadow-elegant" disabled={loading}>
            {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
            Sign in
          </Button>
        </form>
      </div>
    </div>
  );
}
