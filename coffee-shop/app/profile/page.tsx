"use client";

import { useEffect, useRef, useState } from "react";
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
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const getProfile = async () => {
      try {
        const res = await fetch("/api/profile", {
          credentials: "include",
          cache: "no-store",
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || "Failed to fetch profile");
        }

        setProfile(data.data);
      } catch (error) {
        console.error("PROFILE ERROR:", error);
        setMessage(
          error instanceof Error
            ? error.message
            : "Failed to fetch profile"
        );
      } finally {
        setLoading(false);
      }
    };

    getProfile();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!profile) return;

    setProfile({
      ...profile,
      [e.target.name]: e.target.value,
    });
  };

  const handleSave = async () => {
    if (!profile) return;

    if (!profile.name.trim()) {
      setMessage("Name is required");
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: profile.name,
          phone: profile.phone,
          image: profile.image,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.message || "Failed to update profile"
        );
      }

      setProfile(data.data);
      setEditing(false);
      setMessage("Profile updated successfully");
    } catch (error) {
      console.error("PROFILE UPDATE ERROR:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to update profile"
      );
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file || !profile) return;

    // Preview only for now
    const imageUrl = URL.createObjectURL(file);

    setProfile({
      ...profile,
      image: imageUrl,
    });

    setEditing(true);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f8f3ed] p-10">
        <div className="mx-auto max-w-3xl rounded-3xl bg-white p-10 text-center">
          Loading profile...
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-[#f8f3ed] p-10">
        <div className="mx-auto max-w-3xl rounded-3xl bg-white p-10 text-center">
          <p className="text-red-600">
            {message || "Profile not found"}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f3ed] px-4 py-10 md:px-10 lg:px-16">
      <div className="mx-auto max-w-3xl">

        <Link
          href="/settings"
          className="text-sm font-medium text-[#806654]"
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

          {/* PHOTO */}

          <div className="flex flex-col items-center border-b border-[#eee4da] pb-8">

            {profile.image ? (
              <img
                src={profile.image}
                alt="Profile"
                className="h-24 w-24 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#dfe9dc] text-4xl font-bold text-[#3b2115]">
                {profile.name?.charAt(0).toUpperCase() || "U"}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
            />

            <button
              type="button"
              onClick={handlePhotoClick}
              className="mt-4 rounded-xl bg-[#dfe9dc] px-5 py-2 text-sm font-semibold text-[#3b2115] hover:bg-[#cfdcc9]"
            >
              Change Photo
            </button>

          </div>

          {/* NAME */}

          <div className="mt-8 space-y-6">

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#3b2115]">
                Full Name
              </label>

              <input
                type="text"
                name="name"
                value={profile.name || ""}
                onChange={handleChange}
                readOnly={!editing}
                className="w-full rounded-xl border border-[#dfd2c5] bg-[#faf7f3] px-4 py-3 text-[#3b2115] outline-none focus:border-[#6f4e37]"
              />
            </div>

            {/* EMAIL */}

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#3b2115]">
                Email Address
              </label>

              <input
                type="email"
                value={profile.email || ""}
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
                name="phone"
                value={profile.phone || ""}
                onChange={handleChange}
                readOnly={!editing}
                className="w-full rounded-xl border border-[#dfd2c5] bg-[#faf7f3] px-4 py-3 text-[#3b2115] outline-none focus:border-[#6f4e37]"
              />
            </div>

          </div>

          {/* MESSAGE */}

          {message && (
            <p className="mt-5 text-center text-sm font-medium text-[#6f4e37]">
              {message}
            </p>
          )}

          {/* BUTTONS */}

          <div className="mt-8 flex flex-col gap-3 border-t border-[#eee4da] pt-6 sm:flex-row sm:justify-end">

            {!editing ? (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded-xl border border-[#cdbba9] px-6 py-3 text-sm font-semibold text-[#3b2115] hover:bg-[#f8f3ed]"
              >
                Edit Profile
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-xl border border-[#cdbba9] px-6 py-3 text-sm font-semibold text-[#3b2115]"
              >
                Cancel
              </button>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={!editing || saving}
              className="rounded-xl bg-[#3b2115] px-6 py-3 text-sm font-semibold text-white hover:bg-[#542f20] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>

          </div>

        </div>
      </div>
    </main>
  );
}