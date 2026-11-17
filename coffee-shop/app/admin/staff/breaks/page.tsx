"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type BreakType = "TEA" | "LUNCH" | "PERSONAL" | "OTHER";

type BreakRecord = {
  id: string;
  staffId: string;
  attendanceId?: string | null;
  type: BreakType;
  startAt: string;
  endAt?: string | null;
  durationMinutes: number;
  notes?: string | null;
  staff: {
    id: string;
    name: string;
    email?: string | null;
    designation?: string | null;
    department?: string | null;
  };
};

type StaffOption = {
  id: string;
  name: string;
  designation?: string | null;
  department?: string | null;
};

const breakLabels: Record<BreakType, string> = {
  TEA: "Tea Break",
  LUNCH: "Lunch Break",
  PERSONAL: "Personal",
  OTHER: "Other",
};

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));

const formatDuration = (minutes: number) =>
  `${Math.floor(minutes / 60)}h ${minutes % 60}m`;

export default function StaffBreaksPage() {
  const [records, setRecords] = useState<BreakRecord[]>([]);
  const [staffList, setStaffList] = useState<StaffOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("");

  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    staffId: "",
    type: "LUNCH" as BreakType,
    startAt: "",
    endAt: "",
    notes: "",
  });

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const query = new URLSearchParams();
      if (typeFilter !== "ALL") query.set("type", typeFilter);
      if (dateFilter) query.set("date", dateFilter);

      const response = await fetch(
        `/api/admin/staff/breaks?${query.toString()}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load break records.");
      }

      setRecords(data.breaks ?? data.records ?? data.data ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }, [typeFilter, dateFilter]);

  const fetchStaff = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/staff?status=active");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load staff.");
      }

      const staff = data.staff ?? data.data ?? [];
      setStaffList(staff);

      setForm((current) => ({
        ...current,
        staffId: current.staffId || staff[0]?.id || "",
      }));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load staff."
      );
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();

    return records.filter((record) => {
      if (!query) return true;

      return (
        record.staff.name.toLowerCase().includes(query) ||
        (record.staff.email || "").toLowerCase().includes(query) ||
        (record.staff.department || "").toLowerCase().includes(query)
      );
    });
  }, [records, search]);

  const stats = useMemo(() => {
    const totalMinutes = records.reduce(
      (sum, record) => sum + record.durationMinutes,
      0
    );

    const ongoing = records.filter(
      (record) => !record.endAt
    ).length;

    const tea = records.filter((record) => record.type === "TEA").length;
    const lunch = records.filter(
      (record) => record.type === "LUNCH"
    ).length;

    return {
      total: records.length,
      totalMinutes,
      ongoing,
      tea,
      lunch,
    };
  }, [records]);

  const resetForm = () => {
    setForm({
      staffId: staffList[0]?.id || "",
      type: "LUNCH",
      startAt: "",
      endAt: "",
      notes: "",
    });
  };

  const createBreak = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.staffId || !form.startAt) {
      setError("Please select staff and break start time.");
      return;
    }

    if (form.endAt && new Date(form.endAt) <= new Date(form.startAt)) {
      setError("Break end time must be after start time.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await fetch("/api/admin/staff/breaks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: form.staffId,
          type: form.type,
          startAt: new Date(form.startAt).toISOString(),
          endAt: form.endAt
            ? new Date(form.endAt).toISOString()
            : null,
          notes: form.notes.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to create break record.");
      }

      setShowModal(false);
      resetForm();
      setSuccess("Break record added successfully.");
      await fetchRecords();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to create break."
      );
    } finally {
      setSaving(false);
    }
  };

  const endBreak = async (record: BreakRecord) => {
    const confirmed = window.confirm(
      `End ${record.staff.name}'s break now?`
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      const response = await fetch(
        `/api/admin/staff/breaks/${record.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "END" }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to end break.");
      }

      setSuccess("Break ended successfully.");
      await fetchRecords();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to end break."
      );
    }
  };

  const exportCSV = () => {
    const headers = [
      "Staff",
      "Department",
      "Type",
      "Start",
      "End",
      "Duration Minutes",
      "Duration",
      "Notes",
    ];

    const rows = filteredRecords.map((record) => [
      record.staff.name,
      record.staff.department || "",
      breakLabels[record.type],
      formatDateTime(record.startAt),
      record.endAt ? formatDateTime(record.endAt) : "Ongoing",
      record.durationMinutes,
      formatDuration(record.durationMinutes),
      record.notes || "",
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
    link.download = `staff-breaks-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
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
            <span className="text-gray-800">Breaks</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900">
            Staff Break Management
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Monitor tea breaks, lunch breaks and staff break durations.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={exportCSV}
            disabled={!filteredRecords.length}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Export CSV
          </button>

          <button
            onClick={() => {
              setError("");
              setShowModal(true);
            }}
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            + Add Break
          </button>
        </div>
      </div>

      {/* Feedback */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[
          { label: "Total Break Records", value: stats.total },
          { label: "Total Break Time", value: formatDuration(stats.totalMinutes) },
          { label: "Ongoing Breaks", value: stats.ongoing },
          { label: "Lunch Breaks", value: stats.lunch },
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
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Search Staff
            </label>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search staff name or email..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Break Type
            </label>
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
            >
              <option value="ALL">All break types</option>
              <option value="TEA">Tea Break</option>
              <option value="LUNCH">Lunch Break</option>
              <option value="PERSONAL">Personal</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Date
            </label>
            <input
              type="date"
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
            />
          </div>
        </div>
      </section>

      {/* Records */}
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 p-5">
          <div>
            <h2 className="font-semibold text-gray-900">Break Records</h2>
            <p className="mt-1 text-sm text-gray-500">
              {filteredRecords.length} record(s) found
            </p>
          </div>

          <button
            onClick={fetchRecords}
            disabled={loading}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-gray-500">
            Loading break records...
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-medium text-gray-700">
              No break records found
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Add a break record to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Staff</th>
                  <th className="px-5 py-3 font-semibold">Break Type</th>
                  <th className="px-5 py-3 font-semibold">Start Time</th>
                  <th className="px-5 py-3 font-semibold">End Time</th>
                  <th className="px-5 py-3 font-semibold">Duration</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/staff/${record.staff.id}`}
                        className="font-semibold text-gray-900 hover:text-blue-600"
                      >
                        {record.staff.name}
                      </Link>
                      <p className="mt-1 text-xs text-gray-500">
                        {record.staff.designation ||
                          record.staff.department ||
                          record.staff.email}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-gray-700">
                      {breakLabels[record.type]}
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap text-gray-600">
                      {formatDateTime(record.startAt)}
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap text-gray-600">
                      {record.endAt
                        ? formatDateTime(record.endAt)
                        : "—"}
                    </td>

                    <td className="px-5 py-4 font-semibold text-gray-900">
                      {formatDuration(record.durationMinutes)}
                    </td>

                    <td className="px-5 py-4">
                      {record.endAt ? (
                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
                          Completed
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                          Ongoing
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      {!record.endAt && (
                        <button
                          onClick={() => endBreak(record)}
                          className="font-medium text-blue-600 hover:text-blue-800"
                        >
                          End Break
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Add Break Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <form
            onSubmit={createBreak}
            className="my-8 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
          >
            <h2 className="text-xl font-bold text-gray-900">
              Add Staff Break
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Record a staff member&apos;s break.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Staff Member *
                </label>
                <select
                  required
                  value={form.staffId}
                  onChange={(event) =>
                    setForm({ ...form, staffId: event.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                >
                  <option value="">Select staff</option>
                  {staffList.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.name}
                      {staff.designation ? ` — ${staff.designation}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Break Type *
                </label>
                <select
                  value={form.type}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      type: event.target.value as BreakType,
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                >
                  <option value="TEA">Tea Break</option>
                  <option value="LUNCH">Lunch Break</option>
                  <option value="PERSONAL">Personal</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Start Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={form.startAt}
                  onChange={(event) =>
                    setForm({ ...form, startAt: event.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  End Time
                </label>
                <input
                  type="datetime-local"
                  min={form.startAt || undefined}
                  value={form.endAt}
                  onChange={(event) =>
                    setForm({ ...form, endAt: event.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Leave empty if the break is still ongoing.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Notes
                </label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(event) =>
                    setForm({ ...form, notes: event.target.value })
                  }
                  placeholder="Optional notes..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving || !staffList.length}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Break"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}