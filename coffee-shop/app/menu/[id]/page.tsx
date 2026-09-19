"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

type Product = {
  id: string;
  name: string;
  price: number;
  description: string;
  image: string;
  category: string;
  stock: number;
  isAvailable: boolean;
};

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
  };
};

export default function Details() {
  const params = useParams();
  const { status } = useSession();

  const [prod, setProd] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);

  useEffect(() => {
    const fetching = async () => {
      try {
        const res = await fetch(`/api/products/${params.id}`);
        const data = await res.json();

        if (res.ok) {
          setProd(data.data);
        }
      } catch (error) {
        console.error("Error fetching product:", error);
      }
    };

    if (params.id) {
      fetching();
    }
  }, [params.id]);

  // Fetch reviews
  useEffect(() => {
    const fetchReviews = async () => {
      if (!params.id) return;

      try {
        const res = await fetch(`/api/reviews?productId=${params.id}`);
        const data = await res.json();

        if (res.ok && data.success) {
          setReviews(data.data);
        }
      } catch (error) {
        console.error("Error fetching reviews:", error);
      }
    };

    fetchReviews();
  }, [params.id]);

  const submitReview = async () => {
    if (status !== "authenticated") {
      alert("Please login to submit a review.");
      return;
    }

    if (!params.id) return;

    setReviewLoading(true);

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: params.id,
          rating,
          comment,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.message || "Failed to submit review.");
        return;
      }

      alert("Review submitted successfully. It will appear after approval.");

      setComment("");
      setRating(5);
    } catch (error) {
      console.error("Error submitting review:", error);
      alert("Something went wrong.");
    } finally {
      setReviewLoading(false);
    }
  };

  if (!prod) {
    return <div className="p-10">Loading...</div>;
  }

  return (
    <main className="min-h-screen bg-[#f8f3ed] p-6 sm:p-10">
      <div className="mx-auto max-w-5xl">

        {/* Product */}
        <div className="rounded-2xl bg-white p-6 shadow">
          <img
            src={prod.image}
            alt={prod.name}
            className="h-96 w-full rounded-xl object-cover"
          />

          <h1 className="mt-6 text-4xl font-bold text-[#3b2115]">
            {prod.name}
          </h1>

          <p className="mt-3 text-[#80695b]">
            {prod.description}
          </p>

          <p className="mt-4 text-2xl font-bold text-[#4b2e20]">
            ₹{prod.price.toFixed(2)}
          </p>

          <p className="mt-2 text-[#80695b]">
            Category: {prod.category}
          </p>

          <p
            className={`mt-2 font-medium ${
              prod.isAvailable && prod.stock > 0
                ? "text-green-600"
                : "text-red-600"
            }`}
          >
            {prod.isAvailable && prod.stock > 0
              ? `In Stock (${prod.stock})`
              : "Currently Unavailable"}
          </p>
        </div>

        {/* Reviews */}
        <section className="mt-8 rounded-2xl bg-white p-6 shadow">
          <h2 className="text-2xl font-bold text-[#3b2115]">
            ⭐ Reviews & Ratings
          </h2>

          {reviews.length > 0 ? (
            <div className="mt-6 space-y-4">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="rounded-xl border border-[#eadbc9] p-4"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-[#3b2115]">
                      {review.user.name || "Customer"}
                    </p>

                    <span className="text-yellow-500">
                      {"★".repeat(review.rating)}
                      {"☆".repeat(5 - review.rating)}
                    </span>
                  </div>

                  {review.comment && (
                    <p className="mt-2 text-[#80695b]">
                      {review.comment}
                    </p>
                  )}

                  <p className="mt-2 text-xs text-gray-400">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-[#80695b]">
              No reviews yet. Be the first to review this product!
            </p>
          )}
        </section>

        {/* Add Review */}
        <section className="mt-8 rounded-2xl bg-white p-6 shadow">
          <h2 className="text-2xl font-bold text-[#3b2115]">
            Write a Review
          </h2>

          {status === "authenticated" ? (
            <>
              {/* Rating */}
              <div className="mt-5">
                <p className="mb-2 font-medium text-[#3b2115]">
                  Your Rating
                </p>

                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className={`text-3xl ${
                        star <= rating
                          ? "text-yellow-500"
                          : "text-gray-300"
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment */}
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Write your review..."
                rows={4}
                className="mt-5 w-full rounded-xl border border-[#d6c4b5] p-4 outline-none focus:border-[#8b4a24]"
              />

              <button
                type="button"
                onClick={submitReview}
                disabled={reviewLoading}
                className="mt-4 rounded-lg bg-[#8b4a24] px-6 py-3 font-medium text-white transition hover:bg-[#6f391c] disabled:opacity-50"
              >
                {reviewLoading ? "Submitting..." : "Submit Review"}
              </button>
            </>
          ) : (
            <p className="mt-4 text-[#80695b]">
              Please login to write a review.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}