import { useState } from "react";
import { Link } from "react-router-dom";
import { authApi } from "@/lib/api-client";
import { ThemedLogo } from "@/components/ui/ThemedLogo";
import { ThemeToggleButton } from "@/components/ui/ThemeToggleButton";
import { toast } from "sonner";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
      toast.success("Check your email for a reset link");
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--background))] px-4">
      <ThemeToggleButton />
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 shadow-lg">
        <div className="flex flex-col items-center gap-3">
          <ThemedLogo className="h-16 w-16 rounded-lg" />
          <h1 className="text-2xl font-brand text-[hsl(var(--secondary))]">
            Forgot Password
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] text-center">
            Enter your email and we'll send you a link to reset your password.
          </p>
        </div>

        {sent ? (
          <div className="space-y-4 text-center">
            <div className="rounded-md bg-[hsl(var(--muted))] p-4">
              <p className="text-sm text-[hsl(var(--foreground))]">
                If an account exists with <strong>{email}</strong>, you'll receive a
                reset link shortly.
              </p>
            </div>
            <Link
              to="/login"
              className="inline-block text-sm text-[hsl(var(--secondary))] hover:underline font-medium"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-[hsl(var(--foreground))]">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
                placeholder="you@example.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-[hsl(var(--secondary))] px-4 py-2 text-sm font-medium text-[hsl(var(--secondary-foreground))] hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send reset link"}
            </button>

            <p className="text-center text-sm text-[hsl(var(--muted-foreground))]">
              <Link to="/login" className="text-[hsl(var(--secondary))] hover:underline">
                Back to sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
