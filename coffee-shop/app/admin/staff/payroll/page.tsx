"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type PayrollStatus =
  | "DRAFT"
  | "PROCESSING"
  | "APPROVED"
  | "PAID"
  | "PARTIALLY_PAID"
  | "CANCELLED";

type PayrollRecord = {
  id: string;
  staffId: string;
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
    designation?: string | null;
    department?: string | null;
    branch?: { name: string } | null;
  };
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
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));

export default function PayrollManagementPage() {
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchPayroll = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const query = new URLSearchParams();

      if (statusFilter !== "ALL") {
        query.set("status", statusFilter);
      }

      if (startDate) query.set("startDate", startDate);
      if (endDate) query.set("endDate", endDate);

      const response = await fetch(
        `/api/admin/staff/payroll?${query.toString()}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load payroll records.");
      }

      setRecords(data.payrolls ?? data.records ?? data.data ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }, [statusFilter, startDate, endDate]);

  useEffect(() => {
    fetchPayroll();
  }, [fetchPayroll]);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();

    return records.filter((record) => {
      if (!query) return true;

      return (
        record.staff.name.toLowerCase().includes(query) ||
        record.payrollNumber.toLowerCase().includes(query) ||
        (record.staff.email || "").toLowerCase().includes(query) ||
        (record.staff.department || "").toLowerCase().includes(query) ||
        (record.staff.branch?.name || "").toLowerCase().includes(query)
      );
    });
  }, [records, search]);

  const stats = useMemo(() => {
    const paid = records.filter((item) => item.status === "PAID");
    const pending = records.filter(
      (item) =>
        item.status === "DRAFT" ||
        item.status === "PROCESSING" ||
        item.status === "APPROVED"
    );
    const partial = records.filter(
      (item) => item.status === "PARTIALLY_PAID"
    );

    return {
      total: records.length,
      paidCount: paid.length,
      pendingCount: pending.length,
      partialCount: partial.length,
      totalPayroll: records
        .filter((item) => item.status !== "CANCELLED")
        .reduce((sum, item) => sum + item.netSalary, 0),
      paidAmount: records.reduce(
        (sum, item) => sum + item.paidAmount,
        0
      ),
      outstanding: records
        .filter((item) => item.status !== "CANCELLED")
        .reduce(
          (sum, item) =>
            sum + Math.max(item.netSalary - item.paidAmount, 0),
          0
        ),
    };
  }, [records]);

  const exportCSV = () => {
    const headers = [
      "Payroll Number",
      "Staff Name",
      "Email",
      "Department",
      "Branch",
      "Period Start",
      "Period End",
      "Basic Salary",
      "Allowances",
      "Deductions",
      "Overtime Amount",
      "Bonus",
      "Gross Salary",
      "Net Salary",
      "Paid Amount",
      "Outstanding",
      "Status",
    ];

    const rows = filteredRecords.map((item) => [
      item.payrollNumber,
      item.staff.name,
      item.staff.email || "",
      item.staff.department || "",
      item.staff.branch?.name || "",
      formatDate(item.periodStart),
      formatDate(item.periodEnd),
      item.basicSalary,
      item.allowances,
      item.deductions,
      item.overtimeAmount,
      item.bonus,
      item.grossSalary,
      item.netSalary,
      item.paidAmount,
      Math.max(item.netSalary - item.paidAmount, 0),
      item.status,
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
    link.download = `staff-payroll-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
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
            <span className="text-gray-800">Payroll</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900">
            Payroll Management
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Manage staff salaries, payroll periods and payment records.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={exportCSV}
            disabled={!filteredRecords.length}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Export CSV
          </button>

          <Link
            href="/admin/staff/payroll/generate"
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            + Generate Payroll
          </Link>
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

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[
          { label: "Payroll Records", value: stats.total },
          { label: "Paid Records", value: stats.paidCount },
          { label: "Pending Records", value: stats.pendingCount },
          { label: "Partially Paid", value: stats.partialCount },
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

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Total Net Payroll</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {formatCurrency(stats.totalPayroll)}
          </p>
        </div>

        <div className="rounded-xl border border-green-200 bg-green-50 p-5">
          <p className="text-sm text-green-800">Total Paid</p>
          <p className="mt-2 text-2xl font-bold text-green-900">
            {formatCurrency(stats.paidAmount)}
          </p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm text-amber-800">Outstanding Amount</p>
          <p className="mt-2 text-2xl font-bold text-amber-900">
            {formatCurrency(stats.outstanding)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Search
            </label>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Staff or payroll number..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Payment Status
            </label>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
            >
              <option value="ALL">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PROCESSING">Processing</option>
              <option value="APPROVED">Approved</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
              <option value="PAID">Paid</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Period From
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
              Period To
            </label>
            <input
              type="date"
              min={startDate || undefined}
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
            />
          </div>
        </div>
      </section>

      {/* Payroll table */}
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 p-5">
          <div>
            <h2 className="font-semibold text-gray-900">Payroll Records</h2>
            <p className="mt-1 text-sm text-gray-500">
              {filteredRecords.length} payroll record(s) found
            </p>
          </div>

          <button
            onClick={fetchPayroll}
            disabled={loading}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-gray-500">
            Loading payroll records...
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-medium text-gray-700">
              No payroll records found
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Generate payroll to create your first salary record.
            </p>
            <Link
              href="/admin/staff/payroll/generate"
              className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Generate Payroll
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1250px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Payroll</th>
                  <th className="px-5 py-3 font-semibold">Staff</th>
                  <th className="px-5 py-3 font-semibold">Period</th>
                  <th className="px-5 py-3 font-semibold">Basic Salary</th>
                  <th className="px-5 py-3 font-semibold">Gross Salary</th>
                  <th className="px-5 py-3 font-semibold">Net Salary</th>
                  <th className="px-5 py-3 font-semibold">Paid</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-gray-900">
                        {record.payrollNumber}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {record.workingDays} working days
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/staff/${record.staff.id}`}
                        className="font-semibold text-gray-900 hover:text-blue-600"
                      >
                        {record.staff.name}
                      </Link>
                      <p className="mt-1 text-xs text-gray-500">
                        {record.staff.designation ||
                          record.staff.department ||
                          record.staff.email ||
                          "Staff"}
                      </p>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap text-gray-600">
                      {formatDate(record.periodStart)}
                      <span className="mx-1">–</span>
                      {formatDate(record.periodEnd)}
                    </td>

                    <td className="px-5 py-4 text-gray-700">
                      {formatCurrency(record.basicSalary)}
                    </td>

                    <td className="px-5 py-4 text-gray-700">
                      {formatCurrency(record.grossSalary)}
                    </td>

                    <td className="px-5 py-4 font-semibold text-gray-900">
                      {formatCurrency(record.netSalary)}
                    </td>

                    <td className="px-5 py-4 text-gray-700">
                      {formatCurrency(record.paidAmount)}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[record.status]}`}
                      >
                        {record.status.replaceAll("_", " ")}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/staff/payroll/${record.id}`}
                        className="font-medium text-blue-600 hover:text-blue-800"
                      >
                        View Details
                      </Link>
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