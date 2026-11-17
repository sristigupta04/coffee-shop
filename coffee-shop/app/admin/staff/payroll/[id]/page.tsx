"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type PayrollStatus =
  | "DRAFT"
  | "PROCESSING"
  | "APPROVED"
  | "PAID"
  | "PARTIALLY_PAID"
  | "CANCELLED";

type PayrollItem = {
  id: string;
  type: string;
  title: string;
  description?: string | null;
  amount: number;
};

type Payroll = {
  id: string;
  payrollNumber: string;
  periodStart: string;
  periodEnd: string;

  basicSalary: number;
  allowances: number;
  deductions: number;
  overtimeAmount: number;
  bonus: number;

  grossSalary: number;
  netSalary: number;
  paidAmount: number;

  workingDays: number;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  overtimeHours: number;

  status: PayrollStatus;
  paymentDate?: string | null;
  paymentReference?: string | null;
  paymentMethod?: string | null;
  notes?: string | null;

  staff: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    designation?: string | null;
    department?: string | null;
    branch?: { name: string } | null;
  };

  items: PayrollItem[];
  createdAt: string;
  updatedAt: string;
};

const statusStyles: Record<PayrollStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  PROCESSING: "bg-amber-50 text-amber-700",
  APPROVED: "bg-blue-50 text-blue-700",
  PAID: "bg-green-50 text-green-700",
  PARTIALLY_PAID: "bg-purple-50 text-purple-700",
  CANCELLED: "bg-red-50 text-red-700",
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value || 0);

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));

