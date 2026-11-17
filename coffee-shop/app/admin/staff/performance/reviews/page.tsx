"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type StaffMember = {
  id: string;
  name: string;
  designation: string;
  department?: string | null;
  branch?: { name: string } | null;
};

type PerformanceReview = {
  id: string;
  staffId: string;
  reviewerId?: string | null;
  rating:
    | "POOR"
    | "BELOW_EXPECTATION"
    | "MEETS_EXPECTATION"
    | "GOOD"
    | "EXCELLENT";
  reviewDate: string;
  nextReviewDate?: string | null;
  strengths?: string | null;
  improvements?: string | null;
  comments?: string | null;
  staff: StaffMember;
  reviewer?: { name: string } | null;
};

const ratings = [
  { value: "EXCELLENT", label: "Excellent" },
  { value: "GOOD", label: "Good" },
  { value: "MEETS_EXPECTATION", label: "Meets Expectation" },
  { value: "BELOW_EXPECTATION", label: "Below Expectation" },
  { value: "POOR", label: "Poor" },
] as const;

const ratingStyles: Record<string, string> = {
  EXCELLENT: "bg-green-50 text-green-700",
  GOOD: "bg-blue-50 text-blue-700",
  MEETS_EXPECTATION: "bg-yellow-50 text-yellow-700",
  BELOW_EXPECTATION: "bg-orange-50 text-orange-700",
  POOR: "bg-red-50 text-red-700",
};

const initialForm = {
  staffId: "",
  rating: "MEETS_EXPECTATION",
  reviewDate: new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  }),
  nextReviewDate: "",
  strengths: "",
  improvements: "",
  comments: "",
};

export default function PerformanceReviewsPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState("ALL");

  const [form, setForm] = useState(initialForm);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [staffResponse, reviewResponse] = await Promise.all([
        fetch("/api/admin/staff?status=active"),
        fetch("/api/admin/staff/performance"),
      ]);

      const staffData = await staffResponse.json();
      const reviewData = await reviewResponse.json();

      if (!staffResponse.ok) {
        throw new Error(staffData.message || "Unable to load staff.");
      }

      if (!reviewResponse.ok) {
        throw new Error(
          reviewData.message || "Unable to load performance reviews."
        );
      }

      setStaff(staffData.staff ?? staffData.data ?? []);
      setReviews(
        reviewData.reviews ?? reviewData.records ?? reviewData.data ?? []
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredReviews = reviews.filter((review) => {
    const matchesSearch =
      review.staff.name.toLowerCase().includes(search.toLowerCase()) ||
      (review.staff.department || "")
        .toLowerCase()
        .includes(search.toLowerCase());

    const matchesRating =
      ratingFilter === "ALL" || review.rating === ratingFilter;

    return matchesSearch && matchesRating;
  });

  const handleCreateReview = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      if (
        form.nextReviewDate &&
        form.nextReviewDate < form.reviewDate
      ) {
        throw new Error("Next review date cannot be before review date.");
      }

      const response = await fetch("/api/admin/staff/performance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          staffId: form.staffId,
          rating: form.rating,
          reviewDate: form.reviewDate,
          nextReviewDate: form.nextReviewDate || null,
          strengths: form.strengths.trim() || null,
          improvements: form.improvements.trim() || null,
          comments: form.comments.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to create review.");
      }

      setSuccess("Performance review created successfully.");
      setForm(initialForm);
      setShowForm(false);

      await fetchData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    }).format(new Date(value));

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
              href="/admin/staff/performance"
              className="hover:text-blue-600"
            >
              Performance
            </Link>
            <span>/</span>
            <span className="text-gray-800">Reviews</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900">
            Performance Reviews
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Create and manage employee performance evaluations.
          </p>
        </div>

        <button
          onClick={() => {
            setError("");
            setSuccess("");
            setShowForm(!showForm);
          }}
          className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          {showForm ? "Close Form" : "+ Create Review"}
        </button>
      </div>

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

      {/* Create Review Form */}
      {showForm && (
        <section className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-gray-900">
              Create Performance Review
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Fill in the employee evaluation details.
            </p>
          </div>

          <form onSubmit={handleCreateReview} className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Select Staff *
                </label>

                <select
                  required
                  value={form.staffId}
                  onChange={(event) =>
                    setForm({ ...form, staffId: event.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                >
                  <option value="">Select employee</option>
                  {staff.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name} — {member.designation}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Performance Rating *
                </label>

                <select
                  required
                  value={form.rating}
                  onChange={(event) =>
                    setForm({ ...form, rating: event.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                >
                  {ratings.map((rating) => (
                    <option key={rating.value} value={rating.value}>
                      {rating.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Review Date *
                </label>

                <input
                  type="date"
                  required
                  value={form.reviewDate}
                  onChange={(event) =>
                    setForm({ ...form, reviewDate: event.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Next Review Date
                </label>

                <input
                  type="date"
                  min={form.reviewDate}
                  value={form.nextReviewDate}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      nextReviewDate: event.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Strengths
              </label>

              <textarea
                rows={3}
                value={form.strengths}
                onChange={(event) =>
                  setForm({ ...form, strengths: event.target.value })
                }
                placeholder="Mention employee's strengths, achievements and positive contributions..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Areas for Improvement
              </label>

              <textarea
                rows={3}
                value={form.improvements}
                onChange={(event) =>
                  setForm({
                    ...form,
                    improvements: event.target.value,
                  })
                }
                placeholder="Mention skills or areas that need improvement..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Additional Comments
              </label>

              <textarea
                rows={3}
                value={form.comments}
                onChange={(event) =>
                  setForm({ ...form, comments: event.target.value })
                }
                placeholder="Add overall feedback or review notes..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
              />
            </div>

            <div className="flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-5">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving || staff.length === 0}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Review"}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Filters */}
      <section className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search staff or department..."
          className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
        />

        <select
          value={ratingFilter}
          onChange={(event) => setRatingFilter(event.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
        >
          <option value="ALL">All ratings</option>
          {ratings.map((rating) => (
            <option key={rating.value} value={rating.value}>
              {rating.label}
            </option>
          ))}
        </select>

        <button
          onClick={fetchData}
          disabled={loading}
          className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Refresh
        </button>
      </section>

      {/* Review List */}
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900">
            Review History
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {filteredReviews.length} review(s) found
          </p>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-gray-500">
            Loading reviews...
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-medium text-gray-700">
              No reviews found
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Create a performance review to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-5 py-3">Employee</th>
                  <th className="px-5 py-3">Department</th>
                  <th className="px-5 py-3">Rating</th>
                  <th className="px-5 py-3">Reviewer</th>
                  <th className="px-5 py-3">Review Date</th>
                  <th className="px-5 py-3">Next Review</th>
                  <th className="px-5 py-3">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredReviews.map((review) => (
                  <tr key={review.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-gray-900">
                        {review.staff.name}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {review.staff.designation}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {review.staff.department || "—"}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          ratingStyles[review.rating]
                        }`}
                      >
                        {ratings.find(
                          (rating) => rating.value === review.rating
                        )?.label || review.rating}
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
                        : "—"}
                    </td>

                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/staff/performance/${review.id}`}
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