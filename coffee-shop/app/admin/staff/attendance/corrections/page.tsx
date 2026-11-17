
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  RefreshCw,
  CalendarDays,
  Pencil,
  X,
  Clock,
  ClipboardEdit,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Filter,
} from "lucide-react";

type AttendanceStatus =
  | "PRESENT"
  | "ABSENT"
  | "LATE"
  | "HALF_DAY"
  | "LEAVE"
  | "HOLIDAY"
  | "WEEKLY_OFF";

type AttendanceRecord = {
  id: string;
  staffId: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: AttendanceStatus;
  notes: string | null;
  updatedAt?: string;
  staff?: {
    name: string;
    designation?: string;
    department?: string;
  };
};

const statuses: AttendanceStatus[] = [
  "PRESENT",
  "ABSENT",
  "LATE",
  "HALF_DAY",
  "LEAVE",
  "HOLIDAY",
  "WEEKLY_OFF",
];

const todayIndia = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(new Date());

const formatDate = (date: string) =>
  new Date(`${date.slice(0, 10)}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const toLocalTimeInput = (value: string | null) => {
  if (!value) return "";

  const date = new Date(value);

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
};

const statusClasses: Record<AttendanceStatus, string> = {
  PRESENT: "bg-emerald-50 text-emerald-700",
  ABSENT: "bg-red-50 text-red-700",
  LATE: "bg-amber-50 text-amber-700",
  HALF_DAY: "bg-orange-50 text-orange-700",
  LEAVE: "bg-blue-50 text-blue-700",
  HOLIDAY: "bg-purple-50 text-purple-700",
  WEEKLY_OFF: "bg-slate-100 text-slate-700",
};

export default function AttendanceCorrectionsPage() {
  const today = todayIndia();

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [selected, setSelected] = useState<AttendanceRecord | null>(null);

  const [editStatus, setEditStatus] =
    useState<AttendanceStatus>("PRESENT");
  const [editCheckIn, setEditCheckIn] = useState("");
  const [editCheckOut, setEditCheckOut] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
      });

      const response = await fetch(
        `/api/admin/attendance?${params.toString()}`,
        { cache: "no-store" }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to load attendance");
      }

      const data = Array.isArray(result)
        ? result
        : result.data ?? result.attendance ?? [];

      setRecords(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const staffName = record.staff?.name ?? "";
      const department = record.staff?.department ?? "";

      const matchesSearch = `${staffName} ${department}`
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "ALL" || record.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [records, search, statusFilter]);

  const openEditor = (record: AttendanceRecord) => {
    setSelected(record);
    setEditStatus(record.status);
    setEditCheckIn(toLocalTimeInput(record.checkIn));
    setEditCheckOut(toLocalTimeInput(record.checkOut));
    setEditNotes(record.notes ?? "");
    setError("");
    setSuccess("");
  };

  const saveCorrection = async () => {
    if (!selected) return;

    if (editCheckIn && editCheckOut && editCheckOut < editCheckIn) {
      setError("Check-out time cannot be earlier than check-in time.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `/api/admin/attendance/${selected.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: editStatus,
            checkIn: editCheckIn || null,
            checkOut: editCheckOut || null,
            notes: editNotes,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to update attendance");
      }

      setSelected(null);
      setSuccess("Attendance correction saved successfully.");
      await fetchRecords();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to save correction"
      );
    } finally {
      setSaving(false);
    }
  };

  const stats = {
    total: records.length,
    late: records.filter((item) => item.status === "LATE").length,
    absent: records.filter((item) => item.status === "ABSENT").length,
    corrected: records.filter(
      (item) => item.updatedAt && item.updatedAt !== item.date
    ).length,
  };

  return (
    <div className="min-h-screen space-y-6 bg-slate-50 p-4 md:p-7">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
            <span>Staff Management</span>
            <span>/</span>
            <span>Attendance</span>
            <span>/</span>
            <span className="font-medium text-blue-700">Corrections</span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
            Attendance Corrections
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Review and correct staff attendance records.
          </p>
        </div>

        <button
          onClick={fetchRecords}
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
        >
          <RefreshCw
            size={17}
            className={loading ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          <CheckCircle2 size={18} />
          {success}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Total Records",
            value: stats.total,
            icon: ClipboardEdit,
            color: "text-blue-700",
            bg: "bg-blue-50",
          },
          {
            label: "Late Records",
            value: stats.late,
            icon: Clock,
            color: "text-amber-700",
            bg: "bg-amber-50",
          },
          {
            label: "Absent Records",
            value: stats.absent,
            icon: AlertCircle,
            color: "text-red-700",
            bg: "bg-red-50",
          },
          {
            label: "Updated Records",
            value: stats.corrected,
            icon: CheckCircle2,
            color: "text-emerald-700",
            bg: "bg-emerald-50",
          },
        ].map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.label}
              className="rounded-2xl border border-slate-200 bg-white p-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">{item.label}</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {item.value}
                  </p>
                </div>
                <div className={`rounded-xl p-3 ${item.bg}`}>
                  <Icon size={22} className={item.color} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <Filter size={18} className="text-blue-700" />
          <h2 className="font-bold text-slate-900">Filter Records</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="mb-2 block text-xs font-semibold text-slate-500">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              max={endDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold text-slate-500">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              min={startDate}
              max={today}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold text-slate-500">
              Attendance Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-500"
            >
              <option value="ALL">All Statuses</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold text-slate-500">
              Search Staff
            </label>
            <div className="relative">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name..."
                className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3 text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Records table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-col justify-between gap-2 border-b border-slate-200 p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-bold text-slate-900">
              Attendance Records
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Select a record to make a correction.
            </p>
          </div>

          <span className="text-sm text-slate-500">
            {filteredRecords.length} records found
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-4">Staff Member</th>
                <th className="px-5 py-4">Date</th>
                <th className="px-5 py-4">Check In</th>
                <th className="px-5 py-4">Check Out</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Notes</th>
                <th className="px-5 py-4 text-right">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center">
                    <Loader2
                      className="mx-auto animate-spin text-blue-700"
                      size={28}
                    />
                    <p className="mt-3 text-sm text-slate-500">
                      Loading attendance records...
                    </p>
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-14 text-center text-sm text-slate-500"
                  >
                    No attendance records found.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-800">
                        {record.staff?.name ?? "Unknown Staff"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {record.staff?.designation ?? "Staff"}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-600">
                      {formatDate(record.date)}
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-700">
                      {record.checkIn
                        ? toLocalTimeInput(record.checkIn)
                        : "--"}
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-700">
                      {record.checkOut
                        ? toLocalTimeInput(record.checkOut)
                        : "--"}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses[record.status]}`}
                      >
                        {record.status.replace("_", " ")}
                      </span>
                    </td>

                    <td className="max-w-40 truncate px-5 py-4 text-sm text-slate-500">
                      {record.notes || "--"}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => openEditor(record)}
                        className="inline-flex items-center gap-2 rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                      >
                        <Pencil size={14} />
                        Correct
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Correction Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Correct Attendance
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {selected.staff?.name ?? "Staff"} ·{" "}
                  {formatDate(selected.date)}
                </p>
              </div>

              <button
                onClick={() => setSelected(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Attendance Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) =>
                    setEditStatus(e.target.value as AttendanceStatus)
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-500"
                >
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Check In (IST)
                  </label>
                  <input
                    type="time"
                    value={editCheckIn}
                    onChange={(e) => setEditCheckIn(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Check Out (IST)
                  </label>
                  <input
                    type="time"
                    value={editCheckOut}
                    onChange={(e) => setEditCheckOut(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Correction Reason / Notes
                </label>
                <textarea
                  rows={4}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Explain why this attendance record is being corrected..."
                  className="w-full resize-none rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                Make sure the corrected times and status are accurate before
                saving. The current API updates the attendance record directly.
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setSelected(null)}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                onClick={saveCorrection}
                disabled={saving}
                className="flex-1 rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Correction"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
