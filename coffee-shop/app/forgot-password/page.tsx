"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, ArrowRight } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setMessage("Please enter your email.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.message || "Failed to send reset email"
        );
      }

      setMessage(data.message);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#120805]">

      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: "url('/coffee-login.jpg')",
        }}
      />

      <div className="absolute inset-0 bg-black/50" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-10">

        <div className="w-full max-w-md rounded-[30px] border border-[#704326] bg-[#21120c]/95 p-8 shadow-2xl sm:p-10">

          <Link
            href="/login"
            className="mb-8 inline-flex items-center gap-2 text-sm text-[#bda493] transition hover:text-[#d27a25]"
          >
            <ArrowLeft size={17} />
            Back to Login
          </Link>

          <img
            src="/logo.jpg"
            alt="Coffee Shop"
            className="mx-auto mb-7 h-16 w-auto rounded-xl object-contain"
          />

          <div className="mb-8 text-center">
            <h1 className="font-(family-name:--font-playfair) text-4xl font-bold text-[#f5e1ca]">
              Forgot Password?
            </h1>

            <p className="mt-3 text-sm leading-6 text-[#bda493]">
              Enter your email address and we'll help you reset your password.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            <div>
              <label className="mb-2 block text-sm font-medium text-[#f1dfcd]">
                Email
              </label>

              <div className="flex items-center rounded-xl border border-[#684631] bg-[#2a1811] px-4 focus-within:border-[#c06b1b]">

                <Mail
                  size={19}
                  className="mr-3 text-[#c06b1b]"
                />

                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent py-4 text-[#f5e1ca] outline-none placeholder:text-[#927769]"
                />

              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#b75d08] py-4 font-semibold text-white transition hover:bg-[#cf7319] disabled:bg-gray-600"
            >
              {loading ? "Sending..." : "Send Reset Link"}

              {!loading && <ArrowRight size={19} />}
            </button>

          </form>

          {message && (
            <p className="mt-5 rounded-xl bg-[#2a1811] px-4 py-3 text-center text-sm text-[#d9b99e]">
              {message}
            </p>
          )}

          <p className="mt-7 text-center text-sm text-[#a88d7a]">
            Remember your password?{" "}
            <Link
              href="/login"
              className="font-semibold text-[#d27a25] hover:underline"
            >
              Login
            </Link>
          </p>

        </div>
      </div>
    </main>
  );
}