
"use client";

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";

type Supplier = {
  id: string;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    purchaseOrders: number;
  };
};

type SupplierForm = {
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  notes: string;
};

type Summary = {
  totalSuppliers: number;
  activeSuppliers: number;
  inactiveSuppliers: number;
};

const emptyForm: SupplierForm = {
  name: "",
  contactPerson: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  notes: "",
};

const initialSummary: Summary = {
  totalSuppliers: 0,
  activeSuppliers: 0,
  inactiveSuppliers: 0,
};

async function readResponse(response: Response) {
  try {
    return await response.json();
  } catch {
    throw new Error("Invalid server response.");
  }
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] =
    useState<Supplier | null>(null);

  const [form, setForm] = useState<SupplierForm>(emptyForm);
  const [summary, setSummary] = useState<Summary>(initialSummary);
  const [refreshKey, setRefreshKey] = useState(0);

  // FETCH SUPPLIERS
  const fetchSuppliers = useCallback(
    async (signal?: AbortSignal) => {
      try {
        setLoading(true);
        setError("");

        const params = new URLSearchParams({ status });

        if (search.trim()) {
          params.set("search", search.trim());
        }

        const response = await fetch(
          `/api/admin/suppliers?${params.toString()}`,
          {
            credentials: "include",
            cache: "no-store",
            signal,
          }
        );

        const result = await readResponse(response);

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || "Failed to load suppliers."
          );
        }

        setSuppliers(
          Array.isArray(result.suppliers) ? result.suppliers : []
        );

        setSummary({
          totalSuppliers: Number(result.summary?.totalSuppliers ?? 0),
          activeSuppliers: Number(result.summary?.activeSuppliers ?? 0),
          inactiveSuppliers: Number(result.summary?.inactiveSuppliers ?? 0),
        });
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Unable to fetch suppliers."
        );
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [search, status]
  );

  useEffect(() => {
    const controller = new AbortController();

    const timer = window.setTimeout(() => {
      fetchSuppliers(controller.signal);
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [fetchSuppliers, refreshKey]);

  // FORM HANDLING
  const handleInputChange = (
    field: keyof SupplierForm,
    value: string
  ) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const openCreateModal = () => {
    setEditingSupplier(null);
    setForm(emptyForm);
    setError("");
    setModalOpen(true);
  };

  const openEditModal = (supplier: Supplier) => {
    setEditingSupplier(supplier);

    setForm({
      name: supplier.name,
      contactPerson: supplier.contactPerson || "",
      email: supplier.email || "",
      phone: supplier.phone || "",
      address: supplier.address || "",
      city: supplier.city || "",
      state: supplier.state || "",
      pincode: supplier.pincode || "",
      notes: supplier.notes || "",
    });

    setError("");
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;

    setModalOpen(false);
    setEditingSupplier(null);
    setForm(emptyForm);
    setError("");
  };

  // CREATE / UPDATE SUPPLIER
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = form.name.trim();

    if (!name) {
      setError("Supplier name is required.");
      return;
    }

    if (name.length > 150) {
      setError("Supplier name cannot exceed 150 characters.");
      return;
    }

    const email = form.email.trim();

    if (
      email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      setError("Please enter a valid email address.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const isEditing = Boolean(editingSupplier);

      const endpoint = isEditing
        ? `/api/admin/suppliers/${editingSupplier!.id}`
        : "/api/admin/suppliers";

      const payload = {
        name,
        contactPerson: form.contactPerson.trim(),
        email,
        phone: form.phone.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        pincode: form.pincode.trim(),
        notes: form.notes.trim(),
      };

      const response = await fetch(endpoint, {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const result = await readResponse(response);

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Unable to save supplier."
        );
      }

      setModalOpen(false);
      setEditingSupplier(null);
      setForm(emptyForm);

      setSuccess(
        isEditing
          ? "Supplier updated successfully."
          : "Supplier created successfully."
      );

      setRefreshKey((previous) => previous + 1);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  };

  // ACTIVATE / DEACTIVATE
  const toggleStatus = async (supplier: Supplier) => {
    const action = supplier.isActive ? "deactivate" : "activate";

    if (
      !window.confirm(
        `Are you sure you want to ${action} ${supplier.name}?`
      )
    ) {
      return;
    }

    try {
      setActionId(supplier.id);
      setError("");
      setSuccess("");

      const response = await fetch(
        `/api/admin/suppliers/${supplier.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            isActive: !supplier.isActive,
          }),
        }
      );

      const result = await readResponse(response);

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Status update failed."
        );
      }

      setSuccess(
        result.message ||
          `Supplier ${action}d successfully.`
      );

      setRefreshKey((previous) => previous + 1);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update supplier."
      );
    } finally {
      setActionId(null);
    }
  };

  // DELETE SUPPLIER
  const deleteSupplier = async (supplier: Supplier) => {
    if (supplier._count.purchaseOrders > 0) {
      setError(
        "This supplier has purchase orders. Deactivate it instead."
      );
      return;
    }

    if (
      !window.confirm(
        `Permanently delete supplier "${supplier.name}"?`
      )
    ) {
      return;
    }

    try {
      setActionId(supplier.id);
      setError("");
      setSuccess("");

      const response = await fetch(
        `/api/admin/suppliers/${supplier.id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const result = await readResponse(response);

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Delete failed."
        );
      }

      setSuccess("Supplier deleted successfully.");
      setRefreshKey((previous) => previous + 1);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete supplier."
      );
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F3ED] px-4 py-6 text-[#2B1B14] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-7">

        {/* HEADER */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#A76535]">
              BrewBites / Procurement
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              Supplier Management
            </h1>

            <p className="mt-2 text-sm text-[#80695B]">
              Manage supplier relationships and purchasing contacts.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="rounded-xl bg-[#754426] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2B1B14]"
          >
            + Add Supplier
          </button>
        </div>

        {/* FEEDBACK */}
        {error && !modalOpen && (
          <div
            role="alert"
            className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError("")}
              className="font-bold"
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </div>
        )}

        {success && (
          <div
            role="status"
            className="flex items-center justify-between gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700"
          >
            <span>{success}</span>
            <button
              type="button"
              onClick={() => setSuccess("")}
              className="font-bold"
              aria-label="Dismiss success message"
            >
              ✕
            </button>
          </div>
        )}

        {/* SUMMARY */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SummaryCard
            title="Total Suppliers"
            value={summary.totalSuppliers}
            description="All registered suppliers"
            icon="▤"
          />

          <SummaryCard
            title="Active Suppliers"
            value={summary.activeSuppliers}
            description="Currently available suppliers"
            icon="✓"
          />

          <SummaryCard
            title="Inactive Suppliers"
            value={summary.inactiveSuppliers}
            description="Deactivated suppliers"
            icon="−"
          />
        </div>

        {/* FILTERS */}
        <section className="rounded-2xl border border-[#EADED4] bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, contact, email or phone..."
              aria-label="Search suppliers"
              className="rounded-xl border border-[#EADED4] px-4 py-3 text-sm outline-none focus:border-[#A76535] focus:ring-2 focus:ring-[#A76535]/10"
            />

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              aria-label="Filter suppliers by status"
              className="rounded-xl border border-[#EADED4] bg-white px-4 py-3 text-sm outline-none focus:border-[#A76535]"
            >
              <option value="ALL">All Suppliers</option>
              <option value="ACTIVE">Active Suppliers</option>
              <option value="INACTIVE">Inactive Suppliers</option>
            </select>
          </div>
        </section>

        {/* SUPPLIER TABLE */}
        <section className="overflow-hidden rounded-2xl border border-[#EADED4] bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-2 border-b border-[#EADED4] px-5 py-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-bold">All Suppliers</h2>
              <p className="mt-1 text-sm text-[#80695B]">
                {suppliers.length} suppliers found
              </p>
            </div>

            <button
              type="button"
              onClick={() => setRefreshKey((previous) => previous + 1)}
              disabled={loading}
              className="rounded-lg border border-[#EADED4] px-4 py-2 text-sm font-semibold hover:bg-[#F8F3ED] disabled:opacity-50"
            >
              ↻ Refresh
            </button>
          </div>

          {loading ? (
            <div className="flex min-h-64 items-center justify-center">
              <div className="h-9 w-9 animate-spin rounded-full border-4 border-[#EADED4] border-t-[#754426]" />
            </div>
          ) : suppliers.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F8F3ED] text-2xl">
                🏢
              </div>

              <h3 className="mt-4 font-bold">
                No suppliers found
              </h3>

              <p className="mt-2 text-sm text-[#80695B]">
                {search || status !== "ALL"
                  ? "Try changing your search or filters."
                  : "Add your first supplier to start managing procurement."}
              </p>

              {!search && status === "ALL" && (
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="mt-4 rounded-lg bg-[#754426] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2B1B14]"
                >
                  + Add Supplier
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left">
                <thead className="bg-[#FDF9F5] text-xs uppercase tracking-wider text-[#80695B]">
                  <tr>
                    <th className="px-5 py-4">Supplier</th>
                    <th className="px-5 py-4">Contact Person</th>
                    <th className="px-5 py-4">Contact Details</th>
                    <th className="px-5 py-4">Location</th>
                    <th className="px-5 py-4">Purchase Orders</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#F0E8E0]">
                  {suppliers.map((supplier) => {
                    const busy = actionId === supplier.id;

                    return (
                      <tr
                        key={supplier.id}
                        className="transition hover:bg-[#FDF9F5]"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F8F3ED] font-bold text-[#754426]">
                              {supplier.name.charAt(0).toUpperCase()}
                            </div>

                            <div>
                              <p className="font-semibold">
                                {supplier.name}
                              </p>
                              <p className="mt-1 text-xs text-[#80695B]">
                                Added{" "}
                                {supplier.createdAt &&
                                !Number.isNaN(
                                  new Date(supplier.createdAt).getTime()
                                )
                                  ? new Date(
                                      supplier.createdAt
                                    ).toLocaleDateString("en-IN")
                                  : "—"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-sm">
                          {supplier.contactPerson || "—"}
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm">
                            {supplier.email || "No email"}
                          </p>
                          <p className="mt-1 text-xs text-[#80695B]">
                            {supplier.phone || "No phone"}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-sm text-[#80695B]">
                          {[
                            supplier.city,
                            supplier.state,
                          ]
                            .filter(Boolean)
                            .join(", ") || "—"}
                        </td>

                        <td className="px-5 py-4">
                          <span className="font-semibold tabular-nums">
                            {supplier._count?.purchaseOrders ?? 0}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                              supplier.isActive
                                ? "border-green-200 bg-green-50 text-green-700"
                                : "border-gray-200 bg-gray-100 text-gray-600"
                            }`}
                          >
                            {supplier.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEditModal(supplier)}
                              disabled={busy}
                              title="Edit supplier"
                              className="rounded-lg border border-[#EADED4] px-3 py-2 text-xs font-semibold hover:bg-[#F8F3ED] disabled:opacity-50"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => toggleStatus(supplier)}
                              disabled={busy}
                              title={
                                supplier.isActive
                                  ? "Deactivate"
                                  : "Activate"
                              }
                              className="rounded-lg border border-[#EADED4] px-3 py-2 text-xs font-semibold hover:bg-[#F8F3ED] disabled:opacity-50"
                            >
                              {busy
                                ? "Please wait..."
                                : supplier.isActive
                                  ? "Disable"
                                  : "Enable"}
                            </button>

                            <button
                              type="button"
                              onClick={() => deleteSupplier(supplier)}
                              disabled={
                                busy ||
                                supplier._count.purchaseOrders > 0
                              }
                              title={
                                supplier._count.purchaseOrders > 0
                                  ? "Cannot delete supplier with purchase orders"
                                  : "Delete supplier"
                              }
                              className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* CREATE / EDIT MODAL */}
        {modalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                closeModal();
              }
            }}
          >
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#EADED4] bg-white px-6 py-5">
                <div>
                  <h2 className="text-xl font-bold">
                    {editingSupplier
                      ? "Edit Supplier"
                      : "Add New Supplier"}
                  </h2>

                  <p className="mt-1 text-sm text-[#80695B]">
                    Enter supplier contact and business details.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-lg px-3 py-2 text-xl text-[#80695B] hover:bg-[#F8F3ED] disabled:opacity-50"
                  aria-label="Close modal"
                >
                  ✕
                </button>
              </div>

              <form
                onSubmit={handleSubmit}
                className="space-y-5 p-6"
              >
                {error && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                  >
                    {error}
                  </div>
                )}

                <div>
                  <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-[#A76535]">
                    Business Information
                  </h3>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      label="Supplier Name *"
                      value={form.name}
                      onChange={(value) =>
                        handleInputChange("name", value)
                      }
                      placeholder="e.g. Premium Coffee Beans"
                      required
                      maxLength={150}
                    />

                    <FormField
                      label="Contact Person"
                      value={form.contactPerson}
                      onChange={(value) =>
                        handleInputChange("contactPerson", value)
                      }
                      placeholder="Contact person's name"
                      maxLength={150}
                    />

                    <FormField
                      label="Email Address"
                      type="email"
                      value={form.email}
                      onChange={(value) =>
                        handleInputChange("email", value)
                      }
                      placeholder="supplier@example.com"
                      maxLength={254}
                    />

                    <FormField
                      label="Phone Number"
                      type="tel"
                      value={form.phone}
                      onChange={(value) =>
                        handleInputChange("phone", value)
                      }
                      placeholder="9876543210"
                      maxLength={30}
                    />
                  </div>
                </div>

                <div className="border-t border-[#EADED4] pt-5">
                  <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-[#A76535]">
                    Address Information
                  </h3>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      label="Address"
                      value={form.address}
                      onChange={(value) =>
                        handleInputChange("address", value)
                      }
                      placeholder="Street / Area"
                      maxLength={500}
                    />

                    <FormField
                      label="City"
                      value={form.city}
                      onChange={(value) =>
                        handleInputChange("city", value)
                      }
                      placeholder="Patna"
                      maxLength={100}
                    />

                    <FormField
                      label="State"
                      value={form.state}
                      onChange={(value) =>
                        handleInputChange("state", value)
                      }
                      placeholder="Bihar"
                      maxLength={100}
                    />

                    <FormField
                      label="PIN Code"
                      value={form.pincode}
                      onChange={(value) =>
                        handleInputChange("pincode", value)
                      }
                      placeholder="800001"
                      maxLength={20}
                    />
                  </div>
                </div>

                <div className="border-t border-[#EADED4] pt-5">
                  <label
                    htmlFor="supplier-notes"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Additional Notes
                  </label>

                  <textarea
                    id="supplier-notes"
                    value={form.notes}
                    onChange={(event) =>
                      handleInputChange("notes", event.target.value)
                    }
                    rows={3}
                    maxLength={1000}
                    placeholder="Payment terms, product details, delivery information..."
                    className="w-full resize-y rounded-xl border border-[#EADED4] px-4 py-3 text-sm outline-none focus:border-[#A76535]"
                  />

                  <p className="mt-1 text-right text-xs text-[#80695B]">
                    {form.notes.length}/1000
                  </p>
                </div>

                <div className="flex flex-col-reverse justify-end gap-3 border-t border-[#EADED4] pt-5 sm:flex-row">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={saving}
                    className="rounded-xl border border-[#EADED4] px-5 py-3 text-sm font-semibold hover:bg-[#F8F3ED] disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-[#754426] px-6 py-3 text-sm font-semibold text-white hover:bg-[#2B1B14] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving
                      ? "Saving..."
                      : editingSupplier
                        ? "Update Supplier"
                        : "Create Supplier"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// SUMMARY CARD
function SummaryCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: number;
  description: string;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border border-[#EADED4] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-[#80695B]">
          {title}
        </p>

        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F8F3ED] text-lg font-bold text-[#754426]">
          {icon}
        </span>
      </div>

      <p className="mt-4 text-3xl font-bold tabular-nums">
        {value.toLocaleString("en-IN")}
      </p>

      <p className="mt-1 text-xs text-[#80695B]">
        {description}
      </p>
    </div>
  );
}

// FORM FIELD
function FormField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  maxLength = 500,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  maxLength?: number;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        maxLength={maxLength}
        className="w-full rounded-xl border border-[#EADED4] px-4 py-3 text-sm outline-none transition focus:border-[#A76535] focus:ring-2 focus:ring-[#A76535]/10"
      />
    </div>
  );
}
