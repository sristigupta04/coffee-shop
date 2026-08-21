"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Profile = {
  id?: string;
  name: string;
  email: string;
  phone: string;
  image: string;
};

export default function Profile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const getProfile = async () => {
      try {
        const res = await fetch("/api/profile", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || "Failed to fetch profile");
        }

        setProfile(data.data);
      } catch (err) {
        console.error("PROFILE ERROR:", err);

        setError(
          err instanceof Error
            ? err.message
            : "Failed to fetch profile"
        );
      } finally {
        setLoading(false);
      }
    };

    getProfile();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f8f3ed] px-4 py-10">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-bold text-[#3b2115]">
            Profile
          </h1>

          <div className="mt-8 rounded-3xl bg-white p-8 text-center shadow-sm">
            Loading profile...
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#f8f3ed] px-4 py-10">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/settings"
            className="text-sm font-medium text-[#806654] hover:text-[#3b2115]"
          >
            ← Back to Settings
          </Link>

          <div className="mt-8 rounded-3xl bg-white p-8 text-center shadow-sm">
            <h1 className="text-2xl font-bold text-[#3b2115]">
              Unable to load profile
            </h1>

            <p className="mt-3 text-red-600">
              {error}
            </p>

            <button
              onClick={() => window.location.reload()}
              className="mt-6 rounded-xl bg-[#6f4e37] px-6 py-3 font-semibold text-white"
            >
              Try Again
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f3ed] px-4 py-10 md:px-10 lg:px-16">
      <div className="mx-auto max-w-3xl">

        <Link
          href="/settings"
          className="text-sm font-medium text-[#806654] hover:text-[#3b2115]"
        >
          ← Back to Settings
        </Link>

        <h1 className="mt-5 text-4xl font-bold text-[#3b2115]">
          Profile
        </h1>

        <p className="mt-2 text-[#806654]">
          Manage your profile information and settings.
        </p>

        <div className="mt-8 rounded-3xl bg-white p-6 shadow-sm md:p-8">

          {/* PROFILE IMAGE */}

          <div className="flex flex-col items-center border-b border-[#eee4da] pb-8">

            {profile?.image ? (
              <img
                src={profile.image}
                alt="Profile"
                className="h-24 w-24 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#dfe9dc] text-4xl text-[#3b2115]">
                {profile?.name?.charAt(0).toUpperCase() || "U"}
              </div>
            )}

            <button
              type="button"
              className="mt-4 rounded-xl bg-[#dfe9dc] px-5 py-2 text-sm font-semibold text-[#3b2115]"
            >
              Change Photo
            </button>
          </div>

          {/* PERSONAL INFORMATION */}

          <div className="mt-8 space-y-6">

            {/* NAME */}

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#3b2115]">
                Full Name
              </label>

              <input
                type="text"
                value={profile?.name || ""}
                readOnly
                className="w-full rounded-xl border border-[#dfd2c5] bg-[#faf7f3] px-4 py-3 text-[#3b2115] outline-none"
              />
            </div>

            {/* EMAIL */}

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#3b2115]">
                Email Address
              </label>

              <input
                type="email"
                value={profile?.email || ""}
                readOnly
                className="w-full rounded-xl border border-[#dfd2c5] bg-[#faf7f3] px-4 py-3 text-[#3b2115] outline-none"
              />
            </div>

            {/* PHONE */}

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#3b2115]">
                Phone Number
              </label>

              <input
                type="tel"
                value={profile?.phone || ""}
                readOnly
                className="w-full rounded-xl border border-[#dfd2c5] bg-[#faf7f3] px-4 py-3 text-[#3b2115] outline-none"
              />
            </div>

          </div>

          {/* ACTIONS */}

          <div className="mt-8 flex flex-col gap-3 border-t border-[#eee4da] pt-6 sm:flex-row sm:justify-end">

            <button
              type="button"
              className="rounded-xl border border-[#cdbba9] px-6 py-3 text-sm font-semibold text-[#3b2115] hover:bg-[#f8f3ed]"
            >
              Edit Profile
            </button>

            <button
              type="button"
              className="rounded-xl bg-[#3b2115] px-6 py-3 text-sm font-semibold text-white hover:bg-[#542f20]"
            >
              Save Changes
            </button>

          </div>

        </div>
      </div>
    </main>
  );
}