export default function PayrollDetailsPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [payroll, setPayroll] = useState<Payroll | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    paymentDate: new Date().toISOString().slice(0, 10),
    paymentMethod: "BANK_TRANSFER",
    paymentReference: "",
    notes: "",
  });

  const fetchPayroll = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/admin/staff/payroll/${id}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load payroll.");
      }

      setPayroll(data.payroll ?? data.data ?? data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPayroll();
  }, [fetchPayroll]);

  const outstanding = payroll
    ? Math.max(payroll.netSalary - payroll.paidAmount, 0)
    : 0;

  const updateStatus = async (status: PayrollStatus) => {
    if (!payroll) return;

    const confirmed = window.confirm(
      `Change payroll status to ${status.replaceAll("_", " ")}?`
    );

    if (!confirmed) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await fetch(
        `/api/admin/staff/payroll/${id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to update payroll.");
      }

      setSuccess("Payroll status updated successfully.");
      await fetchPayroll();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update payroll."
      );
    } finally {
      setSaving(false);
    }
  };

  const recordPayment = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!payroll) return;

    const amount = Number(paymentForm.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a valid payment amount.");
      return;
    }

    if (amount > outstanding) {
      setError("Payment cannot exceed the outstanding balance.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await fetch(
        `/api/admin/staff/payroll/${id}/payments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount,
            paymentDate: paymentForm.paymentDate,
            paymentMethod: paymentForm.paymentMethod,
            paymentReference:
              paymentForm.paymentReference.trim() || null,
            notes: paymentForm.notes.trim() || null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to record payment.");
      }

      setShowPaymentModal(false);
      setPaymentForm({
        amount: "",
        paymentDate: new Date().toISOString().slice(0, 10),
        paymentMethod: "BANK_TRANSFER",
        paymentReference: "",
        notes: "",
      });

      setSuccess("Payment recorded successfully.");
      await fetchPayroll();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to record payment."
      );
    } finally {
      setSaving(false);
    }
  };

  const downloadPayslip = async () => {
    try {
      setError("");

      const response = await fetch(
        `/api/admin/staff/payroll/${id}/payslip`
      );

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || "Unable to download payslip.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `${payroll?.payrollNumber || "payslip"}.pdf`;
      link.click();

      URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to download payslip."
      );
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-sm text-gray-500">
        Loading payroll details...
      </div>
    );
  }

  if (!payroll) {
    return (
      <div className="space-y-4 p-8">
        <p className="text-red-600">
          {error || "Payroll record not found."}
        </p>
        <Link
          href="/admin/staff/payroll"
          className="text-sm font-medium text-blue-600"
        >
          Back to Payroll
        </Link>
      </div>
    );
  }

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
              href="/admin/staff/payroll"
              className="hover:text-blue-600"
            >
              Payroll
            </Link>
            <span>/</span>
            <span className="text-gray-800">Details</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900">
            Payroll Details
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            {payroll.payrollNumber}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={downloadPayslip}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Download Payslip
          </button>

          {payroll.status === "APPROVED" ||
          payroll.status === "PARTIALLY_PAID" ? (
            <button
              onClick={() => setShowPaymentModal(true)}
              disabled={outstanding <= 0}
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Record Payment
            </button>
          ) : null}
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

      {/* Staff and payroll information */}
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="font-semibold text-gray-900">Staff Information</h2>

          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Name</span>
              <Link
                href={`/admin/staff/${payroll.staff.id}`}
                className="font-medium text-blue-600"
              >
                {payroll.staff.name}
              </Link>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Email</span>
              <span className="text-right text-gray-800">
                {payroll.staff.email || "—"}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Phone</span>
              <span className="text-gray-800">
                {payroll.staff.phone || "—"}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Designation</span>
              <span className="text-gray-800">
                {payroll.staff.designation || "—"}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Department</span>
              <span className="text-gray-800">
                {payroll.staff.department || "—"}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Branch</span>
              <span className="text-gray-800">
                {payroll.staff.branch?.name || "—"}
              </span>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="font-semibold text-gray-900">Payroll Information</h2>

          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Payroll Number</span>
              <span className="font-medium text-gray-900">
                {payroll.payrollNumber}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Period Start</span>
              <span className="text-gray-800">
                {formatDate(payroll.periodStart)}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Period End</span>
              <span className="text-gray-800">
                {formatDate(payroll.periodEnd)}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Status</span>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[payroll.status]}`}
              >
                {payroll.status.replaceAll("_", " ")}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Created</span>
              <span className="text-gray-800">
                {formatDate(payroll.createdAt)}
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* Salary summary */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="font-semibold text-gray-900">Salary Breakdown</h2>

        <div className="mt-5 grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">
              Earnings
            </h3>

            {[
              ["Basic Salary", payroll.basicSalary],
              ["Allowances", payroll.allowances],
              ["Overtime", payroll.overtimeAmount],
              ["Bonus", payroll.bonus],
            ].map(([label, amount]) => (
              <div
                key={String(label)}
                className="flex justify-between gap-4 text-sm"
              >
                <span className="text-gray-500">{label}</span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(Number(amount))}
                </span>
              </div>
            ))}

            <div className="flex justify-between border-t border-gray-200 pt-4 text-sm font-bold">
              <span>Gross Salary</span>
              <span>{formatCurrency(payroll.grossSalary)}</span>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">
              Deductions
            </h3>

            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total Deductions</span>
              <span className="font-medium text-red-600">
                - {formatCurrency(payroll.deductions)}
              </span>
            </div>

            <div className="rounded-lg bg-blue-50 p-4">
              <p className="text-sm font-medium text-blue-800">
                Net Salary
              </p>
              <p className="mt-2 text-3xl font-bold text-blue-900">
                {formatCurrency(payroll.netSalary)}
              </p>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Paid Amount</span>
              <span className="font-semibold text-green-700">
                {formatCurrency(payroll.paidAmount)}
              </span>
            </div>

            <div className="flex justify-between border-t border-gray-200 pt-3 text-sm font-bold">
              <span>Outstanding</span>
              <span className="text-amber-700">
                {formatCurrency(outstanding)}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Attendance summary */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="font-semibold text-gray-900">Attendance Summary</h2>

        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-5">
          {[
            { label: "Working Days", value: payroll.workingDays },
            { label: "Present Days", value: payroll.presentDays },
            { label: "Absent Days", value: payroll.absentDays },
            { label: "Leave Days", value: payroll.leaveDays },
            { label: "Overtime Hours", value: payroll.overtimeHours },
          ].map((item) => (
            <div key={item.label} className="rounded-lg bg-gray-50 p-4">
              <p className="text-xs text-gray-500">{item.label}</p>
              <p className="mt-2 text-xl font-bold text-gray-900">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Payroll items */}
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900">
            Additional Payroll Items
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Allowances, deductions, bonuses and other payroll adjustments.
          </p>
        </div>

        {payroll.items.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-500">
            No additional payroll items.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-5 py-3">Title</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Description</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {payroll.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-5 py-4 font-medium text-gray-900">
                      {item.title}
                    </td>
                    <td className="px-5 py-4 text-gray-600">
                      {item.type.replaceAll("_", " ")}
                    </td>
                    <td className="px-5 py-4 text-gray-500">
                      {item.description || "—"}
                    </td>
                    <td className="px-5 py-4 text-right font-semibold text-gray-900">
                      {formatCurrency(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Payment information */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="font-semibold text-gray-900">Payment Information</h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-gray-500">Payment Date</p>
            <p className="mt-1 text-sm font-medium text-gray-900">
              {payroll.paymentDate
                ? formatDate(payroll.paymentDate)
                : "Not recorded"}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-500">Payment Method</p>
            <p className="mt-1 text-sm font-medium text-gray-900">
              {payroll.paymentMethod?.replaceAll("_", " ") || "—"}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-500">Payment Reference</p>
            <p className="mt-1 break-all text-sm font-medium text-gray-900">
              {payroll.paymentReference || "—"}
            </p>
          </div>
        </div>

        {payroll.notes && (
          <div className="mt-5 border-t border-gray-100 pt-4">
            <p className="text-xs text-gray-500">Notes</p>
            <p className="mt-1 text-sm text-gray-800">{payroll.notes}</p>
          </div>
        )}
      </section>

      {/* Status actions */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="font-semibold text-gray-900">Payroll Actions</h2>

        <div className="mt-4 flex flex-wrap gap-3">
          {payroll.status === "DRAFT" && (
            <button
              onClick={() => updateStatus("PROCESSING")}
              disabled={saving}
              className="rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              Start Processing
            </button>
          )}

          {payroll.status === "PROCESSING" && (
            <button
              onClick={() => updateStatus("APPROVED")}
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              Approve Payroll
            </button>
          )}

          {payroll.status === "APPROVED" && outstanding === 0 && (
            <button
              onClick={() => updateStatus("PAID")}
              disabled={saving}
              className="rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              Mark Fully Paid
            </button>
          )}

          {(payroll.status === "DRAFT" ||
            payroll.status === "PROCESSING") && (
            <button
              onClick={() => updateStatus("CANCELLED")}
              disabled={saving}
              className="rounded-lg border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 disabled:opacity-50"
            >
              Cancel Payroll
            </button>
          )}
        </div>

        <p className="mt-3 text-xs text-gray-500">
          Payment recording and status changes must be validated by the
          backend. Paid payroll records should not be edited without an
          authorized adjustment workflow.
        </p>
      </section>

      {/* Payment modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <form
            onSubmit={recordPayment}
            className="my-8 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
          >
            <h2 className="text-xl font-bold text-gray-900">
              Record Payroll Payment
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Outstanding: {formatCurrency(outstanding)}
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Payment Amount *
                </label>
                <input
                  type="number"
                  min="0.01"
                  max={outstanding}
                  step="0.01"
                  required
                  value={paymentForm.amount}
                  onChange={(event) =>
                    setPaymentForm({
                      ...paymentForm,
                      amount: event.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Payment Date *
                </label>
                <input
                  type="date"
                  required
                  value={paymentForm.paymentDate}
                  onChange={(event) =>
                    setPaymentForm({
                      ...paymentForm,
                      paymentDate: event.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Payment Method *
                </label>
                <select
                  required
                  value={paymentForm.paymentMethod}
                  onChange={(event) =>
                    setPaymentForm({
                      ...paymentForm,
                      paymentMethod: event.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                >
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="UPI">UPI</option>
                  <option value="CASH">Cash</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Payment Reference
                </label>
                <input
                  value={paymentForm.paymentReference}
                  onChange={(event) =>
                    setPaymentForm({
                      ...paymentForm,
                      paymentReference: event.target.value,
                    })
                  }
                  placeholder="Transaction ID / UTR..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Notes
                </label>
                <textarea
                  rows={3}
                  value={paymentForm.notes}
                  onChange={(event) =>
                    setPaymentForm({
                      ...paymentForm,
                      notes: event.target.value,
                    })
                  }
                  placeholder="Optional payment notes..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? "Saving..." : "Record Payment"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}