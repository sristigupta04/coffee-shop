"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Staff = {
  id: string;
  name: string;
  email: string;
  department?: string | null;
  designation?: string | null;
  isActive: boolean;
};

type Shift = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  isOvernight: boolean;
  isActive: boolean;
  branch?: { id: string; name: string } | null;
};

type AssignmentStatus =
  | "SCHEDULED"
  | "COMPLETED"
  | "CANCELLED"
  | "MISSED";

type Assignment = {
  id: string;
  date: string;
  status: AssignmentStatus;
  notes?: string | null;
  staff: Staff;
  shift: Shift;
};

const statusStyles: Record<AssignmentStatus, string> = {
  SCHEDULED: "bg-blue-50 text-blue-700",
  COMPLETED: "bg-green-50 text-green-700",
  CANCELLED: "bg-gray-100 text-gray-600",
  MISSED: "bg-red-50 text-red-700",
};

const today = () => {
  const date = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );

  return `${values.year}-${values.month}-${values.day}`;
};

export default function ShiftAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [date, setDate] = useState(today());
  const [search, setSearch] = useState("");
  const [shiftFilter, setShiftFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [showModal, setShowModal] = useState(false);
  const [staffId, setStaffId] = useState("");
  const [shiftId, setShiftId] = useState("");
  const [assignmentDate, setAssignmentDate] = useState(today());
  const [notes, setNotes] = useState("");

  const [editingAssignment, setEditingAssignment] =
    useState<Assignment | null>(null);
  const [editStatus, setEditStatus] =
    useState<AssignmentStatus>("SCHEDULED");
  const [editNotes, setEditNotes] = useState("");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [assignmentResponse, staffResponse, shiftResponse] =
        await Promise.all([
          fetch(
            `/api/admin/staff/shift-assignments?date=${encodeURIComponent(date)}`
          ),
          fetch("/api/admin/staff"),
          fetch("/api/admin/staff/shifts"),
        ]);

      const [assignmentData, staffData, shiftData] = await Promise.all([
        assignmentResponse.json(),
        staffResponse.json(),
        shiftResponse.json(),
      ]);

      if (!assignmentResponse.ok) {
        throw new Error(
          assignmentData.message || "Failed to load assignments."
        );
      }

      if (!staffResponse.ok) {
        throw new Error(staffData.message || "Failed to load staff.");
      }

      if (!shiftResponse.ok) {
        throw new Error(shiftData.message || "Failed to load shifts.");
      }

      setAssignments(
        assignmentData.assignments ?? assignmentData.data ?? []
      );

      setStaff(
        (staffData.staff ?? staffData.data ?? []).filter(
          (member: Staff) => member.isActive
        )
      );

      setShifts(
        (shiftData.shifts ?? shiftData.data ?? []).filter(
          (shift: Shift) => shift.isActive
        )
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredAssignments = useMemo(() => {
    return assignments.filter((assignment) => {
      const query = search.toLowerCase();

      const matchesSearch =
        assignment.staff.name.toLowerCase().includes(query) ||
        assignment.staff.email.toLowerCase().includes(query) ||
        assignment.shift.name.toLowerCase().includes(query);

      const matchesShift =
        shiftFilter === "ALL" || assignment.shift.id === shiftFilter;

      const matchesStatus =
        statusFilter === "ALL" || assignment.status === statusFilter;

      return matchesSearch && matchesShift && matchesStatus;
    });
  }, [assignments, search, shiftFilter, statusFilter]);

  const stats = useMemo(
    () => ({
      total: assignments.length,
      scheduled: assignments.filter((item) => item.status === "SCHEDULED")
        .length,
      completed: assignments.filter((item) => item.status === "COMPLETED")
        .length,
      missed: assignments.filter((item) => item.status === "MISSED").length,
    }),
    [assignments]
  );

  const resetModal = () => {
    setStaffId("");
    setShiftId("");
    setAssignmentDate(today());
    setNotes("");
    setShowModal(false);
  };

  const createAssignment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!staffId || !shiftId || !assignmentDate) {
      setError("Please select staff, shift and date.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await fetch("/api/admin/staff/shift-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId,
          shiftId,
          date: assignmentDate,
          notes: notes.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to assign shift.");
      }

      setSuccess("Shift assigned successfully.");
      resetModal();

      if (assignmentDate !== date) {
        setDate(assignmentDate);
      } else {
        await fetchData();
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to assign shift."
      );
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (assignment: Assignment) => {
    setEditingAssignment(assignment);
    setEditStatus(assignment.status);
    setEditNotes(assignment.notes || "");
  };

  const updateAssignment = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!editingAssignment) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await fetch(
        `/api/admin/staff/shift-assignments/${editingAssignment.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: editStatus,
            notes: editNotes.trim() || null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to update assignment.");
      }

      setEditingAssignment(null);
      setSuccess("Assignment updated successfully.");
      await fetchData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update assignment."
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteAssignment = async (assignment: Assignment) => {
    const confirmed = window.confirm(
      `Remove ${assignment.staff.name}'s shift assignment?`
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      const response = await fetch(
        `/api/admin/staff/shift-assignments/${assignment.id}`,
        { method: "DELETE" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to remove assignment.");
      }

      setSuccess("Assignment removed successfully.");
      await fetchData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to remove assignment."
      );
    }
  };

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    }).format(new Date(value));

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
              href="/admin/staff/shifts"
              className="hover:text-blue-600"
            >
              Shifts
            </Link>
            <span>/</span>
            <span className="text-gray-800">Assignments</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900">
            Shift Assignments
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Assign shifts and manage staff schedules.
          </p>
        </div>

        <button
          onClick={() => {
            setError("");
            setSuccess("");
            setShowModal(true);
          }}
          className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          + Assign Shift
        </button>
      </div>

      {/* Feedback */}
      {error && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button onClick={() => setError("")} aria-label="Close error">
            ×
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          <span>{success}</span>
          <button onClick={() => setSuccess("")} aria-label="Close message">
            ×
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total Assignments", value: stats.total },
          { label: "Scheduled", value: stats.scheduled },
          { label: "Completed", value: stats.completed },
          { label: "Missed", value: stats.missed },
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Assignment Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Search
            </label>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Staff name, email or shift..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Shift
            </label>
            <select
              value={shiftFilter}
              onChange={(event) => setShiftFilter(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            >
              <option value="ALL">All shifts</option>
              {shifts.map((shift) => (
                <option key={shift.id} value={shift.id}>
                  {shift.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            >
              <option value="ALL">All statuses</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="MISSED">Missed</option>
            </select>
          </div>
        </div>
      </section>

      {/* Assignment table */}
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 p-5">
          <div>
            <h2 className="font-semibold text-gray-900">
              Assignments for {formatDate(`${date}T12:00:00`)}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {filteredAssignments.length} assignment(s) found
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
            Loading assignments...
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-medium text-gray-700">
              No assignments found
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Try changing your filters or assign a shift.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Staff Member</th>
                  <th className="px-5 py-3 font-semibold">Shift</th>
                  <th className="px-5 py-3 font-semibold">Timing</th>
                  <th className="px-5 py-3 font-semibold">Branch</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredAssignments.map((assignment) => (
                  <tr key={assignment.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/staff/${assignment.staff.id}`}
                        className="font-semibold text-gray-900 hover:text-blue-600"
                      >
                        {assignment.staff.name}
                      </Link>
                      <p className="mt-1 text-xs text-gray-500">
                        {assignment.staff.designation ||
                          assignment.staff.department ||
                          assignment.staff.email}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/staff/shifts/${assignment.shift.id}`}
                        className="font-medium text-gray-800 hover:text-blue-600"
                      >
                        {assignment.shift.name}
                      </Link>
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {assignment.shift.startTime} –{" "}
                      {assignment.shift.endTime}
                      {assignment.shift.isOvernight && (
                        <span className="ml-1 text-xs text-purple-600">
                          Overnight
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {assignment.shift.branch?.name || "All branches"}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          statusStyles[assignment.status]
                        }`}
                      >
                        {assignment.status.replaceAll("_", " ")}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => openEditModal(assignment)}
                          className="font-medium text-blue-600 hover:text-blue-800"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteAssignment(assignment)}
                          className="font-medium text-red-600 hover:text-red-800"
                        >
                          Remove
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

      {/* Create assignment modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <form
            onSubmit={createAssignment}
            className="my-8 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Assign Shift
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Select a staff member, shift and date.
                </p>
              </div>
              <button
                type="button"
                onClick={resetModal}
                className="text-2xl text-gray-400 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Staff Member *
                </label>
                <select
                  required
                  value={staffId}
                  onChange={(event) => setStaffId(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                >
                  <option value="">Select staff</option>
                  {staff.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name} — {member.designation || member.department || member.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Shift *
                </label>
                <select
                  required
                  value={shiftId}
                  onChange={(event) => setShiftId(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                >
                  <option value="">Select shift</option>
                  {shifts.map((shift) => (
                    <option key={shift.id} value={shift.id}>
                      {shift.name} ({shift.startTime} – {shift.endTime})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Assignment Date *
                </label>
                <input
                  type="date"
                  required
                  value={assignmentDate}
                  onChange={(event) => setAssignmentDate(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Notes
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Optional assignment notes..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={resetModal}
                className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Assigning..." : "Assign Shift"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit assignment modal */}
      {editingAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={updateAssignment}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Update Assignment
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {editingAssignment.staff.name} · {editingAssignment.shift.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingAssignment(null)}
                className="text-2xl text-gray-400 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Assignment Status
                </label>
                <select
                  value={editStatus}
                  onChange={(event) =>
                    setEditStatus(event.target.value as AssignmentStatus)
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                >
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                  <option value="MISSED">Missed</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Notes
                </label>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={(event) => setEditNotes(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingAssignment(null)}
                className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}