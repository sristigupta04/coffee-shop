"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type HolidayType =
  | "PUBLIC"
  | "NATIONAL"
  | "FESTIVAL"
  | "COMPANY"
  | "OPTIONAL";

type Branch = {
  id: string;
  name: string;
};

type Holiday = {
  id: string;
  name: string;
  date: string;
  description?: string | null;
  type: HolidayType;
  isActive: boolean;
  branchId?: string | null;
  branch?: Branch | null;
};

type HolidayForm = {
  name: string;
  date: string;
  description: string;
  type: HolidayType;
  branchId: string;
  isActive: boolean;
};

const emptyForm: HolidayForm = {
  name: "",
  date: "",
  description: "",
  type: "PUBLIC",
  branchId: "",
  isActive: true,
};

const typeStyles: Record<HolidayType, string> = {
  PUBLIC: "bg-blue-50 text-blue-700",
  NATIONAL: "bg-purple-50 text-purple-700",
  FESTIVAL: "bg-amber-50 text-amber-700",
  COMPANY: "bg-green-50 text-green-700",
  OPTIONAL: "bg-gray-100 text-gray-700",
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));

const formatLabel = (value: string) =>
  value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) =>
    char.toUpperCase()
  );

export default function HolidaysPage() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [yearFilter, setYearFilter] = useState(
    String(new Date().getFullYear())
  );

  const [showModal, setShowModal] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [form, setForm] = useState<HolidayForm>(emptyForm);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [holidayResponse, branchResponse] = await Promise.all([
        fetch("/api/admin/staff/holidays"),
        fetch("/api/admin/branches"),
      ]);

      const [holidayData, branchData] = await Promise.all([
        holidayResponse.json(),
        branchResponse.json(),
      ]);

      if (!holidayResponse.ok) {
        throw new Error(
          holidayData.message || "Unable to load holidays."
        );
      }

      if (!branchResponse.ok) {
        throw new Error(
          branchData.message || "Unable to load branches."
        );
      }

      setHolidays(holidayData.holidays ?? holidayData.data ?? []);
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

  const filteredHolidays = useMemo(() => {
    const query = search.trim().toLowerCase();

    return holidays.filter((holiday) => {
      const matchesSearch =
        !query ||
        holiday.name.toLowerCase().includes(query) ||
        (holiday.description || "").toLowerCase().includes(query) ||
        (holiday.branch?.name || "").toLowerCase().includes(query);

      const matchesType =
        typeFilter === "ALL" || holiday.type === typeFilter;

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && holiday.isActive) ||
        (statusFilter === "INACTIVE" && !holiday.isActive);

      const matchesYear =
        yearFilter === "ALL" ||
        new Date(holiday.date).getFullYear() === Number(yearFilter);

      return (
        matchesSearch &&
        matchesType &&
        matchesStatus &&
        matchesYear
      );
    });
  }, [holidays, search, typeFilter, statusFilter, yearFilter]);

  const stats = useMemo(() => {
    const currentYear = new Date().getFullYear();

    return {
      total: holidays.length,
      active: holidays.filter((item) => item.isActive).length,
      upcoming: holidays.filter(
        (item) =>
          item.isActive &&
          new Date(item.date).getTime() >=
            new Date(new Date().setHours(0, 0, 0, 0)).getTime()
      ).length,
      currentYear: holidays.filter(
        (item) => new Date(item.date).getFullYear() === currentYear
      ).length,
    };
  }, [holidays]);

  const updateField = <K extends keyof HolidayForm>(
    field: K,
    value: HolidayForm[K]
  ) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const openCreateModal = () => {
    setEditingHoliday(null);
    setForm(emptyForm);
    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const openEditModal = (holiday: Holiday) => {
    setEditingHoliday(holiday);

    setForm({
      name: holiday.name,
      date: holiday.date.slice(0, 10),
      description: holiday.description || "",
      type: holiday.type,
      branchId: holiday.branchId || "",
      isActive: holiday.isActive,
    });

    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const saveHoliday = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.name.trim() || !form.date) {
      setError("Holiday name and date are required.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const url = editingHoliday
        ? `/api/admin/staff/holidays/${editingHoliday.id}`
        : "/api/admin/staff/holidays";

      const response = await fetch(url, {
        method: editingHoliday ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          date: form.date,
          description: form.description.trim() || null,
          type: form.type,
          branchId: form.branchId || null,
          isActive: form.isActive,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to save holiday.");
      }

      setShowModal(false);
      setEditingHoliday(null);
      setForm(emptyForm);
      setSuccess(
        editingHoliday
          ? "Holiday updated successfully."
          : "Holiday created successfully."
      );

      await fetchData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to save holiday."
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleHolidayStatus = async (holiday: Holiday) => {
    try {
      setError("");
      setSuccess("");

      const response = await fetch(
        `/api/admin/staff/holidays/${holiday.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: !holiday.isActive }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to update holiday status.");
      }

      setSuccess("Holiday status updated.");
      await fetchData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update status."
      );
    }
  };

  const deleteHoliday = async (holiday: Holiday) => {
    const confirmed = window.confirm(
      `Delete "${holiday.name}" holiday? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      const response = await fetch(
        `/api/admin/staff/holidays/${holiday.id}`,
        { method: "DELETE" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to delete holiday.");
      }

      setSuccess("Holiday deleted successfully.");
      await fetchData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to delete holiday."
      );
    }
  };

  const exportCSV = () => {
    const headers = [
      "Holiday Name",
      "Date",
      "Type",
      "Branch",
      "Description",
      "Status",
    ];

    const rows = filteredHolidays.map((holiday) => [
      holiday.name,
      formatDate(holiday.date),
      holiday.type,
      holiday.branch?.name || "All branches",
      holiday.description || "",
      holiday.isActive ? "Active" : "Inactive",
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
    link.download = `staff-holidays-${yearFilter}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  };

  const years = Array.from(
    new Set(holidays.map((item) => new Date(item.date).getFullYear()))
  ).sort((a, b) => b - a);

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
            <span className="text-gray-800">Holidays</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900">
            Holidays Management
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage public, national, festival and company holidays.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/staff/weekly-offs"
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Weekly Offs
          </Link>

          <button
            onClick={exportCSV}
            disabled={filteredHolidays.length === 0}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Export CSV
          </button>

          <button
            onClick={openCreateModal}
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            + Add Holiday
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
          { label: "Total Holidays", value: stats.total },
          { label: "Active Holidays", value: stats.active },
          { label: "Upcoming Holidays", value: stats.upcoming },
          { label: "Current Year", value: stats.currentYear },
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Search
            </label>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Holiday or branch name..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Holiday Type
            </label>
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
            >
              <option value="ALL">All types</option>
              <option value="PUBLIC">Public</option>
              <option value="NATIONAL">National</option>
              <option value="FESTIVAL">Festival</option>
              <option value="COMPANY">Company</option>
              <option value="OPTIONAL">Optional</option>
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

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Year
            </label>
            <select
              value={yearFilter}
              onChange={(event) => setYearFilter(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
            >
              <option value="ALL">All years</option>
              {years.map((year) => (
                <option key={year} value={String(year)}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Holidays table */}
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 p-5">
          <div>
            <h2 className="font-semibold text-gray-900">Holiday Calendar</h2>
            <p className="mt-1 text-sm text-gray-500">
              {filteredHolidays.length} holiday(s) found
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
            Loading holidays...
          </div>
        ) : filteredHolidays.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-medium text-gray-700">
              No holidays found
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Add a holiday or change your filters.
            </p>
            <button
              onClick={openCreateModal}
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Add Holiday
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Holiday</th>
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-5 py-3 font-semibold">Type</th>
                  <th className="px-5 py-3 font-semibold">Branch</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredHolidays.map((holiday) => (
                  <tr key={holiday.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-gray-900">
                        {holiday.name}
                      </p>
                      <p className="mt-1 max-w-[240px] truncate text-xs text-gray-500">
                        {holiday.description || "No description"}
                      </p>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap text-gray-700">
                      {formatDate(holiday.date)}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          typeStyles[holiday.type]
                        }`}
                      >
                        {formatLabel(holiday.type)}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {holiday.branch?.name || "All branches"}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          holiday.isActive
                            ? "bg-green-50 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {holiday.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => openEditModal(holiday)}
                          className="font-medium text-blue-600 hover:text-blue-800"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => toggleHolidayStatus(holiday)}
                          className="font-medium text-gray-600 hover:text-gray-900"
                        >
                          {holiday.isActive ? "Deactivate" : "Activate"}
                        </button>

                        <button
                          onClick={() => deleteHoliday(holiday)}
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
            onSubmit={saveHoliday}
            className="my-8 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {editingHoliday ? "Edit Holiday" : "Add Holiday"}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Configure holiday details and branch.
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
                  Holiday Name *
                </label>
                <input
                  required
                  value={form.name}
                  onChange={(event) =>
                    updateField("name", event.target.value)
                  }
                  placeholder="e.g. Diwali"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Date *
                </label>
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={(event) =>
                    updateField("date", event.target.value)
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Holiday Type *
                </label>
                <select
                  value={form.type}
                  onChange={(event) =>
                    updateField("type", event.target.value as HolidayType)
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                >
                  <option value="PUBLIC">Public</option>
                  <option value="NATIONAL">National</option>
                  <option value="FESTIVAL">Festival</option>
                  <option value="COMPANY">Company</option>
                  <option value="OPTIONAL">Optional</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Branch
                </label>
                <select
                  value={form.branchId}
                  onChange={(event) =>
                    updateField("branchId", event.target.value)
                  }
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
                  Description
                </label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(event) =>
                    updateField("description", event.target.value)
                  }
                  placeholder="Optional holiday details..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                />
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
                  Active holiday
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
                  : editingHoliday
                    ? "Save Changes"
                    : "Create Holiday"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}