
"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  CalendarClock,
  Clock3,
  Users,
  Search,
  Plus,
  RefreshCw,
  Pencil,
  Eye,
  Filter,
  AlertCircle,
  Coffee,
  Building2,
  X,
} from "lucide-react";

type Shift = {
  id: string;
  name: string;
  description?: string | null;
  startTime: string;
  endTime: string;
  breakDurationMinutes: number;
  gracePeriodMinutes: number;
  isOvernight: boolean;
  isActive: boolean;
  branch?: {
    id: string;
    name: string;
  } | null;
  _count?: {
    assignments: number;
  };
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

function StatCard({
  title,
  value,
  icon,
  iconClass,
}: {
  title: string;
  value: number;
  icon: ReactNode;
  iconClass: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <div className={`rounded-xl p-3 ${iconClass}`}>{icon}</div>
      </div>
      <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function formatTime(value: string) {
  if (!value) return "—";

  const [hours, minutes] = value.split(":").map(Number);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return value;
  }

  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function calculateDuration(shift: Shift) {
  const [startHour, startMinute] = shift.startTime.split(":").map(Number);
  const [endHour, endMinute] = shift.endTime.split(":").map(Number);

  let start = startHour * 60 + startMinute;
  let end = endHour * 60 + endMinute;

  if (shift.isOvernight && end <= start) {
    end += 24 * 60;
  }

  if (!shift.isOvernight && end <= start) {
    return "Invalid timing";
  }

  const totalMinutes = Math.max(
    0,
    end - start - shift.breakDurationMinutes
  );

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours}h ${minutes}m`;
}

export default function ShiftManagementPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [branchFilter, setBranchFilter] = useState("ALL");

  const fetchShifts = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/admin/staff/shifts");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load shifts.");
      }

      const records = Array.isArray(data)
        ? data
        : data.shifts ?? data.data ?? [];

      setShifts(records);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  const branches = useMemo(() => {
    const unique = new Map<string, string>();

    shifts.forEach((shift) => {
      if (shift.branch) {
        unique.set(shift.branch.id, shift.branch.name);
      }
    });

    return Array.from(unique.entries()).map(([id, name]) => ({
      id,
      name,
    }));
  }, [shifts]);

  const filteredShifts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return shifts.filter((shift) => {
      const matchesSearch =
        !query ||
        shift.name.toLowerCase().includes(query) ||
        shift.description?.toLowerCase().includes(query) ||
        shift.branch?.name.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && shift.isActive) ||
        (statusFilter === "INACTIVE" && !shift.isActive);

      const matchesBranch =
        branchFilter === "ALL" ||
(branchFilter === "UNASSIGNED" && !shift.branch)
        || (shift.branch && shift.branch.id === branchFilter);

      return matchesSearch && matchesStatus && matchesBranch;
    });
  }, [shifts, search, statusFilter, branchFilter]);

  const activeCount = shifts.filter((shift) => shift.isActive).length;
  const inactiveCount = shifts.length - activeCount;

  const totalAssignments = shifts.reduce(
    (total, shift) => total + (shift._count?.assignments ?? 0),
    0
  );

  function clearFilters() {
    setSearch("");
    setStatusFilter("ALL");
    setBranchFilter("ALL");
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-7">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="mb-2 text-sm font-medium text-blue-700">
              Staff Management / Shifts
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
              Shift Management
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Create work shifts and manage staff shift schedules.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={fetchShifts}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>

            <Link
              href="/admin/staff/shifts/create"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
            >
              <Plus className="h-4 w-4" />
              Create Shift
            </Link>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="flex-1">{error}</p>
            <button
              onClick={() => setError("")}
              aria-label="Close error"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Shifts"
            value={shifts.length}
            icon={<CalendarClock className="h-5 w-5" />}
            iconClass="bg-blue-50 text-blue-700"
          />
          <StatCard
            title="Active Shifts"
            value={activeCount}
            icon={<Clock3 className="h-5 w-5" />}
            iconClass="bg-green-50 text-green-700"
          />
          <StatCard
            title="Inactive Shifts"
            value={inactiveCount}
            icon={<Coffee className="h-5 w-5" />}
            iconClass="bg-orange-50 text-orange-700"
          />
          <StatCard
            title="Staff Assignments"
            value={totalAssignments}
            icon={<Users className="h-5 w-5" />}
            iconClass="bg-indigo-50 text-indigo-700"
          />
        </div>

        {/* Filters */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Filter className="h-4 w-4 text-blue-700" />
            <h2 className="font-semibold text-slate-900">
              Search & Filters
            </h2>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search shifts..."
                className={`${inputClass} pl-10`}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={inputClass}
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>

            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className={inputClass}
            >
              <option value="ALL">All Branches</option>
              <option value="UNASSIGNED">Unassigned</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              Showing {filteredShifts.length} of {shifts.length} shifts
            </p>
            <button
              onClick={clearFilters}
              className="text-xs font-semibold text-blue-700 hover:text-blue-900"
            >
              Clear filters
            </button>
          </div>
        </section>

        {/* Shift Cards */}
        {loading ? (
          <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-slate-500">
            <RefreshCw className="h-5 w-5 animate-spin" />
            Loading shifts...
          </div>
        ) : filteredShifts.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-16 text-center shadow-sm">
            <CalendarClock className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <h3 className="font-semibold text-slate-800">No shifts found</h3>
            <p className="mt-1 text-sm text-slate-500">
              Create a shift or change your filters.
            </p>
            <Link
              href="/admin/staff/shifts/create"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
            >
              <Plus className="h-4 w-4" />
              Create First Shift
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredShifts.map((shift) => (
              <article
                key={shift.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between border-b border-slate-100 p-5">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
                      <Clock3 className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        {shift.name}
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        {shift.isOvernight ? "Overnight shift" : "Regular shift"}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      shift.isActive
                        ? "bg-green-50 text-green-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {shift.isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="space-y-4 p-5">
                  {shift.description && (
                    <p className="text-sm text-slate-500">
                      {shift.description}
                    </p>
                  )}

                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs text-slate-500">Start Time</p>
                        <p className="mt-1 text-lg font-bold text-slate-900">
                          {formatTime(shift.startTime)}
                        </p>
                      </div>
                      <div className="text-slate-300">→</div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">End Time</p>
                        <p className="mt-1 text-lg font-bold text-slate-900">
                          {formatTime(shift.endTime)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-slate-100 p-3">
                      <p className="text-xs text-slate-500">Working Duration</p>
                      <p className="mt-1 font-semibold text-slate-800">
                        {calculateDuration(shift)}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-100 p-3">
                      <p className="text-xs text-slate-500">Break Duration</p>
                      <p className="mt-1 font-semibold text-slate-800">
                        {shift.breakDurationMinutes} min
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-100 p-3">
                      <p className="text-xs text-slate-500">Grace Period</p>
                      <p className="mt-1 font-semibold text-slate-800">
                        {shift.gracePeriodMinutes} min
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-100 p-3">
                      <p className="text-xs text-slate-500">Assignments</p>
                      <p className="mt-1 font-semibold text-slate-800">
                        {shift._count?.assignments ?? 0} staff
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Building2 className="h-4 w-4" />
                    {shift.branch?.name || "All branches / Unassigned"}
                  </div>

                  <div className="flex gap-2 border-t border-slate-100 pt-4">
                    <Link
                      href={`/admin/staff/shifts/${shift.id}`}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </Link>

                    <Link
                      href={`/admin/staff/shifts/${shift.id}/edit`}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-700 px-3 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
