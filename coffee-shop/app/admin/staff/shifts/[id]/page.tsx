"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

type ShiftAssignment = {
  id: string;
  date: string;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED" | "MISSED";
  notes?: string | null;
  staff: {
    id: string;
    name: string;
    email: string;
    designation?: string | null;
    department?: string | null;
  };
};

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
  assignments: ShiftAssignment[];
  _count?: {
    assignments: number;
  };
  createdAt: string;
  updatedAt: string;
};

const statusStyles: Record<string, string> = {
  SCHEDULED: "bg-blue-50 text-blue-700",
  COMPLETED: "bg-green-50 text-green-700",
  CANCELLED: "bg-gray-100 text-gray-600",
  MISSED: "bg-red-50 text-red-700",
};

export default function ShiftDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [shift, setShift] = useState<Shift | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchShift = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError("");

      const response = await fetch(`/api/admin/staff/shifts/${id}`);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load shift details.");
      }

      setShift(data.shift ?? data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchShift();
  }, [fetchShift]);

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    }).format(new Date(date));
  };

  const formatDateTime = (date: string) => {
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Kolkata",
    }).format(new Date(date));
  };

  const getDuration = () => {
    if (!shift) return "—";

    const [startHour, startMinute] = shift.startTime.split(":").map(Number);
    const [endHour, endMinute] = shift.endTime.split(":").map(Number);

    let start = startHour * 60 + startMinute;
    let end = endHour * 60 + endMinute;

    if (shift.isOvernight || end <= start) {
      end += 24 * 60;
    }

    const totalMinutes = end - start - shift.breakDurationMinutes;

    if (totalMinutes <= 0) return "Invalid duration";

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${hours}h ${minutes > 0 ? `${minutes}m` : ""}`.trim();
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="mt-3 text-sm text-gray-500">
            Loading shift details...
          </p>
        </div>
      </div>
    );
  }

  if (error || !shift) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <h2 className="font-semibold text-red-700">
          Unable to load shift
        </h2>
        <p className="mt-1 text-sm text-red-600">
          {error || "Shift not found."}
        </p>

        <div className="mt-4 flex gap-3">
          <button
            onClick={fetchShift}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Retry
          </button>

          <Link
            href="/admin/staff/shifts"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
          >
            Back to shifts
          </Link>
        </div>
      </div>
    );
  }

  const assignments = shift.assignments ?? [];

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
            <Link
              href="/admin/staff"
              className="hover:text-blue-600"
            >
              Staff
            </Link>
            <span>/</span>
            <Link
              href="/admin/staff/shifts"
              className="hover:text-blue-600"
            >
              Shifts
            </Link>
            <span>/</span>
            <span className="text-gray-800">Details</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900">
            {shift.name}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            View shift configuration and staff assignments.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/staff/shifts/assignments"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Manage Assignments
          </Link>

          <Link
            href={`/admin/staff/shifts/${shift.id}/edit`}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Edit Shift
          </Link>
        </div>
      </div>

      {/* Status and overview */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Shift Status</p>
          <div className="mt-3">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                shift.isActive
                  ? "bg-green-50 text-green-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {shift.isActive ? "Active" : "Inactive"}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Assigned Staff</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {shift._count?.assignments ?? assignments.length}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Working Duration</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {getDuration()}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Excluding break time
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Branch</p>
          <p className="mt-2 text-lg font-semibold text-gray-900">
            {shift.branch?.name || "All branches"}
          </p>
        </div>
      </div>

      {/* Shift configuration */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-gray-900">
          Shift Configuration
        </h2>

        <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-sm text-gray-500">Start Time</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {shift.startTime}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">End Time</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {shift.endTime}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Overnight Shift</p>
            <p className="mt-1 font-medium text-gray-900">
              {shift.isOvernight ? "Yes" : "No"}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Break Duration</p>
            <p className="mt-1 font-medium text-gray-900">
              {shift.breakDurationMinutes} minutes
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Grace Period</p>
            <p className="mt-1 font-medium text-gray-900">
              {shift.gracePeriodMinutes} minutes
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Description</p>
            <p className="mt-1 font-medium text-gray-900">
              {shift.description || "No description"}
            </p>
          </div>
        </div>
      </section>

      {/* Assignments */}
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-col justify-between gap-3 border-b border-gray-200 p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Staff Assignments
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Recent staff members assigned to this shift.
            </p>
          </div>

          <Link
            href="/admin/staff/shifts/assignments"
            className="text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            Manage all assignments →
          </Link>
        </div>

        {assignments.length === 0 ? (
          <div className="p-10 text-center">
            <p className="font-medium text-gray-700">
              No staff assigned yet
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Assign staff members to this shift to see them here.
            </p>
            <Link
              href="/admin/staff/shifts/assignments"
              className="mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Assign Staff
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Staff Member</th>
                  <th className="px-5 py-3 font-semibold">Department</th>
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Notes</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {assignments.map((assignment) => (
                  <tr key={assignment.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/staff/${assignment.staff.id}`}
                        className="font-semibold text-gray-900 hover:text-blue-600"
                      >
                        {assignment.staff.name}
                      </Link>
                      <p className="mt-1 text-xs text-gray-500">
                        {assignment.staff.email}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {assignment.staff.department ||
                        assignment.staff.designation ||
                        "—"}
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {formatDate(assignment.date)}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          statusStyles[assignment.status] ||
                          "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {assignment.status.replaceAll("_", " ")}
                      </span>
                    </td>

                    <td className="max-w-[180px] truncate px-5 py-4 text-gray-500">
                      {assignment.notes || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Metadata */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-900">
          Record Information
        </h2>

        <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-gray-500">Created</p>
            <p className="mt-1 font-medium text-gray-800">
              {formatDateTime(shift.createdAt)}
            </p>
          </div>

          <div>
            <p className="text-gray-500">Last Updated</p>
            <p className="mt-1 font-medium text-gray-800">
              {formatDateTime(shift.updatedAt)}
            </p>
          </div>
        </div>
      </section>

      <div>
        <button
          onClick={() => router.push("/admin/staff/shifts")}
          className="text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          ← Back to all shifts
        </button>
      </div>
    </div>
  );
}