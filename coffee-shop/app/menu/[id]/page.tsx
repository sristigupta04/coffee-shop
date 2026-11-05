
"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

type CustomizationOption = {
  id: string;
  name: string;
  priceAdjustment: number;
  isAvailable: boolean;
};

type CustomizationGroup = {
  id: string;
  name: string;
  description: string | null;
  selectionType: "SINGLE" | "MULTIPLE";
  isRequired: boolean;
  minSelections: number;
  maxSelections: number | null;
  options: CustomizationOption[];
};

type Product = {
  id: string;
  name: string;
  price: number;
  description: string;
  image: string;
  category: string | { name: string };
  stock: number;
  isAvailable: boolean;
  customizationGroups?: CustomizationGroup[];
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

  const productId = String(params.id);

  const [prod, setProd] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);

  const [selectedCustomizations, setSelectedCustomizations] =
    useState<Record<string, string[]>>({});

  const [quantity, setQuantity] = useState(1);
  const [cartLoading, setCartLoading] = useState(false);

  // Fetch product
  useEffect(() => {
    const fetching = async () => {
      try {
        const res = await fetch(`/api/products/${productId}`);
        const data = await res.json();

        if (res.ok) {
          setProd(data.data);
          setSelectedCustomizations({});
          setQuantity(1);
        }
      } catch (error) {
        console.error("Error fetching product:", error);
      }
    };

    if (productId) fetching();
  }, [productId]);

  // Fetch reviews
  useEffect(() => {
    const fetchReviews = async () => {
      if (!productId) return;

      try {
        const res = await fetch(
          `/api/reviews?productId=${productId}`
        );

        const data = await res.json();

        if (res.ok && data.success) {
          setReviews(data.data);
        }
      } catch (error) {
        console.error("Error fetching reviews:", error);
      }
    };

    fetchReviews();
  }, [productId]);

  // Handle customization selection
  const handleCustomization = (
    group: CustomizationGroup,
    optionId: string,
    checked: boolean
  ) => {
    setSelectedCustomizations((prev) => {
      const current = prev[group.id] || [];

      if (group.selectionType === "SINGLE") {
        return {
          ...prev,
          [group.id]: checked ? [optionId] : [],
        };
      }

      let updated: string[];

      if (checked) {
        if (
          group.maxSelections !== null &&
          current.length >= group.maxSelections
        ) {
          alert(`You can select maximum ${group.maxSelections} options.`);
          return prev;
        }

        updated = [...current, optionId];
      } else {
        updated = current.filter((id) => id !== optionId);
      }

      return {
        ...prev,
        [group.id]: updated,
      };
    });
  };

  // Calculate live price
  const customizationPrice =
    prod?.customizationGroups?.reduce((total, group) => {
      const selected = selectedCustomizations[group.id] || [];

      const groupPrice = group.options
        .filter((option) => selected.includes(option.id))
        .reduce(
          (sum, option) => sum + Number(option.priceAdjustment),
          0
        );

      return total + groupPrice;
    }, 0) || 0;

  const unitPrice = (prod?.price || 0) + customizationPrice;
  const totalPrice = unitPrice * quantity;

  // Validate customization
  const validateCustomizations = () => {
    if (!prod) return false;

    for (const group of prod.customizationGroups || []) {
      const selected = selectedCustomizations[group.id] || [];

      if (group.isRequired && selected.length === 0) {
        alert(`Please select ${group.name}.`);
        return false;
      }

      if (
        selected.length > 0 &&
        selected.length < group.minSelections
      ) {
        alert(
          `Please select at least ${group.minSelections} option(s) for ${group.name}.`
        );
        return false;
      }

      if (
        group.maxSelections !== null &&
        selected.length > group.maxSelections
      ) {
        alert(
          `Maximum ${group.maxSelections} options allowed for ${group.name}.`
        );
        return false;
      }
    }

    return true;
  };

  // Add to cart
  const addToCart = async () => {
    if (!prod) return;

    if (status !== "authenticated") {
      alert("Please login to add items to cart.");
      return;
    }

    if (!prod.isAvailable || prod.stock <= 0) {
      alert("This product is currently unavailable.");
      return;
    }

    if (quantity > prod.stock) {
      alert(`Only ${prod.stock} items are available.`);
      return;
    }

    if (!validateCustomizations()) return;

    const customizations = Object.entries(selectedCustomizations)
      .filter(([, optionIds]) => optionIds.length > 0)
      .map(([groupId, optionIds]) => ({
        groupId,
        optionIds,
      }));

    setCartLoading(true);

    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: prod.id,
          quantity,
          customizations,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.success === false) {
        alert(data.message || "Unable to add product to cart.");
        return;
      }

      alert("Product added to cart successfully!");
    } catch (error) {
      console.error("Add to cart error:", error);
      alert("Something went wrong while adding to cart.");
    } finally {
      setCartLoading(false);
    }
  };

  // Submit review
  const submitReview = async () => {
    if (status !== "authenticated") {
      alert("Please login to submit a review.");
      return;
    }

    if (!productId) return;

    setReviewLoading(true);

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId,
          rating,
          comment,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.message || "Failed to submit review.");
        return;
      }

      alert(
        "Review submitted successfully. It will appear after approval."
      );

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

        {/* Product Details */}
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
            Category:{" "}
            {typeof prod.category === "string"
              ? prod.category
              : prod.category?.name || "Uncategorized"}
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

          {/* Customizations */}
          {prod.customizationGroups &&
            prod.customizationGroups.length > 0 && (
              <div className="mt-8 space-y-6">
                <h2 className="text-2xl font-bold text-[#3b2115]">
                  Customize Your Order
                </h2>

                {prod.customizationGroups.map((group) => (
                  <div
                    key={group.id}
                    className="rounded-xl border border-[#eadbc9] p-5"
                  >
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-[#3b2115]">
                        {group.name}
                        {group.isRequired && (
                          <span className="ml-2 text-sm text-red-500">
                            * Required
                          </span>
                        )}
                      </h3>

                      {group.description && (
                        <p className="mt-1 text-sm text-[#80695b]">
                          {group.description}
                        </p>
                      )}

                      <p className="mt-1 text-xs text-gray-500">
                        {group.selectionType === "SINGLE"
                          ? "Select one option"
                          : `Select multiple options${
                              group.maxSelections !== null
                                ? ` (Maximum ${group.maxSelections})`
                                : ""
                            }`}
                      </p>
                    </div>

                    <div className="space-y-3">
                      {group.options
                        .filter((option) => option.isAvailable)
                        .map((option) => {
                          const selected = (
                            selectedCustomizations[group.id] || []
                          ).includes(option.id);

                          return (
                            <label
                              key={option.id}
                              className="flex cursor-pointer items-center justify-between rounded-lg border border-[#eadbc9] p-3 transition hover:bg-[#f8f3ed]"
                            >
                              <div className="flex items-center gap-3">
                                <input
                                  type={
                                    group.selectionType === "SINGLE"
                                      ? "radio"
                                      : "checkbox"
                                  }
                                  name={`customization-${group.id}`}
                                  checked={selected}
                                  onChange={(e) =>
                                    handleCustomization(
                                      group,
                                      option.id,
                                      e.target.checked
                                    )
                                  }
                                  className="h-4 w-4 accent-[#8b4a24]"
                                />

                                <span className="font-medium text-[#3b2115]">
                                  {option.name}
                                </span>
                              </div>

                              <span className="text-sm font-medium text-[#8b4a24]">
                                {Number(option.priceAdjustment) > 0
                                  ? `+₹${Number(
                                      option.priceAdjustment
                                    ).toFixed(2)}`
                                  : Number(option.priceAdjustment) < 0
                                  ? `-₹${Math.abs(
                                      Number(option.priceAdjustment)
                                    ).toFixed(2)}`
                                  : "Included"}
                              </span>
                            </label>
                          );
                        })}
                    </div>
                  </div>
                ))}
              </div>
            )}

          {/* Quantity */}
          <div className="mt-8">
            <h3 className="mb-3 font-semibold text-[#3b2115]">
              Quantity
            </h3>

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() =>
                  setQuantity((prev) => Math.max(1, prev - 1))
                }
                disabled={quantity <= 1}
                className="rounded-lg border border-[#d6c4b5] px-4 py-2 disabled:opacity-40"
              >
                −
              </button>

              <span className="text-lg font-semibold text-[#3b2115]">
                {quantity}
              </span>

              <button
                type="button"
                onClick={() =>
                  setQuantity((prev) =>
                    Math.min(prod.stock, prev + 1)
                  )
                }
                disabled={quantity >= prod.stock}
                className="rounded-lg border border-[#d6c4b5] px-4 py-2 disabled:opacity-40"
              >
                +
              </button>
            </div>
          </div>

          {/* Price Summary */}
          <div className="mt-8 rounded-xl bg-[#f8f3ed] p-5">
            <div className="flex justify-between text-[#80695b]">
              <span>Base Price</span>
              <span>₹{prod.price.toFixed(2)}</span>
            </div>

            <div className="mt-2 flex justify-between text-[#80695b]">
              <span>Customization</span>
              <span>
                {customizationPrice >= 0 ? "+" : "-"}₹
                {Math.abs(customizationPrice).toFixed(2)}
              </span>
            </div>

            <div className="mt-3 flex justify-between border-t border-[#d6c4b5] pt-3 font-semibold text-[#3b2115]">
              <span>Unit Price</span>
              <span>₹{unitPrice.toFixed(2)}</span>
            </div>

            <div className="mt-2 flex justify-between text-xl font-bold text-[#4b2e20]">
              <span>Total Price ({quantity})</span>
              <span>₹{totalPrice.toFixed(2)}</span>
            </div>
          </div>

          {/* Add to Cart */}
          <button
            type="button"
            onClick={addToCart}
            disabled={
              cartLoading ||
              !prod.isAvailable ||
              prod.stock <= 0
            }
            className="mt-6 w-full rounded-xl bg-[#8b4a24] px-6 py-4 font-semibold text-white transition hover:bg-[#6f391c] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cartLoading
              ? "Adding to Cart..."
              : !prod.isAvailable || prod.stock <= 0
              ? "Currently Unavailable"
              : `Add to Cart · ₹${totalPrice.toFixed(2)}`}
          </button>
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
                    {new Date(
                      review.createdAt
                    ).toLocaleDateString()}
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

        {/* Write a Review */}
        <section className="mt-8 rounded-2xl bg-white p-6 shadow">
          <h2 className="text-2xl font-bold text-[#3b2115]">
            Write a Review
          </h2>

          {status === "authenticated" ? (
            <>
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
                {reviewLoading
                  ? "Submitting..."
                  : "Submit Review"}
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
