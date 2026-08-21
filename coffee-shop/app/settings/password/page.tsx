"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ChangePassword() {
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleChangePassword = async () => {
    setMessage("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage("Please fill all the fields");
      return;
    }

    if (newPassword.length < 6) {
      setMessage("New password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage("New password and confirm password do not match");
      return;
    }

    if (currentPassword === newPassword) {
      setMessage("New password must be different from current password");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "Failed to change password");
        return;
      }

      setMessage(data.message || "Password changed successfully");

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        router.push("/settings");
      }, 1000);
    } catch (error) {
      console.error("Change password error:", error);
      setMessage("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f8f3ed] px-4 py-8 md:px-10 lg:px-16">
      <div className="mx-auto max-w-2xl">

        {/* Header */}
        <div className="mb-8">
          <button
            type="button"
            onClick={() => router.push("/settings")}
            className="text-sm font-medium text-[#806654] hover:text-[#3b2115]"
          >
            ← Back to Settings
          </button>

          <h1 className="mt-5 text-3xl font-bold text-[#3b2115]">
            Change Password
          </h1>

          <p className="mt-2 text-sm text-[#806654]">
            Update your account password securely.
          </p>
        </div>

        {/* Form */}
        <div className="rounded-3xl bg-white p-6 shadow-sm md:p-8">

          {/* Current Password */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#3b2115]">
              Current Password
            </label>

            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              className="w-full rounded-xl border border-[#d9cbbd] px-4 py-3 outline-none transition focus:border-[#6f4e37]"
            />
          </div>

          {/* New Password */}
          <div className="mt-5">
            <label className="mb-2 block text-sm font-semibold text-[#3b2115]">
              New Password
            </label>

            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              className="w-full rounded-xl border border-[#d9cbbd] px-4 py-3 outline-none transition focus:border-[#6f4e37]"
            />

            <p className="mt-2 text-xs text-[#806654]">
              Password must be at least 6 characters.
            </p>
          </div>

          {/* Confirm Password */}
          <div className="mt-5">
            <label className="mb-2 block text-sm font-semibold text-[#3b2115]">
              Confirm New Password
            </label>

            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="w-full rounded-xl border border-[#d9cbbd] px-4 py-3 outline-none transition focus:border-[#6f4e37]"
            />
          </div>

          {/* Message */}
          {message && (
            <div className="mt-5 rounded-xl bg-[#f8f3ed] px-4 py-3 text-sm text-[#6f4e37]">
              {message}
            </div>
          )}

          {/* Button */}
          <button
            type="button"
            onClick={handleChangePassword}
            disabled={loading}
            className="mt-6 w-full rounded-xl bg-[#3b2115] px-5 py-3 font-semibold text-white transition hover:bg-[#542f20] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Changing Password..." : "Change Password"}
          </button>
        </div>
      </div>
    </main>
  );
}