"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Payroll = {
  id: string;
  payrollNumber: string;
  staffId: string;
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
  status: string;
  staff: {
    name: string;
    designation: string;
    department?: string | null;
    branch?: { name: string } | null;
  };
};

const money = (amount: number) =>
  `₹${amount.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;

const dateFormat = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));

const statusStyles: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  PROCESSING: "bg-blue-50 text-blue-700",
  APPROVED: "bg-green-50 text-green-700",
  PAID: "bg-emerald-50 text-emerald-700",
  PARTIALLY_PAID: "bg-yellow-50 text-yellow-700",
  CANCELLED: "bg-red-50 text-red-700",
};

export default function PayrollReportPage() {
  const today = new Date();
  const [startDate, setStartDate] = useState(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`
  );
  const [endDate, setEndDate] = useState(
    today.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
  );

  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [records, setRecords] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        startDate,
        endDate,
      });

      if (status !== "ALL") params.set("status", status);

      const response = await fetch(
        `/api/admin/staff/payroll?${params.toString()}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load payroll report.");
      }

      setRecords(data.payrolls ?? data.records ?? data.data ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, status]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const filteredRecords = records.filter((record) => {
    const query = search.toLowerCase();

    return (
      record.staff.name.toLowerCase().includes(query) ||
      record.payrollNumber.toLowerCase().includes(query) ||
      (record.staff.department || "").toLowerCase().includes(query)
    );
  });

  const totals = filteredRecords.reduce(
    (acc, record) => ({
      gross: acc.gross + record.grossSalary,
      net: acc.net + record.netSalary,
      paid: acc.paid + record.paidAmount,
      deductions: acc.deductions + record.deductions,
      outstanding:
        acc.outstanding +
        Math.max(record.netSalary - record.paidAmount, 0),
    }),
    { gross: 0, net: 0, paid: 0, deductions: 0, outstanding: 0 }
  );

  const exportCSV = () => {
    const headers = [
      "Payroll Number",
      "Staff",
      "Department",
      "Branch",
      "Period Start",
      "Period End",
      "Basic Salary",
      "Allowances",
      "Overtime",
      "Bonus",
      "Deductions",
      "Gross Salary",
      "Net Salary",
      "Paid Amount",
      "Status",
    ];

    const rows = filteredRecords.map((record) => [
      record.payrollNumber,
      record.staff.name,
      record.staff.department || "",
      record.staff.branch?.name || "",
      dateFormat(record.periodStart),
      dateFormat(record.periodEnd),
      record.basicSalary,
      record.allowances,
      record.overtimeAmount,
      record.bonus,
      record.deductions,
      record.grossSalary,
      record.netSalary,
      record.paidAmount,
      record.status,
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
    link.download = `payroll-report-${startDate}-${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-10">
      <div>
        <Link
          href="/admin/staff/reports"
          className="text-sm text-gray-500 hover:text-blue-600"
        >
          Staff Reports
        </Link>

        <h1 className="mt-2 text-2xl font-bold text-gray-900">
          Payroll Report
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Review salary expenses and payroll payment status.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="grid gap-4 rounded-xl border border-gray-200 bg-white p-5 md:grid-cols-3">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Period From
          </label>
          <input
            type="date"
            value={startDate}
            max={endDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Period To
          </label>
          <input
            type="date"
            value={endDate}
            min={startDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Payroll Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PROCESSING">Processing</option>
            <option value="APPROVED">Approved</option>
            <option value="PAID">Paid</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {[
          { label: "Gross Salary", value: totals.gross },
          { label: "Net Salary", value: totals.net },
          { label: "Total Deductions", value: totals.deductions },
          { label: "Paid Amount", value: totals.paid },
          { label: "Outstanding", value: totals.outstanding },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-gray-200 bg-white p-4"
          >
            <p className="text-sm text-gray-500">{item.label}</p>
            <p className="mt-2 text-xl font-bold text-gray-900">
              {money(item.value)}
            </p>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-col justify-between gap-3 border-b border-gray-200 p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-semibold text-gray-900">
              Payroll Records
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {filteredRecords.length} records
            </p>
          </div>

          <button
            onClick={exportCSV}
            disabled={!filteredRecords.length}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Export CSV
          </button>
        </div>

        <div className="border-b border-gray-100 p-4">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search staff or payroll number..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
          />
        </div>

        {loading ? (
          <p className="p-10 text-center text-sm text-gray-500">
            Loading payroll records...
          </p>
        ) : filteredRecords.length === 0 ? (
          <p className="p-10 text-center text-sm text-gray-500">
            No payroll records found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-5 py-3">Payroll</th>
                  <th className="px-5 py-3">Staff</th>
                  <th className="px-5 py-3">Period</th>
                  <th className="px-5 py-3">Gross</th>
                  <th className="px-5 py-3">Deductions</th>
                  <th className="px-5 py-3">Net Salary</th>
                  <th className="px-5 py-3">Paid</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4 font-medium text-gray-900">
                      {record.payrollNumber}
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-900">
                        {record.staff.name}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {record.staff.designation}
                      </p>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap text-gray-600">
                      {dateFormat(record.periodStart)} –{" "}
                      {dateFormat(record.periodEnd)}
                    </td>

                    <td className="px-5 py-4 text-gray-700">
                      {money(record.grossSalary)}
                    </td>

                    <td className="px-5 py-4 text-gray-700">
                      {money(record.deductions)}
                    </td>

                    <td className="px-5 py-4 font-semibold text-gray-900">
                      {money(record.netSalary)}
                    </td>

                    <td className="px-5 py-4 text-gray-700">
                      {money(record.paidAmount)}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          statusStyles[record.status] ||
                          "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {record.status.replaceAll("_", " ")}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/staff/payroll/${record.id}`}
                        className="font-medium text-blue-600 hover:text-blue-800"
                      >
                        View
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