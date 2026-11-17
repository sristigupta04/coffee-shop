
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Search,
  RefreshCw,
  Star,
  MessageSquare,
  CheckCircle,
  Clock,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  User,
  Coffee,
} from "lucide-react";

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string | null;
    image: string | null;
  };
  product: {
    id: string;
    name: string;
    image: string | null;
  };
};

type Summary = {
  totalReviews: number;
  pendingReviews: number;
  approvedReviews: number;
  rejectedReviews: number;
  averageRating: number;
  ratedReviews: number;
};

const initialSummary: Summary = {
  totalReviews: 0,
  pendingReviews: 0,
  approvedReviews: 0,
  rejectedReviews: 0,
  averageRating: 0,
  ratedReviews: 0,
};

const statusOptions = ["ALL", "PENDING", "APPROVED", "REJECTED"];

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<Summary>(initialSummary);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const fetchReviews = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        search: search.trim(),
        status,
        page: String(page),
        limit: "10",
      });

      const response = await fetch(
        `/api/admin/reviews?${params.toString()}`,
        {
          cache: "no-store",
          signal,
        }
      );

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        throw new Error(
          result?.message || "Unable to fetch reviews."
        );
      }

      setReviews(Array.isArray(result.reviews) ? result.reviews : []);

      setSummary({
        totalReviews: Number(result.summary?.totalReviews ?? 0),
        pendingReviews: Number(result.summary?.pendingReviews ?? 0),
        approvedReviews: Number(result.summary?.approvedReviews ?? 0),
        rejectedReviews: Number(result.summary?.rejectedReviews ?? 0),
        averageRating: Number(result.summary?.averageRating ?? 0),
        ratedReviews: Number(result.summary?.ratedReviews ?? 0),
      });

      setTotalPages(
        Math.max(1, Number(result.pagination?.totalPages ?? 1))
      );
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [search, status, page]);

  useEffect(() => {
    const controller = new AbortController();

    const timer = setTimeout(() => {
      void fetchReviews(controller.signal);
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [fetchReviews, refreshKey]);

  async function updateReview(
    reviewId: string,
    nextStatus: "APPROVED" | "REJECTED"
  ) {
    const action = nextStatus === "APPROVED" ? "approve" : "reject";

    if (!window.confirm(`Are you sure you want to ${action} this review?`)) {
      return;
    }

    try {
      setUpdatingId(reviewId);
      setError("");
      setMessage("");

      const response = await fetch("/api/admin/reviews", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: reviewId,
          status: nextStatus,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        throw new Error(
          result?.message || "Unable to update review."
        );
      }

      setMessage(
        result.message || "Review updated successfully."
      );

      setRefreshKey((current) => current + 1);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  const statCards = [
    {
      label: "Total Reviews",
      value: summary.totalReviews,
      icon: MessageSquare,
      style: "bg-blue-50 text-blue-700",
    },
    {
      label: "Pending Reviews",
      value: summary.pendingReviews,
      icon: Clock,
      style: "bg-amber-50 text-amber-700",
    },
    {
      label: "Approved Reviews",
      value: summary.approvedReviews,
      icon: CheckCircle,
      style: "bg-green-50 text-green-700",
    },
    {
      label: "Rejected Reviews",
      value: summary.rejectedReviews,
      icon: XCircle,
      style: "bg-red-50 text-red-700",
    },
  ];

  function getStatusStyle(reviewStatus: Review["status"]) {
    switch (reviewStatus) {
      case "APPROVED":
        return "bg-green-50 text-green-700";
      case "REJECTED":
        return "bg-red-50 text-red-700";
      default:
        return "bg-amber-50 text-amber-700";
    }
  }

  return (
    <div className="min-h-screen space-y-6 bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Reviews Management
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Monitor customer feedback and manage product reviews.
          </p>
        </div>

        <button
          onClick={() => setRefreshKey((current) => current + 1)}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw
            size={17}
            className={loading ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </div>

      {message && (
        <div className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {message}
          <button onClick={() => setMessage("")} aria-label="Dismiss message">
            <X size={16} />
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError("")} aria-label="Dismiss error">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.label}
              className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">
                    {stat.value.toLocaleString("en-IN")}
                  </p>
                </div>

                <div className={`rounded-xl p-3 ${stat.style}`}>
                  <Icon size={22} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">
              Approved Reviews Average Rating
            </p>

            <div className="mt-2 flex items-center gap-3">
              <span className="text-4xl font-bold text-gray-900">
                {summary.averageRating.toFixed(1)}
              </span>

              <div>
                <div className="flex items-center gap-1 text-amber-400">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star
                      key={index}
                      size={18}
                      fill={
                        index < Math.round(summary.averageRating)
                          ? "currentColor"
                          : "none"
                      }
                    />
                  ))}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Based on {summary.ratedReviews.toLocaleString("en-IN")} approved reviews
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-amber-50 px-5 py-4">
            <p className="text-xs font-medium text-amber-800">
              Customer Feedback
            </p>
            <p className="mt-1 text-sm font-semibold text-amber-950">
              Your customers&apos; voices matter.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search customer, product or comment..."
              className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm text-gray-800 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {statusOptions.map((option) => (
              <button
                key={option}
                onClick={() => {
                  setStatus(option);
                  setPage(1);
                }}
                className={`rounded-lg px-4 py-2.5 text-xs font-semibold transition ${
                  status === option
                    ? "bg-amber-700 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {loading ? (
            <div className="py-16 text-center text-sm text-gray-500">
              <RefreshCw
                size={22}
                className="mx-auto mb-3 animate-spin text-amber-700"
              />
              Loading reviews...
            </div>
          ) : reviews.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 py-16 text-center">
              <MessageSquare
                size={34}
                className="mx-auto text-gray-300"
              />
              <p className="mt-3 font-semibold text-gray-700">
                No reviews found
              </p>
              <p className="mt-1 text-sm text-gray-400">
                Try another filter or search term.
              </p>
            </div>
          ) : (
            reviews.map((review) => (
              <div
                key={review.id}
                className="rounded-2xl border border-gray-100 p-4 transition hover:border-amber-200 sm:p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      {review.user?.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={review.user.image}
                          alt={review.user.name || "Customer"}
                          className="h-11 w-11 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                          <User size={20} />
                        </div>
                      )}

                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-gray-900">
                          {review.user?.name || "Unknown customer"}
                        </p>
                        <p className="truncate text-xs text-gray-500">
                          {review.user?.email || "No email available"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      <div className="flex items-center gap-0.5 text-amber-400">
                        {Array.from({ length: 5 }).map((_, index) => (
                          <Star
                            key={index}
                            size={16}
                            fill={
                              index < review.rating
                                ? "currentColor"
                                : "none"
                            }
                          />
                        ))}
                      </div>

                      <span className="text-sm font-semibold text-gray-700">
                        {review.rating}/5
                      </span>
                    </div>

                    <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-gray-600">
                      {review.comment || "No written comment provided."}
                    </p>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-xs font-medium text-gray-600">
                        <Coffee size={14} className="text-amber-700" />
                        {review.product?.name || "Unknown product"}
                      </span>

                      <span className="text-xs text-gray-400">
                        {formatDate(review.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col gap-3 lg:items-end">
                    <span
                      className={`inline-flex w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${getStatusStyle(
                        review.status
                      )}`}
                    >
                      {review.status}
                    </span>

                    {review.status === "PENDING" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            void updateReview(review.id, "APPROVED")
                          }
                          disabled={updatingId === review.id}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
                        >
                          <Check size={15} />
                          Approve
                        </button>

                        <button
                          onClick={() =>
                            void updateReview(review.id, "REJECTED")
                          }
                          disabled={updatingId === review.id}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                        >
                          <X size={15} />
                          Reject
                        </button>
                      </div>
                    )}

                    {updatingId === review.id && (
                      <p className="text-xs text-gray-400">
                        Updating review...
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-6 flex flex-col items-center justify-between gap-3 border-t border-gray-100 pt-5 sm:flex-row">
          <p className="text-xs text-gray-500">
            Page {page} of {totalPages}
          </p>

          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => current - 1)}
              className="rounded-lg border border-gray-200 p-2 text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft size={18} />
            </button>

            <button
              disabled={page >= totalPages || loading}
              onClick={() => setPage((current) => current + 1)}
              className="rounded-lg border border-gray-200 p-2 text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
