"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Staff = {
  id: string;
  name: string;
  email?: string | null;
  department?: string | null;
  designation?: string | null;
  isActive: boolean;
};

type Branch = {
  id: string;
  name: string;
};

type WeeklyOff = {
  id: string;
  dayOfWeek: number;
  isActive: boolean;
  staffId?: string | null;
  branchId?: string | null;
  branch?: Branch | null;
  createdAt?: string;
  updatedAt?: string;
};

type WeeklyOffForm = {
  dayOfWeek: number;
  staffId: string;
  branchId: string;
  isActive: boolean;
};

const days = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const emptyForm: WeeklyOffForm = {
  dayOfWeek: 0,
  staffId: "",
  branchId: "",
  isActive: true,
};

const getDayName = (day: number) =>
  days.find((item) => item.value === day)?.label ?? "Unknown";

export default function WeeklyOffsPage() {
  const [rules, setRules] = useState<WeeklyOff[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [dayFilter, setDayFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState<WeeklyOff | null>(null);
  const [form, setForm] = useState<WeeklyOffForm>(emptyForm);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [rulesResponse, staffResponse, branchResponse] =
        await Promise.all([
          fetch("/api/admin/staff/weekly-offs"),
          fetch("/api/admin/staff"),
          fetch("/api/admin/branches"),
        ]);

      const [rulesData, staffData, branchData] = await Promise.all([
        rulesResponse.json(),
        staffResponse.json(),
        branchResponse.json(),
      ]);

      if (!rulesResponse.ok) {
        throw new Error(
          rulesData.message || "Unable to load weekly off rules."
        );
      }

      if (!staffResponse.ok) {
        throw new Error(staffData.message || "Unable to load staff.");
      }

      if (!branchResponse.ok) {
        throw new Error(branchData.message || "Unable to load branches.");
      }

      setRules(rulesData.weeklyOffs ?? rulesData.rules ?? rulesData.data ?? []);

      setStaff(
        (staffData.staff ?? staffData.data ?? []).filter(
          (member: Staff) => member.isActive
        )
      );

      setBranches(branchData.branches ?? branchData.data ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredRules = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rules.filter((rule) => {
      const matchesDay =
        dayFilter === "ALL" || rule.dayOfWeek === Number(dayFilter);

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && rule.isActive) ||
        (statusFilter === "INACTIVE" && !rule.isActive);

      const staffName =
        staff.find((member) => member.id === rule.staffId)?.name || "";

      const branchName = rule.branch?.name || "";

      const scopeName = rule.staffId
        ? staffName
        : branchName || "All branches";

      const matchesSearch =
        !query ||
        scopeName.toLowerCase().includes(query) ||
        getDayName(rule.dayOfWeek).toLowerCase().includes(query);

      return matchesDay && matchesStatus && matchesSearch;
    });
  }, [rules, staff, search, dayFilter, statusFilter]);

  const stats = useMemo(
    () => ({
      total: rules.length,
      active: rules.filter((rule) => rule.isActive).length,
      inactive: rules.filter((rule) => !rule.isActive).length,
      staffSpecific: rules.filter((rule) => Boolean(rule.staffId)).length,
    }),
    [rules]
  );

  const updateField = <K extends keyof WeeklyOffForm>(
    field: K,
    value: WeeklyOffForm[K]
  ) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const openCreateModal = () => {
    setEditingRule(null);
    setForm(emptyForm);
    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const openEditModal = (rule: WeeklyOff) => {
    setEditingRule(rule);

    setForm({
      dayOfWeek: rule.dayOfWeek,
      staffId: rule.staffId || "",
      branchId: rule.branchId || "",
      isActive: rule.isActive,
    });

    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const saveRule = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (
      form.staffId &&
      form.branchId
    ) {
      setError("Select either a staff member or a branch, not both.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const url = editingRule
        ? `/api/admin/staff/weekly-offs/${editingRule.id}`
        : "/api/admin/staff/weekly-offs";

      const response = await fetch(url, {
        method: editingRule ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dayOfWeek: form.dayOfWeek,
          staffId: form.staffId || null,
          branchId: form.branchId || null,
          isActive: form.isActive,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to save weekly off.");
      }

      setShowModal(false);
      setEditingRule(null);
      setForm(emptyForm);

      setSuccess(
        editingRule
          ? "Weekly off updated successfully."
          : "Weekly off created successfully."
      );

      await fetchData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to save weekly off."
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (rule: WeeklyOff) => {
    try {
      setError("");
      setSuccess("");

      const response = await fetch(
        `/api/admin/staff/weekly-offs/${rule.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            isActive: !rule.isActive,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to update weekly off.");
      }

      setSuccess("Weekly off status updated.");
      await fetchData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update status."
      );
    }
  };

  const deleteRule = async (rule: WeeklyOff) => {
    const confirmed = window.confirm(
      `Delete ${getDayName(rule.dayOfWeek)} weekly off rule?`
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      const response = await fetch(
        `/api/admin/staff/weekly-offs/${rule.id}`,
        { method: "DELETE" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to delete rule.");
      }

      setSuccess("Weekly off rule deleted successfully.");
      await fetchData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to delete rule."
      );
    }
  };

  const getScopeName = (rule: WeeklyOff) => {
    if (rule.staffId) {
      const member = staff.find((item) => item.id === rule.staffId);
      return member?.name || "Staff member";
    }

    if (rule.branchId) {
      return rule.branch?.name ||
        branches.find((item) => item.id === rule.branchId)?.name ||
        "Branch";
    }

    return "All branches";
  };

  const exportCSV = () => {
    const headers = ["Day", "Scope", "Status"];

    const rows = filteredRules.map((rule) => [
      getDayName(rule.dayOfWeek),
      getScopeName(rule),
      rule.isActive ? "Active" : "Inactive",
    ]);

    const escapeCSV = (value: unknown) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCSV).join(","))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "staff-weekly-offs.csv";
    link.click();

    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
            <Link href="/admin/staff" className="hover:text-blue-600">
              Staff
            </Link>
            <span>/</span>
            <span className="text-gray-800">Weekly Offs</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900">
            Weekly Off Management
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Configure weekly holidays for staff and branches.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/staff/holidays"
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Holidays
          </Link>

          <button
            onClick={exportCSV}
            disabled={filteredRules.length === 0}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Export CSV
          </button>

          <button
            onClick={openCreateModal}
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            + Add Weekly Off
          </button>
        </div>
      </div>

      {/* Feedback */}
      {error && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button onClick={() => setError("")}>×</button>
        </div>
      )}

      {success && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          <span>{success}</span>
          <button onClick={() => setSuccess("")}>×</button>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[
          { label: "Total Rules", value: stats.total },
          { label: "Active Rules", value: stats.active },
          { label: "Inactive Rules", value: stats.inactive },
          { label: "Staff-Specific Rules", value: stats.staffSpecific },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-gray-200 bg-white p-5"
          >
            <p className="text-sm text-gray-500">{item.label}</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Search
            </label>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Staff, branch or day..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Day
            </label>
            <select
              value={dayFilter}
              onChange={(event) => setDayFilter(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
            >
              <option value="ALL">All days</option>
              {days.map((day) => (
                <option key={day.value} value={day.value}>
                  {day.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
            >
              <option value="ALL">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>
      </section>

      {/* Weekly off table */}
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 p-5">
          <div>
            <h2 className="font-semibold text-gray-900">
              Weekly Off Rules
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {filteredRules.length} rule(s) found
            </p>
          </div>

          <button
            onClick={fetchData}
            disabled={loading}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-gray-500">
            Loading weekly off rules...
          </div>
        ) : filteredRules.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-medium text-gray-700">
              No weekly off rules found
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Create a rule to configure staff weekly holidays.
            </p>
            <button
              onClick={openCreateModal}
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Add Weekly Off
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Day</th>
                  <th className="px-5 py-3 font-semibold">Applies To</th>
                  <th className="px-5 py-3 font-semibold">Scope</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredRules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4 font-semibold text-gray-900">
                      {getDayName(rule.dayOfWeek)}
                    </td>

                    <td className="px-5 py-4 text-gray-700">
                      {rule.staffId
                        ? "Individual Staff"
                        : rule.branchId
                          ? "Branch"
                          : "All Branches"}
                    </td>

                    <td className="px-5 py-4 text-gray-700">
                      {getScopeName(rule)}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          rule.isActive
                            ? "bg-green-50 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {rule.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => openEditModal(rule)}
                          className="font-medium text-blue-600 hover:text-blue-800"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => toggleStatus(rule)}
                          className="font-medium text-gray-600 hover:text-gray-900"
                        >
                          {rule.isActive ? "Deactivate" : "Activate"}
                        </button>

                        <button
                          onClick={() => deleteRule(rule)}
                          className="font-medium text-red-600 hover:text-red-800"
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

      {/* Create / Edit modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <form
            onSubmit={saveRule}
            className="my-8 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {editingRule ? "Edit Weekly Off" : "Add Weekly Off"}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Choose the day and its applicable scope.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-2xl text-gray-400 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Day of Week *
                </label>
                <select
                  required
                  value={form.dayOfWeek}
                  onChange={(event) =>
                    updateField("dayOfWeek", Number(event.target.value))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                >
                  {days.map((day) => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Apply To
                </label>
                <select
                  value={
                    form.staffId
                      ? "STAFF"
                      : form.branchId
                        ? "BRANCH"
                        : "ALL"
                  }
                  onChange={(event) => {
                    const value = event.target.value;

                    setForm((previous) => ({
                      ...previous,
                      staffId: "",
                      branchId: "",
                    }));

                    if (value === "ALL") {
                      setForm((previous) => ({
                        ...previous,
                        staffId: "",
                        branchId: "",
                      }));
                    }
                  }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                >
                  <option value="ALL">All branches</option>
                  <option value="BRANCH">Specific branch</option>
                  <option value="STAFF">Individual staff member</option>
                </select>
              </div>

              {!form.staffId && !form.branchId && (
                <p className="rounded-lg bg-blue-50 p-3 text-xs text-blue-700">
                  Current scope: All branches. Select a specific branch or
                  staff member below if needed.
                </p>
              )}

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Specific Branch
                </label>
                <select
                  value={form.branchId}
                  onChange={(event) => {
                    updateField("branchId", event.target.value);
                    updateField("staffId", "");
                  }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                >
                  <option value="">All branches</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Individual Staff Member
                </label>
                <select
                  value={form.staffId}
                  onChange={(event) => {
                    updateField("staffId", event.target.value);
                    updateField("branchId", "");
                  }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                >
                  <option value="">No individual staff selected</option>
                  {staff.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name} —{" "}
                      {member.designation || member.department || member.email}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) =>
                    updateField("isActive", event.target.checked)
                  }
                  className="h-4 w-4 rounded border-gray-300 text-blue-600"
                />
                <span className="text-sm font-medium text-gray-700">
                  Active weekly off rule
                </span>
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editingRule
                    ? "Save Changes"
                    : "Create Rule"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}