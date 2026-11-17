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

type Payslip = {
  id: string;
  payrollNumber: string;
  periodStart: string;
  periodEnd: string;
  basicSalary: number;
  grossSalary: number;
  netSalary: number;
  paidAmount: number;
  status: PayrollStatus;
  paymentDate?: string | null;
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

export default function PayslipsPage() {
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchPayslips = useCallback(async () => {
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
        throw new Error(data.message || "Unable to load payslips.");
      }

      setPayslips(data.payrolls ?? data.records ?? data.data ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }, [statusFilter, startDate, endDate]);

  useEffect(() => {
    fetchPayslips();
  }, [fetchPayslips]);

  const filteredPayslips = useMemo(() => {
    const query = search.trim().toLowerCase();

    return payslips.filter((item) => {
      if (!query) return true;

      return (
        item.staff.name.toLowerCase().includes(query) ||
        item.payrollNumber.toLowerCase().includes(query) ||
        (item.staff.email || "").toLowerCase().includes(query) ||
        (item.staff.department || "").toLowerCase().includes(query) ||
        (item.staff.branch?.name || "").toLowerCase().includes(query)
      );
    });
  }, [payslips, search]);

  const stats = useMemo(() => {
    const paid = payslips.filter((item) => item.status === "PAID");

    return {
      total: payslips.length,
      paid: paid.length,
      paidAmount: paid.reduce((sum, item) => sum + item.paidAmount, 0),
      totalNet: payslips
        .filter((item) => item.status !== "CANCELLED")
        .reduce((sum, item) => sum + item.netSalary, 0),
    };
  }, [payslips]);

  const downloadPayslip = async (item: Payslip) => {
    try {
      setDownloadingId(item.id);
      setError("");
      setSuccess("");

      const response = await fetch(
        `/api/admin/staff/payroll/${item.id}/payslip`
      );

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || "Unable to download payslip.");
      }

      const blob = await response.blob();

      if (blob.type && !blob.type.includes("pdf")) {
        throw new Error("Server did not return a PDF file.");
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `${item.payrollNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);

      setSuccess(`${item.payrollNumber} downloaded successfully.`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to download payslip."
      );
    } finally {
      setDownloadingId(null);
    }
  };

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
      "Gross Salary",
      "Net Salary",
      "Paid Amount",
      "Status",
    ];

    const rows = filteredPayslips.map((item) => [
      item.payrollNumber,
      item.staff.name,
      item.staff.email || "",
      item.staff.department || "",
      item.staff.branch?.name || "",
      formatDate(item.periodStart),
      formatDate(item.periodEnd),
      item.basicSalary,
      item.grossSalary,
      item.netSalary,
      item.paidAmount,
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
    link.download = `payslips-${new Date()
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
            <Link
              href="/admin/staff/payroll"
              className="hover:text-blue-600"
            >
              Payroll
            </Link>
            <span>/</span>
            <span className="text-gray-800">Payslips</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900">
            Payslip Management
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            View and download employee salary slips.
          </p>
        </div>

        <button
          onClick={exportCSV}
          disabled={!filteredPayslips.length}
          className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Export CSV
        </button>
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

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[
          { label: "Total Payslips", value: stats.total },
          { label: "Fully Paid", value: stats.paid },
          {
            label: "Total Net Payroll",
            value: formatCurrency(stats.totalNet),
          },
          {
            label: "Amount Paid",
            value: formatCurrency(stats.paidAmount),
          },
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
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Search Staff
            </label>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name or payroll number..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Payroll Status
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

      {/* Payslip table */}
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 p-5">
          <div>
            <h2 className="font-semibold text-gray-900">Payslip Records</h2>
            <p className="mt-1 text-sm text-gray-500">
              {filteredPayslips.length} record(s) found
            </p>
          </div>

          <button
            onClick={fetchPayslips}
            disabled={loading}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-gray-500">
            Loading payslips...
          </div>
        ) : filteredPayslips.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-medium text-gray-700">
              No payslips found
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Generate payroll records before downloading payslips.
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
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Payroll</th>
                  <th className="px-5 py-3 font-semibold">Staff</th>
                  <th className="px-5 py-3 font-semibold">Period</th>
                  <th className="px-5 py-3 font-semibold">Net Salary</th>
                  <th className="px-5 py-3 font-semibold">Paid Amount</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredPayslips.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-gray-900">
                        {item.payrollNumber}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/staff/${item.staff.id}`}
                        className="font-semibold text-gray-900 hover:text-blue-600"
                      >
                        {item.staff.name}
                      </Link>
                      <p className="mt-1 text-xs text-gray-500">
                        {item.staff.designation ||
                          item.staff.department ||
                          item.staff.email ||
                          "Staff"}
                      </p>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap text-gray-600">
                      {formatDate(item.periodStart)}
                      <span className="mx-1">–</span>
                      {formatDate(item.periodEnd)}
                    </td>

                    <td className="px-5 py-4 font-semibold text-gray-900">
                      {formatCurrency(item.netSalary)}
                    </td>

                    <td className="px-5 py-4 text-gray-700">
                      {formatCurrency(item.paidAmount)}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[item.status]}`}
                      >
                        {item.status.replaceAll("_", " ")}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/admin/staff/payroll/${item.id}`}
                          className="font-medium text-blue-600 hover:text-blue-800"
                        >
                          View
                        </Link>

                        <button
                          onClick={() => downloadPayslip(item)}
                          disabled={downloadingId === item.id}
                          className="font-medium text-gray-700 hover:text-gray-900 disabled:opacity-50"
                        >
                          {downloadingId === item.id
                            ? "Downloading..."
                            : "Download PDF"}
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
    </div>
  );
}