"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";

type Account = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  image: string | null;
};

export default function AccountPage() {
  const [account, setAccount] = useState<Account | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");

  const [language, setLanguage] = useState("English");
  const [currency, setCurrency] = useState("INR");

  const [editProfile, setEditProfile] = useState(false);
  const [emailEdit, setEmailEdit] = useState(false);
  const [phoneEdit, setPhoneEdit] = useState(false);

  const [googleConnected, setGoogleConnected] = useState(false);

  const [saved, setSaved] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // ================= GET PROFILE =================

  useEffect(() => {
    const getProfile = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await fetch("/api/profile", {
          method: "GET",
          credentials: "include",
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(
            data.message || "Failed to fetch profile"
          );
        }

        setAccount(data.data);

        setName(data.data.name || "");
        setPhone(data.data.phone || "");
        setNewEmail(data.data.email || "");
      } catch (error) {
        console.error("Profile error:", error);

        setError(
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

  // ================= UPDATE PROFILE =================

  const updateProfile = async (
    updatedData: {
      name: string;
      phone: string;
      image?: string | null;
    }
  ) => {
    try {
      setSaving(true);
      setError("");

      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(updatedData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.message || "Failed to update profile"
        );
      }

      setAccount(data.data);

      setName(data.data.name || "");
      setPhone(data.data.phone || "");
      setNewEmail(data.data.email || "");

      setSaved(true);

      setTimeout(() => {
        setSaved(false);
      }, 2000);

      return true;
    } catch (error) {
      console.error("Update profile error:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to update profile"
      );

      return false;
    } finally {
      setSaving(false);
    }
  };

  // ================= SAVE PROFILE =================

  const handleProfileSave = async () => {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    const success = await updateProfile({
      name,
      phone,
      image: account?.image || null,
    });

    if (success) {
      setEditProfile(false);
    }
  };

  // ================= SAVE EMAIL =================

  const handleEmailSave = async () => {
    if (!newEmail.trim() || !newEmail.includes("@")) {
      setError("Please enter a valid email");
      return;
    }

    /*
      NOTE:
      Tumhare current /api/profile PATCH route mein
      email update allowed nahi hai.

      Isliye email ko abhi frontend par change nahi karenge.
      Email change ke liye separate API/verification flow
      banana better hai.
    */

    setError(
      "Email change requires email verification."
    );
  };

  // ================= SAVE PHONE =================

  const handlePhoneSave = async () => {
    const success = await updateProfile({
      name: name || account?.name || "",
      phone,
      image: account?.image || null,
    });

    if (success) {
      setPhoneEdit(false);
    }
  };

  // ================= GOOGLE =================

  const handleGoogle = () => {
    setGoogleConnected((prev) => !prev);
  };

  // ================= LOGOUT =================

  const handleLogout = async () => {
    try {
      await signOut({
        callbackUrl: "/login",
      });
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // ================= DELETE =================

  const handleDelete = async () => {
    try {
      setSaving(true);

      const res = await fetch("/api/profile", {
        method: "DELETE",
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.message || "Failed to delete account"
        );
      }

      setDeleteOpen(false);

      await signOut({
        callbackUrl: "/login",
      });
    } catch (error) {
      console.error("Delete account error:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to delete account"
      );
    } finally {
      setSaving(false);
    }
  };

  // ================= LOADING =================

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f1e8] px-4 py-10">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
            <p className="text-[#6f4e37]">
              Loading account...
            </p>
          </div>
        </div>
      </main>
    );
  }

  // ================= ERROR =================

  if (error && !account) {
    return (
      <main className="min-h-screen bg-[#f7f1e8] px-4 py-10">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
            <h1 className="text-2xl font-bold text-red-700">
              Unable to load account
            </h1>

            <p className="mt-3 text-gray-600">
              {error}
            </p>

            <button
              onClick={() => window.location.reload()}
              className="mt-5 rounded-xl bg-[#6f4e37] px-5 py-3 text-white"
            >
              Try Again
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!account) {
    return null;
  }

  // ================= UI =================

  return (
    <main className="min-h-screen bg-[#f7f1e8] px-4 py-10 text-[#3e2723]">
      <div className="mx-auto max-w-4xl">

        {/* HEADER */}

        <div className="mb-8">
          <h1 className="text-3xl font-bold">
            Account Settings
          </h1>

          <p className="mt-2 text-sm text-[#795548]">
            Manage your account information and preferences.
          </p>
        </div>

        {/* ERROR */}

        {error && (
          <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* SAVED */}

        {saved && (
          <div className="mb-6 rounded-xl bg-green-50 p-4 text-sm text-green-700">
            Profile updated successfully.
          </div>
        )}

        {/* ACCOUNT INFORMATION */}

        <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm">

          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">
                Account Information
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Your basic account information.
              </p>
            </div>

            <span className="rounded-full bg-green-100 px-4 py-2 text-sm font-medium text-green-700">
              Active
            </span>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">

            <div className="rounded-xl bg-[#f7f1e8] p-4">
              <p className="text-xs text-gray-500">
                Name
              </p>

              <p className="mt-1 font-medium">
                {account.name}
              </p>
            </div>

            <div className="rounded-xl bg-[#f7f1e8] p-4">
              <p className="text-xs text-gray-500">
                Email
              </p>

              <p className="mt-1 font-medium">
                {account.email}
              </p>
            </div>

            <div className="rounded-xl bg-[#f7f1e8] p-4">
              <p className="text-xs text-gray-500">
                Phone
              </p>

              <p className="mt-1 font-medium">
                {account.phone || "Not added"}
              </p>
            </div>

            <div className="rounded-xl bg-[#f7f1e8] p-4">
              <p className="text-xs text-gray-500">
                Account ID
              </p>

              <p className="mt-1 break-all font-medium">
                {account.id}
              </p>
            </div>

          </div>

          <button
            type="button"
            onClick={() => setEditProfile(!editProfile)}
            className="mt-5 rounded-xl bg-[#6f4e37] px-5 py-2 text-sm text-white hover:bg-[#5a3d2b]"
          >
            {editProfile ? "Close" : "Edit Profile"}
          </button>

          {editProfile && (
            <div className="mt-5 space-y-4 rounded-xl bg-[#f7f1e8] p-5">

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Name
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white p-3 outline-none focus:border-[#6f4e37]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Phone
                </label>

                <input
                  type="tel"
                  value={phone}
                  onChange={(e) =>
                    setPhone(e.target.value)
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white p-3 outline-none focus:border-[#6f4e37]"
                />
              </div>

              <button
                type="button"
                onClick={handleProfileSave}
                disabled={saving}
                className="rounded-xl bg-[#6f4e37] px-5 py-2 text-sm text-white disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : "Save Changes"}
              </button>

            </div>
          )}

        </section>

        {/* EMAIL */}

        <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm">

          <h2 className="text-xl font-semibold">
            Email Address
          </h2>

          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <p className="font-medium">
                {account.email}
              </p>

              <p className="mt-1 text-sm text-green-600">
                ✓ Verified
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setEmailEdit(!emailEdit)
              }
              className="rounded-xl border border-[#6f4e37] px-4 py-2 text-sm text-[#6f4e37]"
            >
              {emailEdit
                ? "Cancel"
                : "Change Email"}
            </button>

          </div>

          {emailEdit && (
            <div className="mt-5 space-y-3">

              <input
                type="email"
                value={newEmail}
                onChange={(e) =>
                  setNewEmail(e.target.value)
                }
                className="w-full rounded-xl border border-gray-300 p-3"
              />

              <button
                type="button"
                onClick={handleEmailSave}
                className="rounded-xl bg-[#6f4e37] px-5 py-2 text-sm text-white"
              >
                Save Email
              </button>

            </div>
          )}

        </section>

        {/* PHONE */}

        <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm">

          <h2 className="text-xl font-semibold">
            Phone Number
          </h2>

          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <p className="font-medium">
                {account.phone || "Not added"}
              </p>

              {account.phone && (
                <p className="mt-1 text-sm text-green-600">
                  ✓ Verified
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() =>
                setPhoneEdit(!phoneEdit)
              }
              className="rounded-xl border border-[#6f4e37] px-4 py-2 text-sm text-[#6f4e37]"
            >
              {phoneEdit
                ? "Cancel"
                : "Change Phone"}
            </button>

          </div>

          {phoneEdit && (
            <div className="mt-5 space-y-3">

              <input
                type="tel"
                value={phone}
                onChange={(e) =>
                  setPhone(e.target.value)
                }
                className="w-full rounded-xl border border-gray-300 p-3"
              />

              <button
                type="button"
                onClick={handlePhoneSave}
                disabled={saving}
                className="rounded-xl bg-[#6f4e37] px-5 py-2 text-sm text-white disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : "Save Phone"}
              </button>

            </div>
          )}

        </section>

        {/* PREFERENCES */}

        <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm">

          <h2 className="text-xl font-semibold">
            Account Preferences
          </h2>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">

            <div>
              <label className="mb-2 block text-sm font-medium">
                Language
              </label>

              <select
                value={language}
                onChange={(e) =>
                  setLanguage(e.target.value)
                }
                className="w-full rounded-xl border border-gray-300 p-3"
              >
                <option>English</option>
                <option>Hindi</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Currency
              </label>

              <select
                value={currency}
                onChange={(e) =>
                  setCurrency(e.target.value)
                }
                className="w-full rounded-xl border border-gray-300 p-3"
              >
                <option value="INR">INR ₹</option>
                <option value="USD">USD $</option>
                <option value="EUR">EUR €</option>
              </select>
            </div>

          </div>

        </section>

        {/* CONNECTED ACCOUNTS */}

        <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm">

          <h2 className="text-xl font-semibold">
            Connected Accounts
          </h2>

          <div className="mt-5 flex items-center justify-between rounded-xl bg-[#f7f1e8] p-4">

            <div>
              <h3 className="font-medium">
                Google
              </h3>

              <p className="text-sm text-gray-500">
                {googleConnected
                  ? "Connected to your account"
                  : "Not connected"}
              </p>
            </div>

            <button
              type="button"
              onClick={handleGoogle}
              className={`rounded-xl px-4 py-2 text-sm text-white ${
                googleConnected
                  ? "bg-red-500"
                  : "bg-[#6f4e37]"
              }`}
            >
              {googleConnected
                ? "Disconnect"
                : "Connect"}
            </button>

          </div>

        </section>

        {/* ACCOUNT STATUS */}

        <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm">

          <h2 className="text-xl font-semibold">
            Account Status
          </h2>

          <div className="mt-4 flex items-center justify-between rounded-xl bg-green-50 p-4">

            <div>
              <p className="font-medium text-green-800">
                Account Active
              </p>

              <p className="text-sm text-green-700">
                Your account is currently active.
              </p>
            </div>

            <span className="rounded-full bg-green-600 px-3 py-1 text-xs text-white">
              Active
            </span>

          </div>

        </section>

        {/* DANGER ZONE */}

        <section className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm">

          <h2 className="text-xl font-semibold text-red-700">
            Danger Zone
          </h2>

          <p className="mt-2 text-sm text-gray-600">
            These actions affect your account permanently.
          </p>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-gray-400 px-5 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Logout
            </button>

            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className="rounded-xl bg-red-600 px-5 py-2 text-sm text-white hover:bg-red-700"
            >
              Delete Account
            </button>

          </div>

        </section>

        {/* DELETE MODAL */}

        {deleteOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">

            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">

              <h2 className="text-xl font-bold text-red-700">
                Delete Account?
              </h2>

              <p className="mt-3 text-sm text-gray-600">
                This action cannot be undone. All account-related
                information may be permanently removed.
              </p>

              <div className="mt-6 flex justify-end gap-3">

                <button
                  type="button"
                  onClick={() =>
                    setDeleteOpen(false)
                  }
                  className="rounded-xl border px-4 py-2 text-sm"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={saving}
                  className="rounded-xl bg-red-600 px-4 py-2 text-sm text-white disabled:opacity-50"
                >
                  {saving
                    ? "Deleting..."
                    : "Confirm Delete"}
                </button>

              </div>

            </div>

          </div>
        )}

      </div>
    </main>
  );
}