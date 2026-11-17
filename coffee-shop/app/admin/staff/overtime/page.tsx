
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Clock3,
  Search,
  RefreshCw,
  Save,
  Users,
  Timer,
  CalendarDays,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

type OvertimeRecord = {
  id: string;
  staffId: string;
  date: string;
  overtimeMinutes: number;
  workingMinutes: number;
  breakMinutes: number;
  status: string;
  staff: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    designation?: string | null;
    department?: string | null;
  };
};

type Summary = {
  totalRecords: number;
  totalOvertimeMinutes: number;
  overtimeRecords: number;
  totalStaff: number;
};

function todayIndia() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return `${hours}h ${remaining}m`;
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

export default function OvertimePage() {
  const today = todayIndia();

  const [records, setRecords] = useState<OvertimeRecord[]>([]);
  const [summary, setSummary] = useState<Summary>({
    totalRecords: 0,
    totalOvertimeMinutes: 0,
    overtimeRecords: 0,
    totalStaff: 0,
  });

  const [from, setFrom] = useState(today.slice(0, 7) + "-01");
  const [to, setTo] = useState(today);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const params = new URLSearchParams({
        from,
        to,
        search,
      });

      const response = await fetch(
        `/api/admin/staff/overtime?${params.toString()}`
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to load overtime records");
      }

      setRecords(data.records || []);
      setSummary(data.summary || {
        totalRecords: 0,
        totalOvertimeMinutes: 0,
        overtimeRecords: 0,
        totalStaff: 0,
      });
      setEdits({});
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }, [from, to, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRecords();
    }, 300);

    return () => clearTimeout(timer);
  }, [fetchRecords]);

  const totalHours = useMemo(
    () => (summary.totalOvertimeMinutes / 60).toFixed(1),
    [summary.totalOvertimeMinutes]
  );

  async function saveOvertime(record: OvertimeRecord) {
    const value = edits[record.id];

    if (value === undefined) return;

    const minutes = Number(value);

    if (!Number.isInteger(minutes) || minutes < 0 || minutes > 1440) {
      setError("Overtime must be between 0 and 1440 minutes.");
      return;
    }

    try {
      setSavingId(record.id);
      setError("");
      setSuccess("");

      const response = await fetch("/api/admin/staff/overtime", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attendanceId: record.id,
          overtimeMinutes: minutes,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to update overtime");
      }

      setSuccess(`Overtime updated for ${record.staff.name}.`);
      await fetchRecords();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update overtime"
      );
    } finally {
      setSavingId("");
    }
  }

  return (
    <div className="min-h-screen bg-[#fffaf3] p-4 md:p-7">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-bold tracking-[0.2em] text-[#A76535]">
              BREWB​ITES ADMIN
            </p>
            <h1 className="mt-2 text-2xl font-bold text-[#2B1B14] md:text-3xl">
              Overtime Management
            </h1>
            <p className="mt-1 text-sm text-[#806b5d]">
              View and manage staff overtime recorded in attendance.
            </p>
          </div>

          <button
            onClick={fetchRecords}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#e8d9ca] bg-white px-4 py-2.5 text-sm font-semibold text-[#754426] hover:bg-[#faf2e9] disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            <CheckCircle2 size={18} />
            {success}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Attendance Records"
            value={summary.totalRecords}
            icon={<CalendarDays size={21} />}
          />
          <SummaryCard
            title="Staff with Overtime"
            value={summary.overtimeRecords}
            icon={<Users size={21} />}
          />
          <SummaryCard
            title="Total Overtime"
            value={`${totalHours} hrs`}
            icon={<Clock3 size={21} />}
          />
          <SummaryCard
            title="Unique Staff"
            value={summary.totalStaff}
            icon={<Timer size={21} />}
          />
        </div>

        <div className="rounded-2xl border border-[#eadfd3] bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="xl:col-span-2">
              <label className="mb-1.5 block text-xs font-semibold text-[#806b5d]">
                Search staff
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-[#eadfd3] px-3">
                <Search size={17} className="text-[#a58b78]" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Name, email, phone or designation"
                  className="w-full bg-transparent py-3 text-sm outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#806b5d]">
                From date
              </label>
              <input
                type="date"
                value={from}
                max={to}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full rounded-xl border border-[#eadfd3] px-3 py-3 text-sm outline-none focus:border-[#A76535]"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#806b5d]">
                To date
              </label>
              <input
                type="date"
                value={to}
                min={from}
                max={today}
                onChange={(e) => setTo(e.target.value)}
                className="w-full rounded-xl border border-[#eadfd3] px-3 py-3 text-sm outline-none focus:border-[#A76535]"
              />
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#eadfd3] bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-2 border-b border-[#f0e7df] px-5 py-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-bold text-[#2B1B14]">Overtime Records</h2>
              <p className="text-xs text-[#927d6e]">
                {records.length} records found
              </p>
            </div>
            <span className="text-xs text-[#927d6e]">
              Edit overtime in minutes
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-sm text-[#927d6e]">
              Loading overtime records...
            </div>
          ) : records.length === 0 ? (
            <div className="p-12 text-center">
              <Clock3 className="mx-auto mb-3 text-[#c5aa94]" size={32} />
              <p className="font-semibold text-[#2B1B14]">
                No attendance records found
              </p>
              <p className="mt-1 text-sm text-[#927d6e]">
                Try changing the date range or search term.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-[#faf5ef] text-xs uppercase tracking-wide text-[#806b5d]">
                  <tr>
                    <th className="px-5 py-3">Staff</th>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Working time</th>
                    <th className="px-5 py-3">Overtime</th>
                    <th className="px-5 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0e7df]">
                  {records.map((record) => {
                    const currentValue =
                      edits[record.id] ?? String(record.overtimeMinutes || 0);

                    const changed =
                      Number(currentValue) !== record.overtimeMinutes;

                    return (
                      <tr key={record.id} className="hover:bg-[#fffdf9]">
                        <td className="px-5 py-4">
                          <p className="font-semibold text-[#2B1B14]">
                            {record.staff.name}
                          </p>
                          <p className="mt-0.5 text-xs text-[#927d6e]">
                            {record.staff.designation || "Staff"}
                            {record.staff.department
                              ? ` · ${record.staff.department}`
                              : ""}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-[#594638]">
                          {formatDate(record.date)}
                        </td>

                        <td className="px-5 py-4">
                          <span className="rounded-full bg-[#f5eee6] px-2.5 py-1 text-xs font-semibold text-[#754426]">
                            {record.status.replaceAll("_", " ")}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-[#594638]">
                          {formatMinutes(record.workingMinutes || 0)}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              max="1440"
                              step="1"
                              value={currentValue}
                              onChange={(e) =>
                                setEdits((prev) => ({
                                  ...prev,
                                  [record.id]: e.target.value,
                                }))
                              }
                              className="w-24 rounded-lg border border-[#eadfd3] px-2.5 py-2 outline-none focus:border-[#A76535]"
                            />
                            <span className="text-xs text-[#927d6e]">min</span>
                          </div>
                          <p className="mt-1 text-xs text-[#927d6e]">
                            {formatMinutes(Number(currentValue) || 0)}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <button
                            onClick={() => saveOvertime(record)}
                            disabled={!changed || savingId === record.id}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#754426] px-3 py-2 text-xs font-semibold text-white hover:bg-[#5e351d] disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Save size={14} />
                            {savingId === record.id ? "Saving..." : "Save"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#eadfd3] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-[#806b5d]">{title}</p>
        <div className="rounded-xl bg-[#f7eee5] p-2.5 text-[#A76535]">
          {icon}
        </div>
      </div>
      <p className="mt-3 text-2xl font-bold text-[#2B1B14]">{value}</p>
    </div>
  );
}
