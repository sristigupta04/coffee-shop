"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type ReportSummary = {
  totalStaff: number;
  activeStaff: number;
  inactiveStaff: number;
  attendanceRate: number;
  pendingLeaves: number;
  monthlyPayroll: number;
  totalReviews: number;
};

const reportLinks = [
  {
    title: "Attendance Report",
    description: "Staff attendance, absences, late arrivals and working days.",
    href: "/admin/staff/reports/attendance",
  },
  {
    title: "Payroll Report",
    description: "Salary, deductions, allowances and payment status.",
    href: "/admin/staff/reports/payroll",
  },
  {
    title: "Performance Report",
    description: "Employee ratings and performance review history.",
    href: "/admin/staff/reports/performance",
  },
];

export default function StaffReportsPage() {
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const response = await fetch("/api/admin/staff/reports");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to load reports.");
        }

        setSummary(data.summary ?? data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Something went wrong."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, []);

  const cards = [
    {
      label: "Total Staff",
      value: summary?.totalStaff ?? 0,
    },
    {
      label: "Active Staff",
      value: summary?.activeStaff ?? 0,
    },
    {
      label: "Inactive Staff",
      value: summary?.inactiveStaff ?? 0,
    },
    {
      label: "Attendance Rate",
      value: `${summary?.attendanceRate ?? 0}%`,
    },
    {
      label: "Pending Leaves",
      value: summary?.pendingLeaves ?? 0,
    },
    {
      label: "Monthly Payroll",
      value: `₹${(summary?.monthlyPayroll ?? 0).toLocaleString("en-IN")}`,
    },
    {
      label: "Performance Reviews",
      value: summary?.totalReviews ?? 0,
    },
  ];

  return (
    <div className="space-y-6 pb-10">
      <div>
        <Link
          href="/admin/staff"
          className="text-sm text-gray-500 hover:text-blue-600"
        >
          Staff
        </Link>

        <h1 className="mt-2 text-2xl font-bold text-gray-900">
          Staff Reports
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Overview of staff operations and HR performance.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section>
        <h2 className="mb-4 font-semibold text-gray-900">
          HR Overview
        </h2>

        {loading ? (
          <p className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
            Loading report summary...
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {cards.map((card) => (
              <div
                key={card.label}
                className="rounded-xl border border-gray-200 bg-white p-5"
              >
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">
                  {card.value}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 font-semibold text-gray-900">
          Detailed Reports
        </h2>

        <div className="grid gap-4 md:grid-cols-3">
          {reportLinks.map((report) => (
            <Link
              key={report.href}
              href={report.href}
              className="rounded-xl border border-gray-200 bg-white p-5 transition hover:border-blue-300 hover:shadow-sm"
            >
              <h3 className="font-semibold text-gray-900">
                {report.title}
              </h3>

              <p className="mt-2 text-sm leading-6 text-gray-500">
                {report.description}
              </p>

              <p className="mt-5 text-sm font-semibold text-blue-600">
                View Report →
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}