"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type Review = {
  id: string;
  rating: string;
  reviewDate: string;
  nextReviewDate?: string | null;
  strengths?: string | null;
  improvements?: string | null;
  comments?: string | null;
  staff: {
    id: string;
    name: string;
    designation: string;
    department?: string | null;
    branch?: { name: string } | null;
  };
  reviewer?: { name: string } | null;
};

const ratings: Record<string, string> = {
  POOR: "Poor",
  BELOW_EXPECTATION: "Below Expectation",
  MEETS_EXPECTATION: "Meets Expectation",
  GOOD: "Good",
  EXCELLENT: "Excellent",
};

const formatDate = (date: string) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(date));

export default function PerformanceReviewDetailsPage() {
  const params = useParams<{ id: string }>();
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchReview = useCallback(async () => {
    try {
      setLoading(true);

      const response = await fetch(
        `/api/admin/staff/performance/${params.id}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load review.");
      }

      setReview(data.review ?? data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchReview();
  }, [fetchReview]);

  if (loading) {
    return (
      <div className="p-8 text-center text-sm text-gray-500">
        Loading review...
      </div>
    );
  }

  if (error || !review) {
    return (
      <div className="space-y-4 p-6">
        <p className="text-sm text-red-600">
          {error || "Review not found."}
        </p>
        <Link
          href="/admin/staff/performance"
          className="text-sm font-medium text-blue-600"
        >
          Back to Performance
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/admin/staff/performance"
            className="text-sm text-gray-500 hover:text-blue-600"
          >
            Staff Performance / Reviews
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">
            Performance Review
          </h1>
        </div>

        <Link
          href={`/admin/staff/${review.staff.id}`}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Staff Profile
        </Link>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {review.staff.name}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {review.staff.designation}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {review.staff.department || "No department"} ·{" "}
              {review.staff.branch?.name || "No branch"}
            </p>
          </div>

          <div>
            <span className="rounded-full bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">
              {ratings[review.rating] || review.rating}
            </span>
          </div>
        </div>

        <div className="mt-6 grid gap-4 border-t border-gray-100 pt-5 sm:grid-cols-3">
          <div>
            <p className="text-xs text-gray-500">Review Date</p>
            <p className="mt-1 text-sm font-medium text-gray-900">
              {formatDate(review.reviewDate)}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-500">Next Review</p>
            <p className="mt-1 text-sm font-medium text-gray-900">
              {review.nextReviewDate
                ? formatDate(review.nextReviewDate)
                : "Not scheduled"}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-500">Reviewed By</p>
            <p className="mt-1 text-sm font-medium text-gray-900">
              {review.reviewer?.name || "Not specified"}
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="font-semibold text-gray-900">Strengths</h3>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-600">
            {review.strengths || "No strengths recorded."}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="font-semibold text-gray-900">
            Areas for Improvement
          </h3>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-600">
            {review.improvements || "No improvement areas recorded."}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="font-semibold text-gray-900">
            Additional Comments
          </h3>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-600">
            {review.comments || "No additional comments."}
          </p>
        </div>
      </section>
    </div>
  );
}