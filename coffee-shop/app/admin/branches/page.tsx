
"use client";

import { useCallback, useEffect, useState } from "react";

type Branch = {
  id: string;
  name: string;
  code: string;
  address: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    staff: number;
  };
};

type BranchForm = {
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  email: string;
};

const emptyForm: BranchForm = {
  name: "",
  code: "",
  address: "",
  city: "",
  state: "",
  phone: "",
  email: "",
};

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] =
    useState<Branch | null>(null);

  const [form, setForm] = useState<BranchForm>(emptyForm);

  const [summary, setSummary] = useState({
    totalBranches: 0,
    activeBranches: 0,
    inactiveBranches: 0,
  });

  // ======================================
  // FETCH BRANCHES
  // ======================================

  const fetchBranches = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({ status });

      if (search.trim()) {
        params.set("search", search.trim());
      }

      const response = await fetch(
        `/api/admin/branches?${params.toString()}`,
        {
          credentials: "include",
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to load branches.");
      }

      setBranches(result.branches ?? []);
      setSummary(
        result.summary ?? {
          totalBranches: 0,
          activeBranches: 0,
          inactiveBranches: 0,
        }
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to fetch branches."
      );
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchBranches();
    }, 300);

    return () => clearTimeout(timer);
  }, [fetchBranches]);

  // ======================================
  // FORM HANDLING
  // ======================================

  const handleInputChange = (
    field: keyof BranchForm,
    value: string
  ) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const openCreateModal = () => {
    setEditingBranch(null);
    setForm(emptyForm);
    setError("");
    setModalOpen(true);
  };

  const openEditModal = (branch: Branch) => {
    setEditingBranch(branch);

    setForm({
      name: branch.name,
      code: branch.code,
      address: branch.address || "",
      city: branch.city || "",
      state: branch.state || "",
      phone: branch.phone || "",
      email: branch.email || "",
    });

    setError("");
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;

    setModalOpen(false);
    setEditingBranch(null);
    setForm(emptyForm);
    setError("");
  };

  // ======================================
  // CREATE / UPDATE BRANCH
  // ======================================

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.name.trim()) {
      setError("Branch name is required.");
      return;
    }

    if (!form.code.trim()) {
      setError("Branch code is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const isEditing = Boolean(editingBranch);

      const endpoint = isEditing
        ? `/api/admin/branches/${editingBranch!.id}`
        : "/api/admin/branches";

      const response = await fetch(endpoint, {
        method: isEditing ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          ...form,
          code: form.code.trim().toUpperCase(),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to save branch.");
      }

      setModalOpen(false);
      setEditingBranch(null);
      setForm(emptyForm);

      setSuccess(
        isEditing
          ? "Branch updated successfully."
          : "Branch created successfully."
      );

      await fetchBranches();
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

  // ======================================
  // ACTIVATE / DEACTIVATE
  // ======================================

  const toggleStatus = async (branch: Branch) => {
    const action = branch.isActive ? "deactivate" : "activate";

    if (
      !window.confirm(
        `Are you sure you want to ${action} ${branch.name}?`
      )
    ) {
      return;
    }

    try {
      setError("");
      setSuccess("");

      const response = await fetch(
        `/api/admin/branches/${branch.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            isActive: !branch.isActive,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Status update failed.");
      }

      setSuccess(result.message || "Branch status updated.");
      await fetchBranches();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update branch."
      );
    }
  };

  // ======================================
  // DELETE BRANCH
  // ======================================

  const deleteBranch = async (branch: Branch) => {
    if (branch._count.staff > 0) {
      setError(
        "This branch has assigned staff. Deactivate it instead."
      );
      return;
    }

    if (
      !window.confirm(
        `Permanently delete branch "${branch.name}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      setError("");
      setSuccess("");

      const response = await fetch(
        `/api/admin/branches/${branch.id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Delete failed.");
      }

      setSuccess("Branch deleted successfully.");
      await fetchBranches();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete branch."
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F3ED] px-4 py-6 text-[#2B1B14] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-7">

        {/* HEADER */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#A76535]">
              BrewBites / Organization
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              Branch Management
            </h1>

            <p className="mt-2 text-sm text-[#80695B]">
              Manage your coffee shop locations, contact details and branch status.
            </p>
          </div>

          <button
            onClick={openCreateModal}
            className="rounded-xl bg-[#754426] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2B1B14]"
          >
            + Add Branch
          </button>
        </div>

        {/* FEEDBACK */}
        {error && !modalOpen && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <span>{error}</span>
            <button
              onClick={() => setError("")}
              className="font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {success && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            <span>{success}</span>
            <button
              onClick={() => setSuccess("")}
              className="font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* SUMMARY */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SummaryCard
            title="Total Branches"
            value={summary.totalBranches}
            description="All registered locations"
            icon="▤"
          />

          <SummaryCard
            title="Active Branches"
            value={summary.activeBranches}
            description="Currently operational"
            icon="✓"
          />

          <SummaryCard
            title="Inactive Branches"
            value={summary.inactiveBranches}
            description="Deactivated locations"
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
              placeholder="Search branch name, code, city, phone or email..."
              className="rounded-xl border border-[#EADED4] px-4 py-3 text-sm outline-none focus:border-[#A76535] focus:ring-2 focus:ring-[#A76535]/10"
            />

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="rounded-xl border border-[#EADED4] bg-white px-4 py-3 text-sm outline-none focus:border-[#A76535]"
            >
              <option value="ALL">All Branches</option>
              <option value="ACTIVE">Active Branches</option>
              <option value="INACTIVE">Inactive Branches</option>
            </select>
          </div>
        </section>

        {/* BRANCH TABLE */}
        <section className="overflow-hidden rounded-2xl border border-[#EADED4] bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-2 border-b border-[#EADED4] px-5 py-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-bold">All Branches</h2>
              <p className="mt-1 text-sm text-[#80695B]">
                {branches.length} branches found
              </p>
            </div>

            <button
              onClick={() => void fetchBranches()}
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
          ) : branches.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F8F3ED] text-2xl">
                ☕
              </div>

              <h3 className="mt-4 font-bold">
                No branches found
              </h3>

              <p className="mt-2 text-sm text-[#80695B]">
                Add your first branch to start managing multiple locations.
              </p>

              <button
                onClick={openCreateModal}
                className="mt-4 rounded-lg bg-[#754426] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2B1B14]"
              >
                + Add Branch
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left">
                <thead className="bg-[#FDF9F5] text-xs uppercase tracking-wider text-[#80695B]">
                  <tr>
                    <th className="px-5 py-4">Branch</th>
                    <th className="px-5 py-4">Branch Code</th>
                    <th className="px-5 py-4">Contact Details</th>
                    <th className="px-5 py-4">Location</th>
                    <th className="px-5 py-4">Staff</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#F0E8E0]">
                  {branches.map((branch) => (
                    <tr
                      key={branch.id}
                      className="transition hover:bg-[#FDF9F5]"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F8F3ED] font-bold text-[#754426]">
                            {branch.name.charAt(0).toUpperCase()}
                          </div>

                          <div>
                            <p className="font-semibold">
                              {branch.name}
                            </p>
                            <p className="mt-1 text-xs text-[#80695B]">
                              Added{" "}
                              {new Date(branch.createdAt).toLocaleDateString("en-IN")}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-lg bg-[#F8F3ED] px-3 py-1.5 text-xs font-bold tracking-wide text-[#754426]">
                          {branch.code}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm">
                          {branch.email || "No email"}
                        </p>
                        <p className="mt-1 text-xs text-[#80695B]">
                          {branch.phone || "No phone"}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-sm text-[#80695B]">
                        {[branch.city, branch.state]
                          .filter(Boolean)
                          .join(", ") || "—"}
                        {branch.address && (
                          <p className="mt-1 max-w-48 truncate text-xs">
                            {branch.address}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span className="font-semibold tabular-nums">
                          {branch._count.staff}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                            branch.isActive
                              ? "border-green-200 bg-green-50 text-green-700"
                              : "border-gray-200 bg-gray-100 text-gray-600"
                          }`}
                        >
                          {branch.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(branch)}
                            title="Edit branch"
                            className="rounded-lg border border-[#EADED4] px-3 py-2 text-xs font-semibold hover:bg-[#F8F3ED]"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => void toggleStatus(branch)}
                            title={branch.isActive ? "Deactivate" : "Activate"}
                            className="rounded-lg border border-[#EADED4] px-3 py-2 text-xs font-semibold hover:bg-[#F8F3ED]"
                          >
                            {branch.isActive ? "Disable" : "Enable"}
                          </button>

                          <button
                            onClick={() => void deleteBranch(branch)}
                            disabled={branch._count.staff > 0}
                            title={
                              branch._count.staff > 0
                                ? "Cannot delete branch with assigned staff"
                                : "Delete branch"
                            }
                            className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
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
              if (event.target === event.currentTarget) closeModal();
            }}
          >
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#EADED4] bg-white px-6 py-5">
                <div>
                  <h2 className="text-xl font-bold">
                    {editingBranch ? "Edit Branch" : "Add New Branch"}
                  </h2>

                  <p className="mt-1 text-sm text-[#80695B]">
                    Enter branch location and contact details.
                  </p>
                </div>

                <button
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-lg px-3 py-2 text-xl text-[#80695B] hover:bg-[#F8F3ED]"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5 p-6">
                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <div>
                  <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-[#A76535]">
                    Branch Information
                  </h3>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      label="Branch Name *"
                      value={form.name}
                      onChange={(value) => handleInputChange("name", value)}
                      placeholder="e.g. BrewBites Patna"
                      required
                    />

                    <FormField
                      label="Branch Code *"
                      value={form.code}
                      onChange={(value) => handleInputChange("code", value.toUpperCase())}
                      placeholder="e.g. PAT-001"
                      required
                    />

                    <FormField
                      label="Email Address"
                      type="email"
                      value={form.email}
                      onChange={(value) => handleInputChange("email", value)}
                      placeholder="branch@example.com"
                    />

                    <FormField
                      label="Phone Number"
                      type="tel"
                      value={form.phone}
                      onChange={(value) => handleInputChange("phone", value)}
                      placeholder="9876543210"
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
                      onChange={(value) => handleInputChange("address", value)}
                      placeholder="Street / Area"
                    />

                    <FormField
                      label="City"
                      value={form.city}
                      onChange={(value) => handleInputChange("city", value)}
                      placeholder="Patna"
                    />

                    <FormField
                      label="State"
                      value={form.state}
                      onChange={(value) => handleInputChange("state", value)}
                      placeholder="Bihar"
                    />
                  </div>
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
                      : editingBranch
                        ? "Update Branch"
                        : "Create Branch"}
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

// ==========================================
// SUMMARY CARD
// ==========================================

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
        <p className="text-sm font-medium text-[#80695B]">{title}</p>

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

// ==========================================
// FORM FIELD
// ==========================================

function FormField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
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
        maxLength={500}
        className="w-full rounded-xl border border-[#EADED4] px-4 py-3 text-sm outline-none transition focus:border-[#A76535] focus:ring-2 focus:ring-[#A76535]/10"
      />
    </div>
  );
}
