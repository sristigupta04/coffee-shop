
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Download,
  RefreshCw,
  TrendingUp,
  Users,
  UserCheck,
  UserX,
  Clock3,
  AlertCircle,
  BarChart3,
  Loader2,
  FileSpreadsheet,
} from "lucide-react";

type ReportRecord = {
  staffId: string;
  staffName: string;
  department?: string | null;
  designation?: string | null;
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  leave: number;
  totalDays: number;
};

type DailyRecord = {
  date: string;
  present: number;
  absent: number;
  late: number;
};

type AttendanceReport = {
  summary: {
    totalStaff: number;
    present: number;
    absent: number;
    late: number;
    halfDay: number;
    leave: number;
    attendanceRate: number;
  };
  staffRecords: ReportRecord[];
  dailyTrend: DailyRecord[];
};

const initialReport: AttendanceReport = {
  summary: {
    totalStaff: 0,
    present: 0,
    absent: 0,
    late: 0,
    halfDay: 0,
    leave: 0,
    attendanceRate: 0,
  },
  staffRecords: [],
  dailyTrend: [],
};

const getMonthStart = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
};

const getToday = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(new Date());

const formatDate = (date: string) =>
  new Date(`${date.slice(0, 10)}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  bg,
  suffix = "",
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  bg: string;
  suffix?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {value}{suffix}
          </p>
        </div>
        <div className={`rounded-xl p-3 ${bg}`}>
          <Icon size={22} className={color} />
        </div>
      </div>
    </div>
  );
}

export default function AttendanceReportsPage() {
  const [report, setReport] = useState<AttendanceReport>(initialReport);
  const [startDate, setStartDate] = useState(getMonthStart());
  const [endDate, setEndDate] = useState(getToday());
  const [department, setDepartment] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
      });

      if (department !== "ALL") {
        params.set("department", department);
      }

      const response = await fetch(
        `/api/admin/attendance/reports?${params.toString()}`,
        { cache: "no-store" }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to load attendance report");
      }

      setReport({
        summary: result.summary ?? initialReport.summary,
        staffRecords: result.staffRecords ?? [],
        dailyTrend: result.dailyTrend ?? [],
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, department]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const departments = useMemo(
    () =>
      Array.from(
        new Set(
          report.staffRecords
            .map((record) => record.department)
            .filter((value): value is string => Boolean(value))
        )
      ),
    [report.staffRecords]
  );

  const filteredRecords = useMemo(
    () =>
      report.staffRecords.filter((record) =>
        `${record.staffName} ${record.designation ?? ""} ${
          record.department ?? ""
        }`
          .toLowerCase()
          .includes(search.toLowerCase())
      ),
    [report.staffRecords, search]
  );

  const maxDailyValue = Math.max(
    1,
    ...report.dailyTrend.map((day) => day.present + day.absent + day.late)
  );

  const exportCSV = () => {
    const headers = [
      "Staff Name",
      "Department",
      "Designation",
      "Present",
      "Absent",
      "Late",
      "Half Day",
      "Leave",
      "Total Days",
    ];

    const rows = filteredRecords.map((record) => [
      record.staffName,
      record.department ?? "",
      record.designation ?? "",
      record.present,
      record.absent,
      record.late,
      record.halfDay,
      record.leave,
      record.totalDays,
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `attendance-report-${startDate}-to-${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const attendanceRate = Math.min(
    100,
    Math.max(0, report.summary.attendanceRate)
  );

  return (
    <div className="min-h-screen space-y-6 bg-slate-50 p-4 md:p-7">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
            <span>Staff Management</span>
            <span>/</span>
            <span>Attendance</span>
            <span>/</span>
            <span className="font-medium text-blue-700">Reports</span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
            Attendance Reports
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Analyze staff attendance, punctuality and monthly performance.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={fetchReport}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>

          <button
            onClick={exportCSV}
            disabled={filteredRecords.length === 0}
            className="flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
          >
            <Download size={17} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <CalendarDays size={19} className="text-blue-700" />
          <h2 className="font-semibold text-slate-900">
            Report Filters
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
              max={getToday()}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold text-slate-500">
              Department
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-500"
            >
              <option value="ALL">All Departments</option>
              {departments.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={fetchReport}
              disabled={loading}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Staff"
          value={report.summary.totalStaff}
          icon={Users}
          color="text-blue-700"
          bg="bg-blue-50"
        />
        <StatCard
          title="Present Records"
          value={report.summary.present}
          icon={UserCheck}
          color="text-emerald-700"
          bg="bg-emerald-50"
        />
        <StatCard
          title="Absent Records"
          value={report.summary.absent}
          icon={UserX}
          color="text-red-700"
          bg="bg-red-50"
        />
        <StatCard
          title="Late Arrivals"
          value={report.summary.late}
          icon={Clock3}
          color="text-amber-700"
          bg="bg-amber-50"
        />
      </div>

      {/* Attendance rate and breakdown */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-1">
          <div className="flex items-center gap-2">
            <TrendingUp size={19} className="text-blue-700" />
            <h2 className="font-bold text-slate-900">
              Attendance Rate
            </h2>
          </div>

          <div className="mt-7 flex items-center justify-center">
            <div
              className="relative flex h-40 w-40 items-center justify-center rounded-full"
              style={{
                background: `conic-gradient(#2563eb ${attendanceRate}%, #e2e8f0 ${attendanceRate}% 100%)`,
              }}
            >
              <div className="flex h-32 w-32 flex-col items-center justify-center rounded-full bg-white">
                <span className="text-3xl font-bold text-slate-900">
                  {attendanceRate.toFixed(1)}%
                </span>
                <span className="text-xs text-slate-500">Attendance</span>
              </div>
            </div>
          </div>

          <p className="mt-5 text-center text-sm text-slate-500">
            Overall attendance rate for the selected period.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-2">
          <div className="flex items-center gap-2">
            <BarChart3 size={19} className="text-blue-700" />
            <h2 className="font-bold text-slate-900">
              Attendance Breakdown
            </h2>
          </div>

          <div className="mt-6 space-y-5">
            {[
              {
                label: "Present",
                value: report.summary.present,
                color: "bg-emerald-500",
              },
              {
                label: "Absent",
                value: report.summary.absent,
                color: "bg-red-500",
              },
              {
                label: "Late",
                value: report.summary.late,
                color: "bg-amber-500",
              },
              {
                label: "Half Day",
                value: report.summary.halfDay,
                color: "bg-orange-500",
              },
              {
                label: "Leave",
                value: report.summary.leave,
                color: "bg-blue-500",
              },
            ].map((item) => {
              const total =
                report.summary.present +
                report.summary.absent +
                report.summary.late +
                report.summary.halfDay +
                report.summary.leave;

              const percentage =
                total > 0 ? (item.value / total) * 100 : 0;

              return (
                <div key={item.label}>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="font-medium text-slate-700">
                      {item.label}
                    </span>
                    <span className="text-slate-500">
                      {item.value} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${item.color}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Daily trend */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-6 flex items-center gap-2">
          <BarChart3 size={19} className="text-blue-700" />
          <div>
            <h2 className="font-bold text-slate-900">
              Daily Attendance Trend
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Daily present, absent and late records.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex h-52 items-center justify-center">
            <Loader2 className="animate-spin text-blue-700" size={28} />
          </div>
        ) : report.dailyTrend.length === 0 ? (
          <div className="flex h-52 flex-col items-center justify-center text-center">
            <BarChart3 size={34} className="text-slate-300" />
            <p className="mt-3 font-semibold text-slate-700">
              No trend data available
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Attendance data will appear here once records are available.
            </p>
          </div>
        ) : (
          <>
            <div className="flex h-56 items-end gap-2 overflow-x-auto border-b border-slate-100 pb-2">
              {report.dailyTrend.map((day) => {
                const total = day.present + day.absent + day.late;
                const height = Math.max(
                  4,
                  (total / maxDailyValue) * 100
                );

                const presentHeight =
                  total > 0 ? (day.present / total) * height : 0;
                const absentHeight =
                  total > 0 ? (day.absent / total) * height : 0;
                const lateHeight =
                  total > 0 ? (day.late / total) * height : 0;

                return (
                  <div
                    key={day.date}
                    className="flex min-w-8 flex-1 flex-col items-center justify-end gap-2"
                    title={`${day.date}: ${day.present} present, ${day.absent} absent, ${day.late} late`}
                  >
                    <div
                      className="flex w-full max-w-9 flex-col justify-end overflow-hidden rounded-t-md"
                      style={{ height: `${height}%` }}
                    >
                      <div
                        className="bg-amber-400"
                        style={{ height: `${(lateHeight / height) * 100}%` }}
                      />
                      <div
                        className="bg-red-400"
                        style={{ height: `${(absentHeight / height) * 100}%` }}
                      />
                      <div
                        className="bg-emerald-500"
                        style={{ height: `${(presentHeight / height) * 100}%` }}
                      />
                    </div>
                    <span className="whitespace-nowrap text-[10px] text-slate-500">
                      {formatDate(day.date)}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex flex-wrap gap-5">
              {[
                ["Present", "bg-emerald-500"],
                ["Absent", "bg-red-400"],
                ["Late", "bg-amber-400"],
              ].map(([label, color]) => (
                <div key={label} className="flex items-center gap-2">
                  <span className={`h-3 w-3 rounded-sm ${color}`} />
                  <span className="text-xs text-slate-600">{label}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Staff performance table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-bold text-slate-900">
              Staff Attendance Summary
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Individual staff attendance for the selected period.
            </p>
          </div>

          <input
            type="search"
            placeholder="Search staff..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500 sm:w-64"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-4">Staff</th>
                <th className="px-5 py-4">Department</th>
                <th className="px-5 py-4">Present</th>
                <th className="px-5 py-4">Absent</th>
                <th className="px-5 py-4">Late</th>
                <th className="px-5 py-4">Half Day</th>
                <th className="px-5 py-4">Leave</th>
                <th className="px-5 py-4">Total Days</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <Loader2
                      className="mx-auto animate-spin text-blue-700"
                      size={26}
                    />
                    <p className="mt-2 text-sm text-slate-500">
                      Loading report...
                    </p>
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="py-12 text-center text-sm text-slate-500"
                  >
                    No staff records found for this period.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record.staffId} className="hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-800">
                        {record.staffName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {record.designation || "Staff"}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">
                      {record.department || "--"}
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-emerald-700">
                      {record.present}
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-red-600">
                      {record.absent}
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-amber-700">
                      {record.late}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-700">
                      {record.halfDay}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-700">
                      {record.leave}
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-slate-800">
                      {record.totalDays}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-200 px-5 py-4 text-xs text-slate-500">
          Showing {filteredRecords.length} staff records · Timezone: Asia/Kolkata
        </div>
      </div>
    </div>
  );
}
