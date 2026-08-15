import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { acceptInvitation, type Invitation, validateInvitation } from "@/lib/auth-api";

export function InvitationAcceptance() {
  const navigate = useNavigate();
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const token =
    typeof window === "undefined"
      ? ""
      : (new URLSearchParams(window.location.search).get("token") ?? "");
  useEffect(() => {
    if (!token) {
      setNotice("This invitation link is invalid.");
      return;
    }
    void validateInvitation(token)
      .then((result) => setInvitation(result.invitation))
      .catch((error) => setNotice(error.message));
  }, [token]);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    try {
      setBusy(true);
      setNotice("");
      const result = await acceptInvitation(token, password);
      sessionStorage.setItem("webmintra:verification-email", result.email);
      await navigate({ to: "/verify-email" });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to accept invitation.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="surface-grid flex min-h-screen items-center bg-background px-5 text-foreground">
      <form onSubmit={submit} className="panel mx-auto w-full max-w-md p-7 shadow-panel">
        <p className="text-sm font-bold text-primary">WebMintra invitation</p>
        <h1 className="mt-3 font-display text-3xl font-bold">Set up your workspace</h1>
        {invitation ? (
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            You&apos;ve been invited to manage{" "}
            <strong className="text-foreground">{invitation.businessName}</strong> on the{" "}
            {invitation.plan} plan.
          </p>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">Validating your secure invitation…</p>
        )}
        {notice ? (
          <p className="mt-5 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
            {notice}
          </p>
        ) : null}
        <label className="mt-6 block text-sm font-bold">
          Create password
          <input
            required
            minLength={12}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 h-12 w-full rounded-lg border border-input bg-background px-3"
          />
        </label>
        <label className="mt-4 flex gap-2 text-xs text-muted-foreground">
          <input required type="checkbox" />I accept the terms and privacy policy.
        </label>
        <button
          disabled={!invitation || busy}
          className="mt-6 h-12 w-full rounded-lg bg-primary font-bold text-primary-foreground disabled:opacity-50"
        >
          Accept invitation and verify email
        </button>
      </form>
    </main>
  );
}
