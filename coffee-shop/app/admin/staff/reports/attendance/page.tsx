"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type AttendanceRecord = {
  id: string;
  staffId: string;
  date: string;
  checkIn?: string | null;
  checkOut?: string | null;
  status: string;
  workingMinutes: number;
  overtimeMinutes: number;
  staff: {
    name: string;
    designation: string;
    department?: string | null;
    branch?: { name: string } | null;
  };
};

type Summary = {
  totalRecords: number;
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  attendanceRate: number;
};

const getToday = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(new Date());

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));

const formatTime = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata",
      }).format(new Date(value))
    : "—";

const formatMinutes = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return `${hours}h ${remaining}m`;
};

const statusStyles: Record<string, string> = {
  PRESENT: "bg-green-50 text-green-700",
  ABSENT: "bg-red-50 text-red-700",
  LATE: "bg-orange-50 text-orange-700",
  HALF_DAY: "bg-yellow-50 text-yellow-700",
  LEAVE: "bg-blue-50 text-blue-700",
  HOLIDAY: "bg-purple-50 text-purple-700",
  WEEKLY_OFF: "bg-gray-100 text-gray-600",
};

export default function AttendanceReportPage() {
  const today = getToday();

  const [startDate, setStartDate] = useState(
    today.slice(0, 7) + "-01"
  );
  const [endDate, setEndDate] = useState(today);
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<Summary>({
    totalRecords: 0,
    present: 0,
    absent: 0,
    late: 0,
    halfDay: 0,
    attendanceRate: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        startDate,
        endDate,
      });

      if (status !== "ALL") params.set("status", status);

      const response = await fetch(
        `/api/admin/attendance/reports?${params.toString()}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load attendance report.");
      }

      setRecords(data.records ?? data.attendance ?? []);
      setSummary(
        data.summary ?? {
          totalRecords: 0,
          present: 0,
          absent: 0,
          late: 0,
          halfDay: 0,
          attendanceRate: 0,
        }
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, status]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const filteredRecords = records.filter((record) => {
    const query = search.toLowerCase();

    return (
      record.staff.name.toLowerCase().includes(query) ||
      (record.staff.department || "").toLowerCase().includes(query) ||
      record.staff.designation.toLowerCase().includes(query)
    );
  });

  const exportCSV = () => {
    const headers = [
      "Staff",
      "Designation",
      "Department",
      "Branch",
      "Date",
      "Check In",
      "Check Out",
      "Status",
      "Working Hours",
      "Overtime",
    ];

    const rows = filteredRecords.map((record) => [
      record.staff.name,
      record.staff.designation,
      record.staff.department || "",
      record.staff.branch?.name || "",
      formatDate(record.date),
      formatTime(record.checkIn),
      formatTime(record.checkOut),
      record.status,
      formatMinutes(record.workingMinutes),
      formatMinutes(record.overtimeMinutes),
    ]);

    const escapeCSV = (value: string) =>
      `"${String(value).replace(/"/g, '""')}"`;

    const csv = [headers, ...rows]
      .map((row) => row.map((value) => escapeCSV(String(value))).join(","))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `attendance-report-${startDate}-${endDate}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  };

  const stats = [
    { label: "Total Records", value: summary.totalRecords },
    { label: "Present", value: summary.present },
    { label: "Absent", value: summary.absent },
    { label: "Late", value: summary.late },
    { label: "Half Day", value: summary.halfDay },
    {
      label: "Attendance Rate",
      value: `${summary.attendanceRate}%`,
    },
  ];

  return (
    <div className="space-y-6 pb-10">
      <div>
        <Link
          href="/admin/staff/reports"
          className="text-sm text-gray-500 hover:text-blue-600"
        >
          Staff Reports
        </Link>

        <h1 className="mt-2 text-2xl font-bold text-gray-900">
          Attendance Report
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Review staff attendance, working hours and overtime.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="grid gap-4 rounded-xl border border-gray-200 bg-white p-5 md:grid-cols-3">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            max={endDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            min={startDate}
            max={today}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Attendance Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
          >
            <option value="ALL">All Statuses</option>
            <option value="PRESENT">Present</option>
            <option value="ABSENT">Absent</option>
            <option value="LATE">Late</option>
            <option value="HALF_DAY">Half Day</option>
            <option value="LEAVE">Leave</option>
            <option value="HOLIDAY">Holiday</option>
            <option value="WEEKLY_OFF">Weekly Off</option>
          </select>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {stats.map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-gray-200 bg-white p-4"
          >
            <p className="text-sm text-gray-500">{item.label}</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-col justify-between gap-3 border-b border-gray-200 p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-semibold text-gray-900">
              Attendance Records
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {filteredRecords.length} records
            </p>
          </div>

          <button
            onClick={exportCSV}
            disabled={!filteredRecords.length}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Export CSV
          </button>
        </div>

        <div className="border-b border-gray-100 p-4">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search staff or department..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
          />
        </div>

        {loading ? (
          <p className="p-10 text-center text-sm text-gray-500">
            Loading attendance records...
          </p>
        ) : filteredRecords.length === 0 ? (
          <p className="p-10 text-center text-sm text-gray-500">
            No attendance records found for this period.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-5 py-3">Staff</th>
                  <th className="px-5 py-3">Branch</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Check In</th>
                  <th className="px-5 py-3">Check Out</th>
                  <th className="px-5 py-3">Working Hours</th>
                  <th className="px-5 py-3">Overtime</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-900">
                        {record.staff.name}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {record.staff.designation}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {record.staff.branch?.name || "—"}
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap text-gray-600">
                      {formatDate(record.date)}
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {formatTime(record.checkIn)}
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {formatTime(record.checkOut)}
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {formatMinutes(record.workingMinutes)}
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {formatMinutes(record.overtimeMinutes)}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          statusStyles[record.status] ||
                          "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {record.status.replaceAll("_", " ")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}