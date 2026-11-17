"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

type LeaveRequest = {
  id: string;
  staffId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: LeaveStatus;
  adminRemarks?: string | null;
  createdAt: string;
  staff: {
    id: string;
    name: string;
    email: string;
    department?: string | null;
    designation?: string | null;
    branch?: {
      name: string;
    } | null;
  };
};

const statusStyles: Record<LeaveStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  APPROVED: "bg-green-50 text-green-700",
  REJECTED: "bg-red-50 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-600",
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));

const formatLeaveType = (value: string) =>
  value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) =>
    char.toUpperCase()
  );

export default function LeaveManagementPage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [selectedRequest, setSelectedRequest] =
    useState<LeaveRequest | null>(null);
  const [decision, setDecision] = useState<"APPROVED" | "REJECTED">(
    "APPROVED"
  );
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const query = new URLSearchParams();

      if (statusFilter !== "ALL") query.set("status", statusFilter);
      if (typeFilter !== "ALL") query.set("leaveType", typeFilter);
      if (startDate) query.set("startDate", startDate);
      if (endDate) query.set("endDate", endDate);

      const response = await fetch(
        `/api/admin/staff/leaves?${query.toString()}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load leave requests.");
      }

      setRequests(data.requests ?? data.data ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, startDate, endDate]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const filteredRequests = useMemo(() => {
    const query = search.toLowerCase().trim();

    return requests.filter((request) => {
      const matchesSearch =
        !query ||
        request.staff.name.toLowerCase().includes(query) ||
        request.staff.email.toLowerCase().includes(query) ||
        request.reason.toLowerCase().includes(query);

      return matchesSearch;
    });
  }, [requests, search]);

  const stats = useMemo(
    () => ({
      total: requests.length,
      pending: requests.filter((item) => item.status === "PENDING").length,
      approved: requests.filter((item) => item.status === "APPROVED").length,
      rejected: requests.filter((item) => item.status === "REJECTED").length,
    }),
    [requests]
  );

  const openDecisionModal = (
    request: LeaveRequest,
    nextDecision: "APPROVED" | "REJECTED"
  ) => {
    setSelectedRequest(request);
    setDecision(nextDecision);
    setRemarks(request.adminRemarks || "");
    setError("");
    setSuccess("");
  };

  const submitDecision = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedRequest) return;

    if (decision === "REJECTED" && !remarks.trim()) {
      setError("Please provide a reason for rejecting this leave.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await fetch(
        `/api/admin/staff/leaves/${selectedRequest.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: decision,
            adminRemarks: remarks.trim() || null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to update leave request.");
      }

      setSelectedRequest(null);
      setSuccess(
        decision === "APPROVED"
          ? "Leave request approved successfully."
          : "Leave request rejected."
      );

      await fetchRequests();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update request."
      );
    } finally {
      setSaving(false);
    }
  };

  const exportCSV = () => {
    const headers = [
      "Staff Name",
      "Email",
      "Department",
      "Leave Type",
      "Start Date",
      "End Date",
      "Total Days",
      "Reason",
      "Status",
      "Admin Remarks",
    ];

    const rows = filteredRequests.map((item) => [
      item.staff.name,
      item.staff.email,
      item.staff.department || "",
      item.leaveType,
      formatDate(item.startDate),
      formatDate(item.endDate),
      item.totalDays,
      item.reason,
      item.status,
      item.adminRemarks || "",
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
    link.download = `leave-requests-${new Date().toISOString().slice(0, 10)}.csv`;
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
            <span className="text-gray-800">Leaves</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900">
            Leave Management
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Review staff leave requests and manage approvals.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/staff/leaves/calendar"
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Leave Calendar
          </Link>

          <button
            onClick={exportCSV}
            disabled={filteredRequests.length === 0}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Export CSV
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

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total Requests", value: stats.total },
          { label: "Pending Approval", value: stats.pending },
          { label: "Approved", value: stats.approved },
          { label: "Rejected", value: stats.rejected },
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Search
            </label>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Staff name, email, reason..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
            >
              <option value="ALL">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Leave Type
            </label>
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
            >
              <option value="ALL">All types</option>
              <option value="CASUAL">Casual</option>
              <option value="SICK">Sick</option>
              <option value="EARNED">Earned</option>
              <option value="UNPAID">Unpaid</option>
              <option value="MATERNITY">Maternity</option>
              <option value="PATERNITY">Paternity</option>
              <option value="EMERGENCY">Emergency</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              From Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              To Date
            </label>
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(event) => setEndDate(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
            />
          </div>
        </div>
      </section>

      {/* Requests table */}
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-col justify-between gap-3 border-b border-gray-200 p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-semibold text-gray-900">Leave Requests</h2>
            <p className="mt-1 text-sm text-gray-500">
              {filteredRequests.length} request(s) found
            </p>
          </div>

          <button
            onClick={fetchRequests}
            disabled={loading}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-gray-500">
            Loading leave requests...
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-medium text-gray-700">
              No leave requests found
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Try changing your filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Staff Member</th>
                  <th className="px-5 py-3 font-semibold">Leave Type</th>
                  <th className="px-5 py-3 font-semibold">Duration</th>
                  <th className="px-5 py-3 font-semibold">Days</th>
                  <th className="px-5 py-3 font-semibold">Reason</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/staff/${request.staff.id}`}
                        className="font-semibold text-gray-900 hover:text-blue-600"
                      >
                        {request.staff.name}
                      </Link>
                      <p className="mt-1 text-xs text-gray-500">
                        {request.staff.department ||
                          request.staff.designation ||
                          request.staff.email}
                      </p>
                      {request.staff.branch?.name && (
                        <p className="mt-1 text-xs text-gray-400">
                          {request.staff.branch.name}
                        </p>
                      )}
                    </td>

                    <td className="px-5 py-4 text-gray-700">
                      {formatLeaveType(request.leaveType)}
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      <p>{formatDate(request.startDate)}</p>
                      <p className="mt-1 text-xs text-gray-400">
                        to {formatDate(request.endDate)}
                      </p>
                    </td>

                    <td className="px-5 py-4 font-semibold text-gray-800">
                      {request.totalDays}
                    </td>

                    <td
                      className="max-w-[180px] truncate px-5 py-4 text-gray-600"
                      title={request.reason}
                    >
                      {request.reason}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          statusStyles[request.status]
                        }`}
                      >
                        {request.status.replaceAll("_", " ")}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/admin/staff/leaves/${request.id}`}
                          className="font-medium text-blue-600 hover:text-blue-800"
                        >
                          View
                        </Link>

                        {request.status === "PENDING" && (
                          <>
                            <button
                              onClick={() =>
                                openDecisionModal(request, "APPROVED")
                              }
                              className="font-medium text-green-600 hover:text-green-800"
                            >
                              Approve
                            </button>

                            <button
                              onClick={() =>
                                openDecisionModal(request, "REJECTED")
                              }
                              className="font-medium text-red-600 hover:text-red-800"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Approval / rejection modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <form
            onSubmit={submitDecision}
            className="my-8 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="mb-5">
              <h2 className="text-xl font-bold text-gray-900">
                {decision === "APPROVED"
                  ? "Approve Leave Request"
                  : "Reject Leave Request"}
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                {selectedRequest.staff.name} ·{" "}
                {formatLeaveType(selectedRequest.leaveType)}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {formatDate(selectedRequest.startDate)} –{" "}
                {formatDate(selectedRequest.endDate)} (
                {selectedRequest.totalDays} days)
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Admin Remarks{" "}
                {decision === "REJECTED" && (
                  <span className="text-red-600">*</span>
                )}
              </label>
              <textarea
                rows={4}
                required={decision === "REJECTED"}
                value={remarks}
                onChange={(event) => setRemarks(event.target.value)}
                placeholder={
                  decision === "APPROVED"
                    ? "Optional remarks..."
                    : "Explain why this request is rejected..."
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className={`rounded-lg px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${
                  decision === "APPROVED"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {saving
                  ? "Processing..."
                  : decision === "APPROVED"
                    ? "Confirm Approval"
                    : "Confirm Rejection"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}