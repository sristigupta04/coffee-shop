"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

type LeaveRequest = {
  id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  status: LeaveStatus;
  reason: string;
  staff: {
    id: string;
    name: string;
    department?: string | null;
    designation?: string | null;
  };
};

const statusStyles: Record<LeaveStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800 border-amber-200",
  APPROVED: "bg-green-100 text-green-800 border-green-200",
  REJECTED: "bg-red-100 text-red-800 border-red-200",
  CANCELLED: "bg-gray-100 text-gray-600 border-gray-200",
};

const leaveTypeLabel = (value: string) =>
  value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) =>
    char.toUpperCase()
  );

const getDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const parseLocalDate = (value: string) => {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day);
};

const formatMonth = (date: Date) =>
  new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
  }).format(date);

export default function LeaveCalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const fetchLeaves = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();

      const startDate = getDateKey(new Date(year, month, 1));
      const endDate = getDateKey(new Date(year, month + 1, 0));

      const query = new URLSearchParams({
        startDate,
        endDate,
      });

      if (statusFilter !== "ALL") {
        query.set("status", statusFilter);
      }

      const response = await fetch(
        `/api/admin/staff/leaves?${query.toString()}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load leave calendar.");
      }

      setRequests(data.requests ?? data.data ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }, [currentMonth, statusFilter]);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Monday-first calendar
    const startOffset = (firstDay.getDay() + 6) % 7;
    const totalCells = Math.ceil((startOffset + lastDay.getDate()) / 7) * 7;

    return Array.from({ length: totalCells }, (_, index) => {
      const date = new Date(year, month, index - startOffset + 1);

      return {
        date,
        key: getDateKey(date),
        isCurrentMonth: date.getMonth() === month,
        isToday: getDateKey(date) === getDateKey(new Date()),
      };
    });
  }, [currentMonth]);

  const requestsByDate = useMemo(() => {
    const map = new Map<string, LeaveRequest[]>();

    requests.forEach((request) => {
      const start = parseLocalDate(request.startDate);
      const end = parseLocalDate(request.endDate);

      const cursor = new Date(start);

      while (cursor <= end) {
        const key = getDateKey(cursor);
        const existing = map.get(key) ?? [];

        existing.push(request);
        map.set(key, existing);

        cursor.setDate(cursor.getDate() + 1);
      }
    });

    return map;
  }, [requests]);

  const selectedRequests = selectedDate
    ? requestsByDate.get(selectedDate) ?? []
    : [];

  const monthStats = useMemo(() => {
    return {
      total: requests.length,
      pending: requests.filter((item) => item.status === "PENDING").length,
      approved: requests.filter((item) => item.status === "APPROVED").length,
      rejected: requests.filter((item) => item.status === "REJECTED").length,
    };
  }, [requests]);

  const changeMonth = (direction: number) => {
    setSelectedDate(null);
    setCurrentMonth(
      (previous) =>
        new Date(
          previous.getFullYear(),
          previous.getMonth() + direction,
          1
        )
    );
  };

  const goToToday = () => {
    const now = new Date();
    setSelectedDate(getDateKey(now));
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
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
            <Link
              href="/admin/staff/leaves"
              className="hover:text-blue-600"
            >
              Leaves
            </Link>
            <span>/</span>
            <span className="text-gray-800">Calendar</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900">
            Leave Calendar
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            View staff leave schedules month by month.
          </p>
        </div>

        <Link
          href="/admin/staff/leaves"
          className="rounded-lg border border-gray-300 px-4 py-2.5 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          ← Leave Requests
        </Link>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button onClick={fetchLeaves} className="font-semibold underline">
            Retry
          </button>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[
          { label: "Total Requests", value: monthStats.total },
          { label: "Pending", value: monthStats.pending },
          { label: "Approved", value: monthStats.approved },
          { label: "Rejected", value: monthStats.rejected },
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

      {/* Calendar */}
      <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {formatMonth(currentMonth)}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Select a date to view staff leave requests.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => changeMonth(-1)}
              aria-label="Previous month"
              className="rounded-lg border border-gray-300 px-3 py-2 text-gray-700 hover:bg-gray-50"
            >
              ←
            </button>

            <button
              onClick={goToToday}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Today
            </button>

            <button
              onClick={() => changeMonth(1)}
              aria-label="Next month"
              className="rounded-lg border border-gray-300 px-3 py-2 text-gray-700 hover:bg-gray-50"
            >
              →
            </button>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="ALL">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Legend */}
        <div className="mb-5 flex flex-wrap gap-4 text-xs text-gray-600">
          {[
            ["bg-amber-400", "Pending"],
            ["bg-green-500", "Approved"],
            ["bg-red-500", "Rejected"],
            ["bg-gray-400", "Cancelled"],
          ].map(([color, label]) => (
            <div key={label} className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
              {label}
            </div>
          ))}
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-gray-500">
            Loading calendar...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[650px]">
              <div className="grid grid-cols-7 border-b border-gray-200">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                  (day) => (
                    <div
                      key={day}
                      className="px-2 py-3 text-center text-xs font-semibold uppercase text-gray-500"
                    >
                      {day}
                    </div>
                  )
                )}
              </div>

              <div className="grid grid-cols-7">
                {calendarDays.map((day) => {
                  const dayRequests = requestsByDate.get(day.key) ?? [];
                  const isSelected = selectedDate === day.key;

                  return (
                    <button
                      key={day.key}
                      type="button"
                      onClick={() => setSelectedDate(day.key)}
                      className={`min-h-[112px] border-b border-r border-gray-100 p-2 text-left transition hover:bg-blue-50 ${
                        !day.isCurrentMonth ? "bg-gray-50/70" : "bg-white"
                      } ${isSelected ? "bg-blue-50 ring-2 ring-inset ring-blue-500" : ""}`}
                    >
                      <div className="flex justify-between">
                        <span
                          className={`flex h-7 w-7 items-center justify-center rounded-full text-sm ${
                            day.isToday
                              ? "bg-blue-600 font-bold text-white"
                              : day.isCurrentMonth
                                ? "font-medium text-gray-800"
                                : "text-gray-400"
                          }`}
                        >
                          {day.date.getDate()}
                        </span>

                        {dayRequests.length > 0 && (
                          <span className="text-xs font-semibold text-gray-500">
                            {dayRequests.length}
                          </span>
                        )}
                      </div>

                      <div className="mt-2 space-y-1">
                        {dayRequests.slice(0, 3).map((request) => {
                          const color =
                            request.status === "APPROVED"
                              ? "bg-green-500"
                              : request.status === "PENDING"
                                ? "bg-amber-400"
                                : request.status === "REJECTED"
                                  ? "bg-red-500"
                                  : "bg-gray-400";

                          return (
                            <div
                              key={request.id}
                              className="flex min-w-0 items-center gap-1.5"
                            >
                              <span
                                className={`h-1.5 w-1.5 shrink-0 rounded-full ${color}`}
                              />
                              <span
                                className={`truncate text-[10px] ${
                                  day.isCurrentMonth
                                    ? "text-gray-700"
                                    : "text-gray-400"
                                }`}
                              >
                                {request.staff.name}
                              </span>
                            </div>
                          );
                        })}

                        {dayRequests.length > 3 && (
                          <p className="pl-3 text-[10px] font-medium text-blue-600">
                            +{dayRequests.length - 3} more
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Selected date details */}
      {selectedDate && (
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="flex flex-col justify-between gap-2 border-b border-gray-200 p-5 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Leave Details
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {new Intl.DateTimeFormat("en-IN", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                }).format(parseLocalDate(selectedDate))}
              </p>
            </div>

            <button
              onClick={() => setSelectedDate(null)}
              className="text-sm font-medium text-gray-500 hover:text-gray-800"
            >
              Close
            </button>
          </div>

          {selectedRequests.length === 0 ? (
            <div className="p-10 text-center">
              <p className="font-medium text-gray-700">
                No leave requests on this date
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Select another date to view its leave schedule.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {selectedRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center"
                >
                  <div>
                    <Link
                      href={`/admin/staff/${request.staff.id}`}
                      className="font-semibold text-gray-900 hover:text-blue-600"
                    >
                      {request.staff.name}
                    </Link>

                    <p className="mt-1 text-sm text-gray-500">
                      {request.staff.designation ||
                        request.staff.department ||
                        "Staff"}
                      {" · "}
                      {leaveTypeLabel(request.leaveType)}
                    </p>

                    <p className="mt-1 text-xs text-gray-400">
                      {formatMonth(parseLocalDate(request.startDate))} ·{" "}
                      {request.totalDays} day(s)
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        statusStyles[request.status]
                      }`}
                    >
                      {request.status.replaceAll("_", " ")}
                    </span>

                    <Link
                      href={`/admin/staff/leaves/${request.id}`}
                      className="text-sm font-semibold text-blue-600 hover:text-blue-800"
                    >
                      View Request →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}