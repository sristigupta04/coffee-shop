
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Search,
  RefreshCw,
  Clock3,
  Users,
  UserCheck,
  UserX,
  AlertCircle,
  CheckCircle2,
  LogIn,
  LogOut,
  ClipboardCheck,
  X,
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

type Staff = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  designation?: string;
  department?: string | null;
};

type Attendance = {
  id: string;
  staffId: string;
  date: string;
  checkIn?: string | null;
  checkOut?: string | null;
  status: AttendanceStatus;
  notes?: string | null;
  staff?: Staff;
};

const STATUS_OPTIONS: AttendanceStatus[] = [
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

const formatTime = (value?: string | null) => {
  if (!value) return "--";
  return new Date(value).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDate = (value: string) =>
  new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const statusStyle: Record<AttendanceStatus, string> = {
  PRESENT: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ABSENT: "bg-red-50 text-red-700 border-red-200",
  LATE: "bg-amber-50 text-amber-700 border-amber-200",
  HALF_DAY: "bg-orange-50 text-orange-700 border-orange-200",
  LEAVE: "bg-blue-50 text-blue-700 border-blue-200",
  HOLIDAY: "bg-purple-50 text-purple-700 border-purple-200",
  WEEKLY_OFF: "bg-slate-100 text-slate-700 border-slate-200",
};

function StatusBadge({ status }: { status: AttendanceStatus }) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusStyle[status]}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

export default function AttendancePage() {
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [date, setDate] = useState(todayIndia());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [showModal, setShowModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState("");
  const [selectedStatus, setSelectedStatus] =
    useState<AttendanceStatus>("PRESENT");
  const [notes, setNotes] = useState("");

  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [attendanceRes, staffRes] = await Promise.all([
        fetch(`/api/admin/attendance?date=${date}`, {
          cache: "no-store",
        }),
        fetch("/api/admin/staff", {
          cache: "no-store",
        }),
      ]);

      const attendanceData = await attendanceRes.json();
      const staffData = await staffRes.json();

      if (!attendanceRes.ok) {
        throw new Error(
          attendanceData.error || "Unable to load attendance"
        );
      }

      if (!staffRes.ok) {
        throw new Error(staffData.error || "Unable to load staff");
      }

      const records = Array.isArray(attendanceData)
        ? attendanceData
        : attendanceData.data ?? attendanceData.attendance ?? [];

      const staff = Array.isArray(staffData)
        ? staffData
        : staffData.data ?? staffData.staff ?? [];

      setAttendance(records);
      setStaffList(staff);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const filteredAttendance = useMemo(() => {
    return attendance.filter((record) => {
      const name = record.staff?.name ?? "";
      const designation = record.staff?.designation ?? "";

      const matchesSearch = `${name} ${designation}`
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "ALL" || record.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [attendance, search, statusFilter]);

  const summary = useMemo(() => {
    return {
      total: staffList.filter((staff) => staff.id).length,
      present: attendance.filter(
        (item) => item.status === "PRESENT"
      ).length,
      absent: attendance.filter(
        (item) => item.status === "ABSENT"
      ).length,
      late: attendance.filter(
        (item) => item.status === "LATE"
      ).length,
      halfDay: attendance.filter(
        (item) => item.status === "HALF_DAY"
      ).length,
    };
  }, [attendance, staffList]);

  const handleMarkAttendance = async () => {
    if (!selectedStaff) {
      setError("Please select a staff member");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/admin/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: selectedStaff,
          date,
          status: selectedStatus,
          notes,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to save attendance");
      }

      setSuccess("Attendance saved successfully");
      setShowModal(false);
      setSelectedStaff("");
      setSelectedStatus("PRESENT");
      setNotes("");

      await fetchAttendance();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to save attendance"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCheckIn = async (staffId: string) => {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        "/api/admin/attendance/check-in",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ staffId }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Check-in failed");
      }

      setSuccess("Check-in recorded successfully");
      await fetchAttendance();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Check-in failed"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCheckOut = async (staffId: string) => {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        "/api/admin/attendance/check-out",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ staffId }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Check-out failed");
      }

      setSuccess("Check-out recorded successfully");
      await fetchAttendance();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Check-out failed"
      );
    } finally {
      setSaving(false);
    }
  };

  const activeStaff = staffList.filter((staff) => staff.id);

  return (
    <div className="min-h-screen space-y-6 bg-slate-50 p-4 md:p-7">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
            <span>Staff Management</span>
            <span>/</span>
            <span className="font-medium text-blue-700">Attendance</span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
            Attendance Management
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Monitor daily attendance, working hours and staff presence.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={fetchAttendance}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
          >
            <ClipboardCheck size={17} />
            Mark Attendance
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <span className="flex items-center gap-2">
            <AlertCircle size={17} />
            {error}
          </span>
          <button onClick={() => setError("")}>
            <X size={17} />
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          <span className="flex items-center gap-2">
            <CheckCircle2 size={17} />
            {success}
          </span>
          <button onClick={() => setSuccess("")}>
            <X size={17} />
          </button>
        </div>
      )}

      {/* Date and timezone */}
      <div className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold text-slate-800">
            Attendance Date
          </p>
          <p className="mt-1 text-xs text-slate-500">
            All attendance dates follow Asia/Kolkata timezone.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
          <CalendarDays size={18} className="text-blue-700" />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-transparent text-sm font-medium text-slate-700 outline-none"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          {
            label: "Total Staff",
            value: summary.total,
            icon: Users,
            color: "text-blue-700",
            bg: "bg-blue-50",
          },
          {
            label: "Present",
            value: summary.present,
            icon: UserCheck,
            color: "text-emerald-700",
            bg: "bg-emerald-50",
          },
          {
            label: "Absent",
            value: summary.absent,
            icon: UserX,
            color: "text-red-700",
            bg: "bg-red-50",
          },
          {
            label: "Late Arrivals",
            value: summary.late,
            icon: Clock3,
            color: "text-amber-700",
            bg: "bg-amber-50",
          },
          {
            label: "Half Day",
            value: summary.halfDay,
            icon: AlertCircle,
            color: "text-orange-700",
            bg: "bg-orange-50",
          },
        ].map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">
                    {card.label}
                  </p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {card.value}
                  </p>
                </div>

                <div className={`rounded-xl p-3 ${card.bg}`}>
                  <Icon size={22} className={card.color} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Attendance Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Daily Attendance
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {formatDate(date)} · {attendance.length} attendance records
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search staff..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500 sm:w-56"
              />
            </div>

            <div className="relative">
              <Filter
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full appearance-none rounded-xl border border-slate-200 py-2.5 pl-9 pr-8 text-sm outline-none focus:border-blue-500 sm:w-44"
              >
                <option value="ALL">All Status</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-4 font-semibold">Staff Member</th>
                <th className="px-5 py-4 font-semibold">Check In</th>
                <th className="px-5 py-4 font-semibold">Check Out</th>
                <th className="px-5 py-4 font-semibold">Status</th>
                <th className="px-5 py-4 font-semibold">Notes</th>
                <th className="px-5 py-4 text-right font-semibold">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <Loader2
                      className="mx-auto animate-spin text-blue-700"
                      size={28}
                    />
                    <p className="mt-3 text-sm text-slate-500">
                      Loading attendance...
                    </p>
                  </td>
                </tr>
              ) : filteredAttendance.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <ClipboardCheck
                      size={34}
                      className="mx-auto text-slate-300"
                    />
                    <p className="mt-3 font-semibold text-slate-700">
                      No attendance records found
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Change filters or mark attendance for this date.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredAttendance.map((record) => (
                  <tr
                    key={record.id}
                    className="transition hover:bg-slate-50"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 font-bold text-blue-700">
                          {record.staff?.name?.charAt(0)?.toUpperCase() ??
                            "S"}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">
                            {record.staff?.name ?? "Unknown Staff"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {record.staff?.designation ?? "Staff"}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-sm font-medium text-slate-700">
                      {formatTime(record.checkIn)}
                    </td>

                    <td className="px-5 py-4 text-sm font-medium text-slate-700">
                      {formatTime(record.checkOut)}
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge status={record.status} />
                    </td>

                    <td className="max-w-48 truncate px-5 py-4 text-sm text-slate-500">
                      {record.notes || "--"}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        {!record.checkIn && (
                          <button
                            onClick={() => handleCheckIn(record.staffId)}
                            disabled={saving}
                            title="Check In"
                            className="rounded-lg border border-emerald-200 p-2 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                          >
                            <LogIn size={16} />
                          </button>
                        )}

                        {record.checkIn && !record.checkOut && (
                          <button
                            onClick={() => handleCheckOut(record.staffId)}
                            disabled={saving}
                            title="Check Out"
                            className="rounded-lg border border-blue-200 p-2 text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                          >
                            <LogOut size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col justify-between gap-2 border-t border-slate-200 px-5 py-4 text-sm text-slate-500 sm:flex-row">
          <span>
            Showing {filteredAttendance.length} of {attendance.length} records
          </span>
          <span>Timezone: Asia/Kolkata (IST)</span>
        </div>
      </div>

      {/* Mark Attendance Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Mark Attendance
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Add or update a staff attendance record.
                </p>
              </div>

              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Attendance Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Select Staff
                </label>
                <select
                  value={selectedStaff}
                  onChange={(e) => setSelectedStaff(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-500"
                >
                  <option value="">Choose staff member</option>
                  {activeStaff.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.name} - {staff.designation || "Staff"}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Attendance Status
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) =>
                    setSelectedStatus(e.target.value as AttendanceStatus)
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-500"
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add attendance remarks..."
                  className="w-full resize-none rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                onClick={handleMarkAttendance}
                disabled={saving || !selectedStaff}
                className="flex-1 rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Attendance"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
