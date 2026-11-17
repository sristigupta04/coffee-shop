"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type PerformanceRating =
  | "POOR"
  | "BELOW_EXPECTATION"
  | "MEETS_EXPECTATION"
  | "GOOD"
  | "EXCELLENT";

type PerformanceReview = {
  id: string;
  staffId: string;
  reviewerId?: string | null;
  rating: PerformanceRating;
  reviewDate: string;
  nextReviewDate?: string | null;
  strengths?: string | null;
  improvements?: string | null;
  comments?: string | null;
  staff: {
    id: string;
    name: string;
    email?: string | null;
    designation?: string | null;
    department?: string | null;
    branch?: { name: string } | null;
  };
  reviewer?: {
    id: string;
    name: string;
  } | null;
};

const ratingLabels: Record<PerformanceRating, string> = {
  POOR: "Poor",
  BELOW_EXPECTATION: "Below Expectation",
  MEETS_EXPECTATION: "Meets Expectation",
  GOOD: "Good",
  EXCELLENT: "Excellent",
};

const ratingStyles: Record<PerformanceRating, string> = {
  POOR: "bg-red-50 text-red-700",
  BELOW_EXPECTATION: "bg-orange-50 text-orange-700",
  MEETS_EXPECTATION: "bg-yellow-50 text-yellow-700",
  GOOD: "bg-blue-50 text-blue-700",
  EXCELLENT: "bg-green-50 text-green-700",
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));

