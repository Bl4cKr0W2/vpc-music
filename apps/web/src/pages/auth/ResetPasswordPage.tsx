import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { authApi } from "@/lib/api-client";
import { ThemedLogo } from "@/components/ui/ThemedLogo";
import { toast } from "sonner";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (!token) {
      toast.error("Invalid or missing reset token");
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      toast.success("Password reset successfully!");
      navigate("/login");
    } catch (err: any) {
      toast.error(err.message || "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--background))] px-4">
        <div className="w-full max-w-sm space-y-6 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 shadow-lg text-center">
          <h1 className="text-2xl font-brand text-[hsl(var(--destructive))]">
            Invalid Link
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            This reset link is invalid or has expired.
          </p>
          <Link
            to="/forgot-password"
            className="inline-block text-sm text-[hsl(var(--secondary))] hover:underline font-medium"
          >
            Request a new reset link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--background))] px-4">
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 shadow-lg">
        <div className="flex flex-col items-center gap-3">
          <ThemedLogo className="h-16 w-16 rounded-lg" />
          <h1 className="text-2xl font-brand text-[hsl(var(--secondary))]">
            Reset Password
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Enter your new password below.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-[hsl(var(--foreground))]">
              New Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
              placeholder="••••••••"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium text-[hsl(var(--foreground))]">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-[hsl(var(--secondary))] px-4 py-2 text-sm font-medium text-[hsl(var(--secondary-foreground))] hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "Resetting..." : "Reset password"}
          </button>
        </form>
      </div>
    </div>
  );
}
