"use client";

import { useState } from "react";

type Account = {
  id: number;
  name: string;
  email: string;
  phone: string;
  accountId: string;
  status: string;
};

export default function AccountPage() {
  const [account, setAccount] = useState<Account>({
    id: 1,
    name: "Coffee User",
    email: "user@example.com",
    phone: "+91 9876543210",
    accountId: "USER-1001",
    status: "Active",
  });

  const [name, setName] = useState(account.name);
  const [phone, setPhone] = useState(account.phone);

  const [language, setLanguage] = useState("English");
  const [currency, setCurrency] = useState("INR");

  const [googleConnected, setGoogleConnected] = useState(true);

  const [editProfile, setEditProfile] = useState(false);
  const [emailEdit, setEmailEdit] = useState(false);
  const [phoneEdit, setPhoneEdit] = useState(false);

  const [newEmail, setNewEmail] = useState(account.email);

  const [saved, setSaved] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // ---------------- PROFILE ----------------

  const handleProfileSave = () => {
    setAccount((prev) => ({
      ...prev,
      name,
      phone,
    }));

    setEditProfile(false);
    setSaved(true);

    setTimeout(() => {
      setSaved(false);
    }, 2000);
  };

  // ---------------- EMAIL ----------------

  const handleEmailSave = () => {
    if (!newEmail.includes("@")) {
      return;
    }

    setAccount((prev) => ({
      ...prev,
      email: newEmail,
    }));

    setEmailEdit(false);
  };

  // ---------------- PHONE ----------------

  const handlePhoneSave = () => {
    setAccount((prev) => ({
      ...prev,
      phone,
    }));

    setPhoneEdit(false);
  };

  // ---------------- GOOGLE ----------------

  const handleGoogle = () => {
    setGoogleConnected((prev) => !prev);
  };

  // ---------------- LOGOUT ----------------

  const handleLogout = () => {
    alert("Logout API will be connected later.");
  };

  // ---------------- DELETE ----------------

  const handleDelete = () => {
    setDeleteOpen(false);

    alert("Account deletion API will be connected later.");
  };

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
              {account.status}
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
                {account.phone}
              </p>

            </div>


            <div className="rounded-xl bg-[#f7f1e8] p-4">

              <p className="text-xs text-gray-500">
                Account ID
              </p>

              <p className="mt-1 font-medium">
                {account.accountId}
              </p>

            </div>

          </div>


          <button
            onClick={() => setEditProfile(!editProfile)}
            className="mt-5 rounded-xl bg-[#6f4e37] px-5 py-2 text-sm text-white hover:bg-[#5a3d2b]"
          >
            {editProfile ? "Close" : "Edit Profile"}
          </button>


          {editProfile && (

            <div className="mt-5 space-y-4 rounded-xl bg-[#f7f1e8] p-5">

              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name"
                className="w-full rounded-xl border border-gray-300 p-3"
              />

              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone"
                className="w-full rounded-xl border border-gray-300 p-3"
              />

              <button
                onClick={handleProfileSave}
                className="rounded-xl bg-[#6f4e37] px-5 py-2 text-sm text-white"
              >
                Save Changes
              </button>

            </div>

          )}

          {saved && (
            <p className="mt-3 text-sm text-green-600">
              Profile updated successfully.
            </p>
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
              onClick={() => setEmailEdit(!emailEdit)}
              className="rounded-xl border border-[#6f4e37] px-4 py-2 text-sm text-[#6f4e37]"
            >
              {emailEdit ? "Cancel" : "Change Email"}
            </button>

          </div>


          {emailEdit && (

            <div className="mt-5 space-y-3">

              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full rounded-xl border border-gray-300 p-3"
              />

              <button
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
                {account.phone}
              </p>

              <p className="mt-1 text-sm text-green-600">
                ✓ Verified
              </p>

            </div>

            <button
              onClick={() => setPhoneEdit(!phoneEdit)}
              className="rounded-xl border border-[#6f4e37] px-4 py-2 text-sm text-[#6f4e37]"
            >
              {phoneEdit ? "Cancel" : "Change Phone"}
            </button>

          </div>


          {phoneEdit && (

            <div className="mt-5 space-y-3">

              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-gray-300 p-3"
              />

              <button
                onClick={handlePhoneSave}
                className="rounded-xl bg-[#6f4e37] px-5 py-2 text-sm text-white"
              >
                Save Phone
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
                onChange={(e) => setLanguage(e.target.value)}
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
                onChange={(e) => setCurrency(e.target.value)}
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
              onClick={handleLogout}
              className="rounded-xl border border-gray-400 px-5 py-2 text-sm text-gray-700"
            >
              Logout
            </button>

            <button
              onClick={() => setDeleteOpen(true)}
              className="rounded-xl bg-red-600 px-5 py-2 text-sm text-white hover:bg-red-700"
            >
              Delete Account
            </button>

          </div>

        </section>


        {/* DELETE MODAL */}

        {deleteOpen && (

          <div className="fixed inset-0 flex items-center justify-center bg-black/40 px-4">

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
                  onClick={() => setDeleteOpen(false)}
                  className="rounded-xl border px-4 py-2 text-sm"
                >
                  Cancel
                </button>

                <button
                  onClick={handleDelete}
                  className="rounded-xl bg-red-600 px-4 py-2 text-sm text-white"
                >
                  Confirm Delete
                </button>

              </div>

            </div>

          </div>

        )}

      </div>

    </main>
  );
}