export default function StaffPerformancePage() {
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState("ALL");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const query = new URLSearchParams();

      if (ratingFilter !== "ALL") {
        query.set("rating", ratingFilter);
      }

      if (departmentFilter !== "ALL") {
        query.set("department", departmentFilter);
      }

      if (startDate) query.set("startDate", startDate);
      if (endDate) query.set("endDate", endDate);

      const response = await fetch(
        `/api/admin/staff/performance?${query.toString()}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load performance reviews.");
      }

      setReviews(data.reviews ?? data.records ?? data.data ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }, [ratingFilter, departmentFilter, startDate, endDate]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const departments = useMemo(
    () =>
      Array.from(
        new Set(
          reviews
            .map((review) => review.staff.department)
            .filter((department): department is string => Boolean(department))
        )
      ).sort(),
    [reviews]
  );

  const filteredReviews = useMemo(() => {
    const query = search.trim().toLowerCase();

    return reviews.filter((review) => {
      if (!query) return true;

      return (
        review.staff.name.toLowerCase().includes(query) ||
        (review.staff.email || "").toLowerCase().includes(query) ||
        (review.staff.designation || "").toLowerCase().includes(query) ||
        (review.staff.department || "").toLowerCase().includes(query)
      );
    });
  }, [reviews, search]);

  const stats = useMemo(() => {
    const count = (rating: PerformanceRating) =>
      reviews.filter((review) => review.rating === rating).length;

    const ratingValues: Record<PerformanceRating, number> = {
      POOR: 1,
      BELOW_EXPECTATION: 2,
      MEETS_EXPECTATION: 3,
      GOOD: 4,
      EXCELLENT: 5,
    };

    const average =
      reviews.length > 0
        ? reviews.reduce(
            (sum, review) => sum + ratingValues[review.rating],
            0
          ) / reviews.length
        : 0;

    return {
      total: reviews.length,
      excellent: count("EXCELLENT"),
      good: count("GOOD"),
      needsImprovement:
        count("POOR") + count("BELOW_EXPECTATION"),
      average,
    };
  }, [reviews]);

  const exportCSV = () => {
    const headers = [
      "Staff Name",
      "Designation",
      "Department",
      "Branch",
      "Rating",
      "Reviewer",
      "Review Date",
      "Next Review Date",
      "Strengths",
      "Improvements",
      "Comments",
    ];

    const rows = filteredReviews.map((review) => [
      review.staff.name,
      review.staff.designation || "",
      review.staff.department || "",
      review.staff.branch?.name || "",
      ratingLabels[review.rating],
      review.reviewer?.name || "",
      formatDate(review.reviewDate),
      review.nextReviewDate
        ? formatDate(review.nextReviewDate)
        : "",
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
    link.download = `staff-performance-${new Date()
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
            <span className="text-gray-800">Performance</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900">
            Staff Performance
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Monitor employee reviews, ratings and improvement areas.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={exportCSV}
            disabled={!filteredReviews.length}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Export CSV
          </button>

          <Link
            href="/admin/staff/performance/reviews"
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            + Add Review
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[
          { label: "Total Reviews", value: stats.total },
          { label: "Excellent Ratings", value: stats.excellent },
          { label: "Good Ratings", value: stats.good },
          { label: "Needs Improvement", value: stats.needsImprovement },
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

      {/* Average rating */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm text-gray-500">
              Average Performance Rating
            </p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {stats.average.toFixed(1)}{" "}
              <span className="text-base font-normal text-gray-400">
                / 5.0
              </span>
            </p>
          </div>

          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                className={`text-2xl ${
                  star <= Math.round(stats.average)
                    ? "text-amber-400"
                    : "text-gray-200"
                }`}
              >
                ★
              </span>
            ))}
          </div>
        </div>

        <p className="mt-3 text-xs text-gray-500">
          Average is calculated from the currently loaded review records.
          It is a summary of review ratings, not an independently measured
          productivity score.
        </p>
      </section>

      {/* Rating distribution */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="font-semibold text-gray-900">
          Rating Distribution
        </h2>

        <div className="mt-5 space-y-4">
          {(
            [
              "EXCELLENT",
              "GOOD",
              "MEETS_EXPECTATION",
              "BELOW_EXPECTATION",
              "POOR",
            ] as PerformanceRating[]
          ).map((rating) => {
            const count = reviews.filter(
              (review) => review.rating === rating
            ).length;

            const percentage =
              reviews.length > 0 ? (count / reviews.length) * 100 : 0;

            return (
              <div key={rating}>
                <div className="mb-2 flex justify-between gap-3 text-sm">
                  <span className="font-medium text-gray-700">
                    {ratingLabels[rating]}
                  </span>
                  <span className="text-gray-500">
                    {count} ({percentage.toFixed(0)}%)
                  </span>
                </div>

                <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Filters */}
      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Search Staff
            </label>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name or designation..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Rating
            </label>
            <select
              value={ratingFilter}
              onChange={(event) => setRatingFilter(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
            >
              <option value="ALL">All ratings</option>
              {Object.entries(ratingLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Department
            </label>
            <select
              value={departmentFilter}
              onChange={(event) => setDepartmentFilter(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
            >
              <option value="ALL">All departments</option>
              {departments.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
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
              min={startDate || undefined}
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
            />
          </div>
        </div>
      </section>

      {/* Reviews table */}
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 p-5">
          <div>
            <h2 className="font-semibold text-gray-900">
              Performance Reviews
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {filteredReviews.length} review(s) found
            </p>
          </div>

          <button
            onClick={fetchReviews}
            disabled={loading}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-gray-500">
            Loading performance reviews...
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-medium text-gray-700">
              No performance reviews found
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Create a review to start tracking staff performance.
            </p>
            <Link
              href="/admin/staff/performance/reviews"
              className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Add Performance Review
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Staff</th>
                  <th className="px-5 py-3 font-semibold">Department</th>
                  <th className="px-5 py-3 font-semibold">Rating</th>
                  <th className="px-5 py-3 font-semibold">Reviewer</th>
                  <th className="px-5 py-3 font-semibold">Review Date</th>
                  <th className="px-5 py-3 font-semibold">Next Review</th>
                  <th className="px-5 py-3 font-semibold">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredReviews.map((review) => (
                  <tr key={review.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/staff/${review.staff.id}`}
                        className="font-semibold text-gray-900 hover:text-blue-600"
                      >
                        {review.staff.name}
                      </Link>
                      <p className="mt-1 text-xs text-gray-500">
                        {review.staff.designation || review.staff.email || "Staff"}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {review.staff.department || "—"}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ratingStyles[review.rating]}`}
                      >
                        {ratingLabels[review.rating]}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {review.reviewer?.name || "—"}
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap text-gray-600">
                      {formatDate(review.reviewDate)}
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap text-gray-600">
                      {review.nextReviewDate
                        ? formatDate(review.nextReviewDate)
                        : "Not scheduled"}
                    </td>

                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/staff/performance/${review.id}`}
                        className="font-medium text-blue-600 hover:text-blue-800"
                      >
                        View Review
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