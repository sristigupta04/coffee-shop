"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Address = {
  id: string;
  type: "HOME" | "WORK" | "OTHER";
  label: string | null;
  fullName: string;
  phone: string;
  addressLine: string;
  landmark: string | null;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
};

export default function Addresses() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    type: "HOME",
    label: "",
    fullName: "",
    phone: "",
    addressLine: "",
    landmark: "",
    city: "",
    state: "",
    pincode: "",
    isDefault: false,
  });

  const fetchAddresses = async () => {
    try {
      const res = await fetch("/api/addresses", {
        credentials: "include",
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to fetch addresses");
      }

      setAddresses(data.data || []);
    } catch (error) {
      console.error("Address error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : value,
    }));
  };

  const handleSave = async () => {
    if (
      !form.fullName ||
      !form.phone ||
      !form.addressLine ||
      !form.city ||
      !form.state ||
      !form.pincode
    ) {
      alert("Please fill all required fields.");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(form.phone.replace("+91", ""))) {
      alert("Enter a valid Indian phone number.");
      return;
    }

    if (!/^\d{6}$/.test(form.pincode)) {
      alert("Enter a valid 6-digit pincode.");
      return;
    }

    try {
      setSaving(true);

      const res = await fetch("/api/addresses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          ...form,
          phone: form.phone.startsWith("+91")
            ? form.phone
            : `+91${form.phone}`,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to save address");
      }

      setAddresses((prev) => {
        const updated = form.isDefault
          ? prev.map((address) => ({
              ...address,
              isDefault: false,
            }))
          : prev;

        return [data.data, ...updated];
      });

      setForm({
        type: "HOME",
        label: "",
        fullName: "",
        phone: "",
        addressLine: "",
        landmark: "",
        city: "",
        state: "",
        pincode: "",
        isDefault: false,
      });

      setShowForm(false);
    } catch (error) {
      console.error("Save address error:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to save address"
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteAddress = async (id: string) => {
    if (!confirm("Are you sure you want to delete this address?")) {
      return;
    }

    try {
      const res = await fetch(`/api/addresses/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to delete address");
      }

      setAddresses((prev) =>
        prev.filter((address) => address.id !== id)
      );
    } catch (error) {
      console.error("Delete address error:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to delete address"
      );
    }
  };

  const setDefaultAddress = async (id: string) => {
    try {
      const res = await fetch(`/api/addresses/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          isDefault: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.message || "Failed to set default address"
        );
      }

      setAddresses((prev) =>
        prev.map((address) => ({
          ...address,
          isDefault: address.id === id,
        }))
      );
    } catch (error) {
      console.error("Default address error:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to update address"
      );
    }
  };

  return (
    <main className="min-h-screen bg-[#f8f3ed] px-4 py-10 md:px-10">
      <div className="mx-auto max-w-4xl">

        <Link
          href="/settings"
          className="text-sm font-medium text-[#806654]"
        >
          ← Back to Settings
        </Link>

        <div className="mt-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-4xl font-bold text-[#3b2115]">
              My Addresses
            </h1>

            <p className="mt-2 text-[#806654]">
              Manage your delivery addresses.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="rounded-xl bg-[#3b2115] px-5 py-3 text-sm font-semibold text-white hover:bg-[#542f20]"
          >
            {showForm ? "Cancel" : "+ Add Address"}
          </button>
        </div>

        {/* Add Address Form */}

        {showForm && (
          <div className="mt-8 rounded-3xl bg-white p-6 shadow-sm md:p-8">
            <h2 className="text-2xl font-bold text-[#3b2115]">
              Add New Address
            </h2>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Address Type
                </label>

                <select
                  name="type"
                  value={form.type}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-[#dfd2c5] bg-[#faf7f3] px-4 py-3 outline-none"
                >
                  <option value="HOME">Home</option>
                  <option value="WORK">Work</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Label
                </label>

                <input
                  name="label"
                  value={form.label}
                  onChange={handleChange}
                  placeholder="e.g. Hostel, Office"
                  className="w-full rounded-xl border border-[#dfd2c5] bg-[#faf7f3] px-4 py-3 outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Full Name *
                </label>

                <input
                  name="fullName"
                  value={form.fullName}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-[#dfd2c5] bg-[#faf7f3] px-4 py-3 outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Phone *
                </label>

                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="9876543210"
                  className="w-full rounded-xl border border-[#dfd2c5] bg-[#faf7f3] px-4 py-3 outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-semibold">
                  Address *
                </label>

                <input
                  name="addressLine"
                  value={form.addressLine}
                  onChange={handleChange}
                  placeholder="House no, street, area"
                  className="w-full rounded-xl border border-[#dfd2c5] bg-[#faf7f3] px-4 py-3 outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Landmark
                </label>

                <input
                  name="landmark"
                  value={form.landmark}
                  onChange={handleChange}
                  placeholder="Nearby landmark"
                  className="w-full rounded-xl border border-[#dfd2c5] bg-[#faf7f3] px-4 py-3 outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  City *
                </label>

                <input
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-[#dfd2c5] bg-[#faf7f3] px-4 py-3 outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  State *
                </label>

                <input
                  name="state"
                  value={form.state}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-[#dfd2c5] bg-[#faf7f3] px-4 py-3 outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Pincode *
                </label>

                <input
                  name="pincode"
                  value={form.pincode}
                  onChange={handleChange}
                  maxLength={6}
                  className="w-full rounded-xl border border-[#dfd2c5] bg-[#faf7f3] px-4 py-3 outline-none"
                />
              </div>

            </div>

            <label className="mt-5 flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                name="isDefault"
                checked={form.isDefault}
                onChange={handleChange}
              />
              Make this my default address
            </label>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="mt-6 rounded-xl bg-[#3b2115] px-6 py-3 font-semibold text-white disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Address"}
            </button>
          </div>
        )}

        {/* Address List */}

        {loading ? (
          <div className="mt-8 rounded-3xl bg-white p-10 text-center">
            Loading addresses...
          </div>
        ) : addresses.length === 0 ? (
          <div className="mt-8 rounded-3xl bg-white p-10 text-center shadow-sm">
            <div className="text-5xl">📍</div>

            <h2 className="mt-4 text-xl font-bold text-[#3b2115]">
              No addresses saved
            </h2>

            <p className="mt-2 text-[#806654]">
              Add an address for faster checkout.
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-5">
            {addresses.map((address) => (
              <div
                key={address.id}
                className="rounded-3xl bg-white p-6 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="rounded-full bg-[#dfe9dc] px-3 py-1 text-xs font-semibold text-[#3b5a32]">
                      {address.type}
                    </span>

                    {address.isDefault && (
                      <span className="ml-2 rounded-full bg-[#f8eadc] px-3 py-1 text-xs font-semibold text-[#8a5a32]">
                        Default
                      </span>
                    )}

                    <h3 className="mt-4 text-lg font-bold text-[#3b2115]">
                      {address.fullName}
                    </h3>

                    <p className="mt-1 text-sm text-[#806654]">
                      {address.phone}
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-[#4b2e20]">
                  {address.addressLine}
                </p>

                {address.landmark && (
                  <p className="mt-1 text-sm text-[#806654]">
                    Landmark: {address.landmark}
                  </p>
                )}

                <p className="mt-1 text-[#4b2e20]">
                  {address.city}, {address.state} - {address.pincode}
                </p>

                <div className="mt-5 flex flex-wrap gap-3 border-t border-[#eee4da] pt-5">
                  {!address.isDefault && (
                    <button
                      type="button"
                      onClick={() => setDefaultAddress(address.id)}
                      className="rounded-xl border border-[#cdbba9] px-4 py-2 text-sm font-semibold text-[#3b2115] hover:bg-[#f8f3ed]"
                    >
                      Make Default
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => deleteAddress(address.id)}
                    className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}