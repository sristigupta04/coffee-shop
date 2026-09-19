"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Heart, Star, Plus } from "lucide-react";

type Product = {
  id: string;
  name: string;
  price: number;
  description: string;
  categoryId: string;
  imageUrl: string;
  onAddToCart: (quantity: number) => void;
};

type MenuCardProps = {
  product: Product;
};

export default function MenuCard({
  product,
}: MenuCardProps) {
  const { status } = useSession();

  const [wishlist, setWishlist] = useState(false);
  const [wishlistLoading, setWishlistLoading] =
    useState(false);

  // =========================
  // CHECK WISHLIST
  // =========================
  useEffect(() => {
    if (status !== "authenticated") return;

    const checkWishlist = async () => {
      try {
        const res = await fetch("/api/wishlist");

        if (!res.ok) return;

        const data = await res.json();

        const wishlistItems = data.wishlist || [];

        const exists = wishlistItems.some(
          (item: any) =>
            item.productId === product.id
        );

        setWishlist(exists);
      } catch (error) {
        console.error(
          "Error fetching wishlist:",
          error
        );
      }
    };

    checkWishlist();
  }, [status, product.id]);

  // =========================
  // WISHLIST
  // =========================
  const toggleWishlist = async () => {
    if (status !== "authenticated") {
      alert("Please log in to manage your wishlist.");
      return;
    }

    if (wishlistLoading) return;

    try {
      setWishlistLoading(true);

      if (!wishlist) {
        const res = await fetch("/api/wishlist", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            productId: product.id,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          console.error(
            data.message ||
              "Failed to add to wishlist"
          );
          return;
        }

        setWishlist(true);
      } else {
        const res = await fetch("/api/wishlist", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            productId: product.id,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          console.error(
            data.message ||
              "Failed to remove from wishlist"
          );
          return;
        }

        setWishlist(false);
      }
    } catch (error) {
      console.error(
        "Error managing wishlist:",
        error
      );
    } finally {
      setWishlistLoading(false);
    }
  };

  return (
    <article
      className="
        group
        relative
        flex
        w-full
        flex-col
        overflow-hidden
        border
        border-[#ded5cc]
        bg-[#fcfaf6]
        transition-all
        duration-500
        hover:-translate-y-1
        hover:border-[#b8a89a]
        hover:shadow-[0_20px_45px_rgba(59,33,21,0.10)]
      "
    >
      {/* =========================
          IMAGE
      ========================= */}
      <div
        className="
          relative
          aspect-[4/3]
          w-full
          overflow-hidden
          bg-[#e8dfd6]
        "
      >
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="
              h-full
              w-full
              object-cover
              transition-transform
              duration-700
              ease-out
              group-hover:scale-[1.045]
            "
          />
        ) : (
          <div
            className="
              flex
              h-full
              items-center
              justify-center
              text-6xl
            "
          >
            ☕
          </div>
        )}

        {/* subtle image overlay */}
        <div
          className="
            pointer-events-none
            absolute
            inset-0
            bg-gradient-to-t
            from-black/15
            via-transparent
            to-black/5
          "
        />

        {/* =========================
            RATING
        ========================= */}
        <div
          className="
            absolute
            left-4
            top-4
            flex
            items-center
            gap-1.5
            rounded-full
            border
            border-white/60
            bg-white/92
            px-3
            py-1.5
            text-xs
            font-semibold
            text-[#3b2115]
            shadow-sm
            backdrop-blur-md
          "
        >
          <Star
            size={12}
            strokeWidth={1.8}
            className="
              fill-[#b47a32]
              text-[#b47a32]
            "
          />

          <span>4.5</span>
        </div>

        {/* =========================
            WISHLIST
        ========================= */}
        <button
          type="button"
          onClick={toggleWishlist}
          disabled={wishlistLoading}
          aria-label={
            wishlist
              ? "Remove from wishlist"
              : "Add to wishlist"
          }
          className="
            absolute
            right-4
            top-4
            flex
            h-10
            w-10
            items-center
            justify-center
            rounded-full
            border
            border-white/60
            bg-white/92
            text-[#3b2115]
            shadow-sm
            backdrop-blur-md
            transition-all
            duration-300
            hover:scale-105
            hover:bg-white
            disabled:cursor-not-allowed
            disabled:opacity-50
          "
        >
          <Heart
            size={18}
            strokeWidth={1.7}
            className={
              wishlist
                ? "fill-[#8b4a24] text-[#8b4a24]"
                : "text-[#3b2115]"
            }
          />
        </button>
      </div>

      {/* =========================
          CONTENT
      ========================= */}
      <div
        className="
          flex
          flex-1
          flex-col
          px-5
          pb-5
          pt-5
          sm:px-6
        "
      >
        {/* PRODUCT NAME */}
        <h2
          className="
            line-clamp-1
            text-[22px]
            font-semibold
            leading-tight
            tracking-[-0.025em]
            text-[#2f1b12]
            transition-colors
            duration-300
            group-hover:text-[#8b4a24]
          "
        >
          {product.name}
        </h2>

        {/* DESCRIPTION */}
        <p
          className="
            mt-3
            line-clamp-3
            min-h-[60px]
            text-[13px]
            leading-[1.65]
            text-[#75665c]
          "
        >
          {product.description}
        </p>

        {/* DIVIDER */}
        <div
          className="
            mt-5
            border-t
            border-[#e3dbd2]
          "
        />

        {/* =========================
            PRICE + ORDER
        ========================= */}
        <div
          className="
            mt-4
            flex
            items-center
            justify-between
            gap-4
          "
        >
          {/* PRICE */}
          <div>
            <span
              className="
                text-[25px]
                font-semibold
                tracking-[-0.04em]
                text-[#3b2115]
              "
            >
              ₹{product.price.toFixed(0)}
            </span>
          </div>

          {/* ORDER BUTTON */}
          <button
            type="button"
            onClick={() =>
              product.onAddToCart(1)
            }
            className="
              flex
              items-center
              gap-2
              rounded-full
              bg-[#3b2115]
              px-5
              py-3
              text-xs
              font-semibold
              uppercase
              tracking-[0.10em]
              text-white
              transition-all
              duration-300
              hover:bg-[#8b4a24]
              active:scale-[0.97]
            "
          >
            <Plus
              size={14}
              strokeWidth={2}
            />

            <span>Order</span>
          </button>
        </div>
      </div>
    </article>
  );
}