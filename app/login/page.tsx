"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Lock } from "lucide-react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();
      if (data.success) {
        router.push("/");
        router.refresh();
      } else {
        setError(data.error || "Incorrect password");
        setLoading(false);
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 shadow-lg"
            style={{ background: "var(--surface)", border: "1px solid var(--dim)" }}
          >
            <Clock size={24} style={{ color: "var(--gold)" }} />
          </div>
          <h1 className="font-serif text-3xl font-bold" style={{ color: "var(--text)" }}>Time Ledger</h1>
          <p className="text-xs uppercase tracking-widest mt-2 font-bold" style={{ color: "var(--faint)" }}>Private Access</p>
        </div>

        <form 
          onSubmit={handleLogin}
          className="p-6 rounded-2xl shadow-xl flex flex-col gap-4 fade-up"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--muted)" }}>
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock size={16} style={{ color: "var(--faint)" }} />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 rounded-xl"
                placeholder="Enter your master password"
                autoFocus
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !password}
            className="btn-gold mt-2 py-3 rounded-xl shadow-lg flex justify-center"
          >
            {loading ? "Decrypting..." : "Unlock Ledger"}
          </button>
        </form>
      </div>
    </div>
  );
}
