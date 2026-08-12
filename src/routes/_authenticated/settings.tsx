import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Building2, Check, KeyRound, LogOut, Moon, ShieldCheck, Sun, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useActiveOrganization } from "@/hooks/use-active-organization";
import { useSession } from "@/hooks/use-vault";
import { useTheme, type Theme } from "@/hooks/use-theme";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings | Jasmiq Procurement AI" },
      {
        name: "description",
        content: "Manage your Jasmiq Procurement AI account, organization context and appearance.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const router = useRouter();
  const { session, isLoading: sessionLoading } = useSession();
  const org = useActiveOrganization(session, sessionLoading);
  const { theme, resolvedTheme, setTheme } = useTheme();

  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameMessage, setNameMessage] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

  const displayName = org.firstName ?? session?.user.user_metadata?.full_name ?? "Account user";
  const email = session?.user.email ?? "Email unavailable";

  const beginNameEdit = () => {
    setName(displayName);
    setNameMessage(null);
    setEditingName(true);
  };

  const saveName = async () => {
    const nextName = name.trim();
    if (!nextName) {
      setNameMessage("Name cannot be empty.");
      return;
    }

    setSavingName(true);
    setNameMessage(null);
    const { error } = await supabase
      .from("profiles")
      .update({ first_name: nextName, display_name: nextName })
      .eq("auth_user_id", session!.user.id);

    if (error) {
      setNameMessage(error.message);
    } else {
      setNameMessage("Name updated successfully.");
      setEditingName(false);
      org.refetch();
    }
    setSavingName(false);
  };

  const updatePassword = async () => {
    setPasswordMessage(null);
    if (password.length < 8) {
      setPasswordMessage("Use at least 8 characters for your new password.");
      return;
    }
    if (password !== confirmPassword) {
      setPasswordMessage("The passwords do not match.");
      return;
    }

    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setPasswordMessage(error.message);
    } else {
      setPassword("");
      setConfirmPassword("");
      setPasswordMessage("Password updated successfully.");
    }
    setSavingPassword(false);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  };

  const themeOptions: Array<{ value: Theme; label: string; icon: typeof Sun }> = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: ShieldCheck },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-8">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">JASMIQ</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage your account, company context, security and appearance.
        </p>
      </div>

      <div className="space-y-5">
        <section className="glass-panel p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <UserRound className="size-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold">Account</h2>
                <p className="text-xs text-muted-foreground">Your authenticated account information.</p>
              </div>
            </div>
            {!editingName && <Button variant="outline" size="sm" className="rounded-xl" onClick={beginNameEdit}>Edit name</Button>}
          </div>

          {editingName ? (
            <div className="mt-5 space-y-3">
              <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Full name" autoFocus />
              <div className="flex gap-2">
                <Button className="rounded-xl" onClick={saveName} disabled={savingName}>{savingName ? "Saving…" : "Save"}</Button>
                <Button variant="ghost" className="rounded-xl" onClick={() => setEditingName(false)} disabled={savingName}>Cancel</Button>
              </div>
            </div>
          ) : null}

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border/60 bg-background/40 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Name</p>
              <p className="mt-1 text-sm font-medium">{displayName}</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/40 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Email</p>
              <p className="mt-1 break-all text-sm font-medium">{email}</p>
            </div>
          </div>
          {nameMessage ? <p className="mt-3 text-xs text-muted-foreground">{nameMessage}</p> : null}
        </section>

        <section className="glass-panel p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Building2 className="size-5" /></div>
            <div>
              <h2 className="text-sm font-semibold">Organization</h2>
              <p className="text-xs text-muted-foreground">Resolved from your existing membership context.</p>
            </div>
          </div>
          <div className="mt-5 rounded-xl border border-border/60 bg-background/40 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Current organization</p>
            <p className="mt-1 text-sm font-medium">{org.activeOrgName ?? (org.bootstrapping ? "Loading…" : "No organization found")}</p>
            {org.multiCompany ? <p className="mt-1 text-xs text-muted-foreground">Multiple organizations are available through the shared organization selector.</p> : null}
          </div>
        </section>

        <section className="glass-panel p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">{resolvedTheme === "dark" ? <Moon className="size-5" /> : <Sun className="size-5" />}</div>
            <div>
              <h2 className="text-sm font-semibold">Appearance</h2>
              <p className="text-xs text-muted-foreground">Stored locally on this device.</p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2">
            {themeOptions.map(({ value, label, icon: Icon }) => (
              <Button key={value} variant={theme === value ? "default" : "outline"} className="rounded-xl" onClick={() => setTheme(value)}>
                <Icon className="mr-2 size-4" />{label}{theme === value ? <Check className="ml-2 size-4" /> : null}
              </Button>
            ))}
          </div>
        </section>

        <section className="glass-panel p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><KeyRound className="size-5" /></div>
            <div>
              <h2 className="text-sm font-semibold">Password</h2>
              <p className="text-xs text-muted-foreground">Update the password for your current account.</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="New password" autoComplete="new-password" />
            <Input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Confirm new password" autoComplete="new-password" />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button className="rounded-xl" onClick={updatePassword} disabled={savingPassword}>{savingPassword ? "Updating…" : "Update password"}</Button>
            {passwordMessage ? <p className="text-xs text-muted-foreground">{passwordMessage}</p> : null}
          </div>
        </section>

        <section className="glass-panel p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><LogOut className="size-5" /></div>
            <div>
              <h2 className="text-sm font-semibold">Session</h2>
              <p className="text-xs text-muted-foreground">End the current authenticated session.</p>
            </div>
          </div>
          <Separator className="my-5" />
          <Button variant="outline" className="rounded-xl" onClick={signOut}>Sign out</Button>
        </section>
      </div>
    </div>
  );
}
