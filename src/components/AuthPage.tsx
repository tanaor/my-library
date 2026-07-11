import { useState } from "react";

interface Props {
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<void>;
}

export default function AuthPage({ onSignIn, onSignUp }: Props) {
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "signIn") await onSignIn(email, password);
      else await onSignUp(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4">
        <h1 className="text-center text-2xl font-semibold">My Library</h1>
        <input
          className="w-full rounded-lg bg-neutral-800 px-4 py-3 outline-none"
          type="email" placeholder="Email" value={email} required
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="w-full rounded-lg bg-neutral-800 px-4 py-3 outline-none"
          type="password" placeholder="Password" value={password} required minLength={6}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          disabled={busy}
          className="w-full rounded-lg bg-neutral-100 py-3 font-medium text-neutral-900 disabled:opacity-50"
        >
          {busy ? "…" : mode === "signIn" ? "Sign in" : "Create account"}
        </button>
        <button
          type="button" className="w-full text-sm text-neutral-400"
          onClick={() => { setMode(mode === "signIn" ? "signUp" : "signIn"); setError(""); }}
        >
          {mode === "signIn" ? "Need an account? Sign up" : "Have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}
