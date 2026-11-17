"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Review = {
  id: string;
  staffId: string;
  rating: string;
  reviewDate: string;
  nextReviewDate?: string | null;
  strengths?: string | null;
  improvements?: string | null;
  comments?: string | null;
  staff: {
    name: string;
    designation: string;
    department?: string | null;
    branch?: { name: string } | null;
  };
  reviewer?: {
    name: string;
  } | null;
};

const ratings = [
  "EXCELLENT",
  "GOOD",
  "MEETS_EXPECTATION",
  "BELOW_EXPECTATION",
  "POOR",
];

const ratingStyles: Record<string, string> = {
  EXCELLENT: "bg-green-100 text-green-700",
  GOOD: "bg-emerald-50 text-emerald-700",
  MEETS_EXPECTATION: "bg-blue-50 text-blue-700",
  BELOW_EXPECTATION: "bg-yellow-50 text-yellow-700",
  POOR: "bg-red-50 text-red-700",
};

const ratingLabels: Record<string, string> = {
  EXCELLENT: "Excellent",
  GOOD: "Good",
  MEETS_EXPECTATION: "Meets Expectations",
  BELOW_EXPECTATION: "Below Expectations",
  POOR: "Poor",
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));

export default function PerformanceReportPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (ratingFilter !== "ALL") params.set("rating", ratingFilter);

      const response = await fetch(
        `/api/admin/staff/performance?${params.toString()}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load performance report.");
      }

      setReviews(data.reviews ?? data.data ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, ratingFilter]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const filteredReviews = reviews.filter((review) => {
    const query = search.toLowerCase();

    return (
      review.staff.name.toLowerCase().includes(query) ||
      review.staff.designation.toLowerCase().includes(query) ||
      (review.staff.department || "").toLowerCase().includes(query)
    );
  });

  const ratingCounts = ratings.map((rating) => ({
    rating,
    count: filteredReviews.filter((review) => review.rating === rating).length,
  }));

  const totalReviews = filteredReviews.length;

  const averageRating =
    totalReviews > 0
      ? (
          filteredReviews.reduce(
            (sum, review) => sum + (ratings.indexOf(review.rating) >= 0
              ? 5 - ratings.indexOf(review.rating)
              : 0),
            0
          ) / totalReviews
        ).toFixed(1)
      : "0.0";

  const exportCSV = () => {
    const headers = [
      "Staff",
      "Designation",
      "Department",
      "Branch",
      "Rating",
      "Review Date",
      "Next Review Date",
      "Reviewer",
      "Strengths",
      "Improvements",
      "Comments",
    ];

    const rows = filteredReviews.map((review) => [
      review.staff.name,
      review.staff.designation,
      review.staff.department || "",
      review.staff.branch?.name || "",
      review.rating,
      formatDate(review.reviewDate),
      review.nextReviewDate ? formatDate(review.nextReviewDate) : "",
      review.reviewer?.name || "",
      review.strengths || "",
      review.improvements || "",
      review.comments || "",
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
    link.download = "staff-performance-report.csv";
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
          Performance Report
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Review staff ratings and performance review history.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="grid gap-4 rounded-xl border border-gray-200 bg-white p-5 md:grid-cols-3">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            From Date
          </label>
          <input
            type="date"
            value={startDate}
            max={endDate || undefined}
            onChange={(e) => setStartDate(e.target.value)}
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
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Rating
          </label>
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
          >
            <option value="ALL">All Ratings</option>
            {ratings.map((rating) => (
              <option key={rating} value={rating}>
                {ratingLabels[rating]}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Total Reviews</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {totalReviews}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Average Rating</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {averageRating} / 5
          </p>
        </div>

        <div className="col-span-2 rounded-xl border border-gray-200 bg-white p-5 lg:col-span-1">
          <p className="text-sm text-gray-500">Excellent Reviews</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {ratingCounts.find((item) => item.rating === "EXCELLENT")?.count || 0}
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="font-semibold text-gray-900">Rating Distribution</h2>

        <div className="mt-5 space-y-4">
          {ratingCounts.map((item) => {
            const percentage =
              totalReviews > 0 ? (item.count / totalReviews) * 100 : 0;

            return (
              <div key={item.rating}>
                <div className="mb-2 flex justify-between text-sm">
                  <span className="font-medium text-gray-700">
                    {ratingLabels[item.rating]}
                  </span>
                  <span className="text-gray-500">{item.count}</span>
                </div>

                <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-blue-600"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-col justify-between gap-3 border-b border-gray-200 p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-semibold text-gray-900">Review Records</h2>
            <p className="mt-1 text-sm text-gray-500">
              {filteredReviews.length} reviews found
            </p>
          </div>

          <button
            onClick={exportCSV}
            disabled={!filteredReviews.length}
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
            placeholder="Search staff, designation or department..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
          />
        </div>

        {loading ? (
          <p className="p-10 text-center text-sm text-gray-500">
            Loading performance records...
          </p>
        ) : filteredReviews.length === 0 ? (
          <p className="p-10 text-center text-sm text-gray-500">
            No performance reviews found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-5 py-3">Staff</th>
                  <th className="px-5 py-3">Department</th>
                  <th className="px-5 py-3">Branch</th>
                  <th className="px-5 py-3">Rating</th>
                  <th className="px-5 py-3">Review Date</th>
                  <th className="px-5 py-3">Reviewer</th>
                  <th className="px-5 py-3">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredReviews.map((review) => (
                  <tr key={review.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-900">
                        {review.staff.name}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {review.staff.designation}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {review.staff.department || "—"}
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {review.staff.branch?.name || "—"}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          ratingStyles[review.rating] ||
                          "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {ratingLabels[review.rating] || review.rating}
                      </span>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap text-gray-600">
                      {formatDate(review.reviewDate)}
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {review.reviewer?.name || "—"}
                    </td>

                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/staff/performance/${review.id}`}
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