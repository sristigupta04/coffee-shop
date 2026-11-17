"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type GenerationResult = {
  created?: number;
  skipped?: number;
  message?: string;
  payrolls?: Array<{
    id: string;
    payrollNumber: string;
    staff?: { name: string };
    netSalary?: number;
  }>;
};

export default function GeneratePayrollPage() {
  const router = useRouter();

  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [staffId, setStaffId] = useState("ALL");
  const [notes, setNotes] = useState("");
  const [includeOvertime, setIncludeOvertime] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<GenerationResult | null>(null);

  const generatePayroll = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");
    setResult(null);

    if (!periodStart || !periodEnd) {
      setError("Please select both payroll period dates.");
      return;
    }

    if (new Date(periodEnd) < new Date(periodStart)) {
      setError("Period end date cannot be before period start date.");
      return;
    }

    const confirmed = window.confirm(
      "Generate payroll for the selected period? Existing payroll records will not be duplicated."
    );

    if (!confirmed) return;

    try {
      setLoading(true);

      const response = await fetch(
        "/api/admin/staff/payroll/generate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            staffId: staffId === "ALL" ? null : staffId,
            periodStart,
            periodEnd,
            includeOvertime,
            notes: notes.trim() || null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to generate payroll."
        );
      }

      setResult(data);

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-10">
      {/* Header */}
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
          <span className="text-gray-800">Generate</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-900">
          Generate Payroll
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Create salary records for a selected payroll period.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Success result */}
      {result && (
        <section className="rounded-xl border border-green-200 bg-green-50 p-5">
          <h2 className="font-semibold text-green-900">
            Payroll generation completed
          </h2>

          {result.message && (
            <p className="mt-1 text-sm text-green-800">
              {result.message}
            </p>
          )}

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-white p-4">
              <p className="text-sm text-gray-500">Created</p>
              <p className="mt-1 text-2xl font-bold text-green-700">
                {result.created ?? result.payrolls?.length ?? 0}
              </p>
            </div>

            <div className="rounded-lg bg-white p-4">
              <p className="text-sm text-gray-500">Skipped</p>
              <p className="mt-1 text-2xl font-bold text-gray-800">
                {result.skipped ?? 0}
              </p>
            </div>
          </div>

          {result.payrolls && result.payrolls.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-semibold text-gray-800">
                Generated records
              </p>

              {result.payrolls.map((payroll) => (
                <div
                  key={payroll.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {payroll.staff?.name || "Staff"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {payroll.payrollNumber}
                    </p>
                  </div>

                  {typeof payroll.netSalary === "number" && (
                    <p className="font-semibold text-gray-900">
                      ₹{payroll.netSalary.toLocaleString("en-IN")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => router.push("/admin/staff/payroll")}
            className="mt-5 rounded-lg bg-green-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-800"
          >
            View Payroll Records
          </button>
        </section>
      )}

      {/* Generation form */}
      <form
        onSubmit={generatePayroll}
        className="rounded-xl border border-gray-200 bg-white p-5 sm:p-7"
      >
        <div className="border-b border-gray-100 pb-5">
          <h2 className="font-semibold text-gray-900">
            Payroll Period & Staff
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Select the employees and salary period.
          </p>
        </div>

        <div className="mt-6 space-y-5">
          {/* Staff selection */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Generate For
            </label>

            <select
              value={staffId}
              onChange={(event) => setStaffId(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm outline-none focus:border-blue-500"
            >
              <option value="ALL">All Active Staff</option>
              <option value="SINGLE">
                Individual Staff — select through API integration
              </option>
            </select>

            {staffId === "SINGLE" && (
              <p className="mt-2 text-sm text-amber-700">
                Individual staff selection requires the staff list
                integration. Choose All Active Staff for now.
              </p>
            )}
          </div>

          {/* Period */}
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Period Start *
              </label>

              <input
                type="date"
                required
                value={periodStart}
                onChange={(event) => setPeriodStart(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Period End *
              </label>

              <input
                type="date"
                required
                min={periodStart || undefined}
                value={periodEnd}
                onChange={(event) => setPeriodEnd(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Overtime */}
          <div className="rounded-lg border border-gray-200 p-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={includeOvertime}
                onChange={(event) =>
                  setIncludeOvertime(event.target.checked)
                }
                className="mt-1 h-4 w-4 rounded border-gray-300"
              />

              <span>
                <span className="block text-sm font-semibold text-gray-900">
                  Include Approved Overtime
                </span>
                <span className="mt-1 block text-xs text-gray-500">
                  Add approved overtime records falling within the
                  selected payroll period.
                </span>
              </span>
            </label>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Payroll Notes
            </label>

            <textarea
              rows={4}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Optional payroll notes..."
              className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Calculation information */}
        <div className="mt-6 rounded-lg bg-blue-50 p-4">
          <h3 className="text-sm font-semibold text-blue-900">
            Server-side payroll calculation
          </h3>

          <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-blue-800">
            <li>Staff basic salary</li>
            <li>Attendance and payable working days</li>
            <li>Approved overtime, if enabled</li>
            <li>Allowances, deductions and bonuses</li>
            <li>Gross salary, net salary and payment balance</li>
          </ul>

          <p className="mt-3 text-xs text-blue-800">
            Final salary values must be calculated and validated by
            the backend, not by this form.
          </p>
        </div>

        {/* Actions */}
        <div className="mt-7 flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-5">
          <Link
            href="/admin/staff/payroll"
            className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={
              loading ||
              !periodStart ||
              !periodEnd ||
              staffId === "SINGLE"
            }
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Generating..." : "Generate Payroll"}
          </button>
        </div>
      </form>
    </div>
  );
}