"use client";

import { FormEvent, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!token) {
      setMessage("Invalid or missing reset token.");
      return;
    }

    if (!password || !confirmPassword) {
      setMessage("Please enter both passwords.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const response = await fetch("/api/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Failed to reset password.");
        return;
      }

      setMessage("Password reset successfully!");

      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#1b0d07] flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl bg-[#2a160e] p-8 shadow-2xl">
        <h1 className="text-center text-3xl font-bold text-[#f5e6d3]">
          Reset Password
        </h1>

        <p className="mt-3 text-center text-[#c9a990]">
          Create a new password for your account.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-[#ead5c0]">
              New Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password"
              className="w-full rounded-xl border border-[#70452d] bg-[#21110b] px-4 py-3 text-white outline-none focus:border-[#c66a00]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[#ead5c0]">
              Confirm Password
            </label>

            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="w-full rounded-xl border border-[#70452d] bg-[#21110b] px-4 py-3 text-white outline-none focus:border-[#c66a00]"
            />
          </div>

          {message && (
            <p className="rounded-xl bg-[#351d13] px-4 py-3 text-center text-sm text-[#e8c6a8]">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#c66a00] py-3 font-semibold text-white transition hover:bg-[#a95700] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>

        <p className="mt-6 text-center text-[#c9a990]">
          Remember your password?{" "}
          <Link
            href="/login"
            className="font-semibold text-[#d8790b] hover:underline"
          >
            Login
          </Link>
        </p>
      </div>
    </main>
  );
}
