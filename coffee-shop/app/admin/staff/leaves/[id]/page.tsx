"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

type LeaveRequest = {
  id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: LeaveStatus;
  adminRemarks?: string | null;
  createdAt: string;
  updatedAt: string;
  staff: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    designation?: string | null;
    department?: string | null;
    joiningDate?: string | null;
    branch?: {
      name: string;
    } | null;
  };
  reviewer?: {
    id: string;
    name: string;
    email: string;
  } | null;
  reviewedAt?: string | null;
};

const statusStyles: Record<LeaveStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  APPROVED: "bg-green-50 text-green-700",
  REJECTED: "bg-red-50 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-600",
};

const formatDate = (value?: string | null) => {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
};

const formatLabel = (value: string) =>
  value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) =>
    char.toUpperCase()
  );

export default function LeaveRequestDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [request, setRequest] = useState<LeaveRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [decision, setDecision] = useState<"APPROVED" | "REJECTED">(
    "APPROVED"
  );
  const [remarks, setRemarks] = useState("");

  const fetchRequest = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError("");

      const response = await fetch(`/api/admin/staff/leaves/${id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load leave request.");
      }

      setRequest(data.request ?? data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRequest();
  }, [fetchRequest]);

  const openDecisionModal = (value: "APPROVED" | "REJECTED") => {
    setDecision(value);
    setRemarks("");
    setError("");
    setSuccess("");
    setShowDecisionModal(true);
  };

  const submitDecision = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!request) return;

    if (decision === "REJECTED" && !remarks.trim()) {
      setError("Rejection reason is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await fetch(`/api/admin/staff/leaves/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: decision,
          adminRemarks: remarks.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to update leave request.");
      }

      setShowDecisionModal(false);
      setSuccess(
        decision === "APPROVED"
          ? "Leave request approved successfully."
          : "Leave request rejected successfully."
      );

      await fetchRequest();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update request."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="mt-3 text-sm text-gray-500">
            Loading leave request...
          </p>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <h2 className="font-semibold text-red-700">
          Leave request not found
        </h2>
        <p className="mt-1 text-sm text-red-600">
          {error || "The requested leave record could not be loaded."}
        </p>
        <div className="mt-4 flex gap-3">
          <button
            onClick={fetchRequest}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white"
          >
            Retry
          </button>
          <Link
            href="/admin/staff/leaves"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
          >
            Back to Leaves
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-gray-500">
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
            <span className="text-gray-800">Request Details</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900">
            Leave Request Details
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Review leave information and approval status.
          </p>
        </div>

        <Link
          href="/admin/staff/leaves"
          className="rounded-lg border border-gray-300 px-4 py-2.5 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          ← All Leave Requests
        </Link>
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

      {/* Request overview */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <p className="text-sm text-gray-500">Request ID</p>
            <p className="mt-1 break-all font-semibold text-gray-900">
              {request.id}
            </p>
          </div>

          <span
            className={`w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${
              statusStyles[request.status]
            }`}
          >
            {formatLabel(request.status)}
          </span>
        </div>

        <div className="mt-6 grid gap-5 border-t border-gray-100 pt-5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-sm text-gray-500">Leave Type</p>
            <p className="mt-1 font-semibold text-gray-900">
              {formatLabel(request.leaveType)}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Total Days</p>
            <p className="mt-1 text-xl font-bold text-gray-900">
              {request.totalDays}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Start Date</p>
            <p className="mt-1 font-semibold text-gray-900">
              {formatDate(request.startDate)}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">End Date</p>
            <p className="mt-1 font-semibold text-gray-900">
              {formatDate(request.endDate)}
            </p>
          </div>
        </div>
      </section>

      {/* Staff details */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">
            Staff Information
          </h2>

          <Link
            href={`/admin/staff/${request.staff.id}`}
            className="text-sm font-semibold text-blue-600 hover:text-blue-800"
          >
            View Staff Profile →
          </Link>
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-sm text-gray-500">Full Name</p>
            <p className="mt-1 font-medium text-gray-900">
              {request.staff.name}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="mt-1 break-all font-medium text-gray-900">
              {request.staff.email}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Phone</p>
            <p className="mt-1 font-medium text-gray-900">
              {request.staff.phone || "—"}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Designation</p>
            <p className="mt-1 font-medium text-gray-900">
              {request.staff.designation || "—"}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Department</p>
            <p className="mt-1 font-medium text-gray-900">
              {request.staff.department || "—"}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Branch</p>
            <p className="mt-1 font-medium text-gray-900">
              {request.staff.branch?.name || "—"}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Joining Date</p>
            <p className="mt-1 font-medium text-gray-900">
              {formatDate(request.staff.joiningDate)}
            </p>
          </div>
        </div>
      </section>

      {/* Leave reason */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Leave Reason
        </h2>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-gray-700">
          {request.reason}
        </p>
      </section>

      {/* Review information */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Review Information
        </h2>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <p className="text-sm text-gray-500">Reviewed By</p>
            <p className="mt-1 font-medium text-gray-900">
              {request.reviewer?.name || "Not reviewed yet"}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Review Date</p>
            <p className="mt-1 font-medium text-gray-900">
              {formatDateTime(request.reviewedAt)}
            </p>
          </div>

          <div className="sm:col-span-2">
            <p className="text-sm text-gray-500">Admin Remarks</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">
              {request.adminRemarks || "No remarks added."}
            </p>
          </div>
        </div>
      </section>

      {/* Record timestamps */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-gray-900">
          Record Information
        </h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-gray-500">Request Submitted</p>
            <p className="mt-1 text-sm font-medium text-gray-800">
              {formatDateTime(request.createdAt)}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Last Updated</p>
            <p className="mt-1 text-sm font-medium text-gray-800">
              {formatDateTime(request.updatedAt)}
            </p>
          </div>
        </div>
      </section>

      {/* Actions */}
      {request.status === "PENDING" && (
        <section className="flex flex-col justify-end gap-3 rounded-xl border border-gray-200 bg-white p-5 sm:flex-row">
          <button
            onClick={() => openDecisionModal("REJECTED")}
            className="rounded-lg border border-red-200 px-5 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
          >
            Reject Request
          </button>

          <button
            onClick={() => openDecisionModal("APPROVED")}
            className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
          >
            Approve Request
          </button>
        </section>
      )}

      {/* Decision modal */}
      {showDecisionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <form
            onSubmit={submitDecision}
            className="my-8 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            <h2 className="text-xl font-bold text-gray-900">
              {decision === "APPROVED"
                ? "Approve Leave"
                : "Reject Leave"}
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              {request.staff.name} · {formatLabel(request.leaveType)}
            </p>

            <div className="mt-5">
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
                    : "Reason for rejecting this request..."
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDecisionModal(false)}
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