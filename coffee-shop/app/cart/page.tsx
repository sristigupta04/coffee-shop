
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { useSession } from "next-auth/react";

type CustomizationSnapshot = {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  priceAdjustment: number;
};

type Cart = {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  name: string;
  description: string;
  image: string;
  customizations: CustomizationSnapshot[];
};

type Product = {
  id: string;
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
  image?: string;
  isAvailable?: boolean;
};

type ApiCartItem = {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  customizations?: CustomizationSnapshot[] | null;
  product: {
    id: string;
    name: string;
    description?: string;
    image?: string;
  };
};

const formatCartItem = (item: ApiCartItem): Cart => ({
  id: item.id,
  productId: item.productId,
  quantity: item.quantity,
  price: Number(item.price),
  name: item.product.name,
  description: item.product.description || "",
  image: item.product.image || "",
  customizations: Array.isArray(item.customizations)
    ? item.customizations
    : [],
});

export default function Page() {
  const [cart, setcart] = useState<Cart[]>([]);
  const [recommend, setRecommend] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [load, setload] = useState(true);
  const [updatingItems, setUpdatingItems] = useState<string[]>([]);
  const [clearing, setClearing] = useState(false);

  const { status, data: session } = useSession();

  // Fetch cart and recommended products
  useEffect(() => {
    const getData = async () => {
      if (status === "loading") return;

      if (status !== "authenticated" || !session?.user?.id) {
        setcart([]);
        setload(false);
        return;
      }

      try {
        const userId = session.user.id;

        const res = await fetch(`/api/cart/${userId}`, {
          headers: { userId },
        });

        const cartdata = await res.json();

        if (!res.ok) {
          throw new Error(
            cartdata.message || "Failed to fetch cart"
          );
        }

        const cartItems: ApiCartItem[] =
          cartdata.data?.items || [];

        const formattedCart = cartItems.map(formatCartItem);

        setcart(formattedCart);

        const productsRes = await fetch("/api/products");
        const productsData = await productsRes.json();

        if (!productsRes.ok) {
          throw new Error(
            productsData.message || "Failed to fetch products"
          );
        }

        const products: Product[] = productsData.data || [];

        const formattedProducts = products.filter(
          (product) => product.isAvailable !== false
        );

        setAllProducts(formattedProducts);

        const recommended = formattedProducts
          .filter(
            (product) =>
              !cartItems.some(
                (item) => item.productId === product.id
              )
          )
          .slice(0, 3);

        setRecommend(recommended);
      } catch (error) {
        console.error("Cart loading error:", error);
      } finally {
        setload(false);
      }
    };

    getData();
  }, [status, session]);

  const totalItems = cart.reduce(
    (acc, item) => acc + item.quantity,
    0
  );

  const subtotal = cart.reduce(
    (acc, item) => acc + Number(item.price) * item.quantity,
    0
  );

  const tax = subtotal * 0.05;
  const grandTotal = subtotal + tax;

  // Notify Navbar about cart changes
  const cartChanged = (updatedCart: Cart[]) => {
    const count = updatedCart.reduce(
      (acc, item) => acc + item.quantity,
      0
    );

    window.dispatchEvent(
      new CustomEvent("cartUpdated", {
        detail: { count },
      })
    );
  };

  const setUpdatedCart = (updatedCart: Cart[]) => {
    setcart(updatedCart);
    cartChanged(updatedCart);
  };

  // Remove cart item
  const remove = async (id: string) => {
    try {
      if (status !== "authenticated" || !session?.user?.id) {
        alert("Please log in to remove items from your cart.");
        return;
      }

      const item = cart.find((item) => item.id === id);

      if (!item) return;

      const res = await fetch(`/api/cart/${session.user.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cartItemId: item.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.message || "Failed to remove item from cart"
        );
      }

      const updatedCart = cart.filter(
        (item) => item.id !== id
      );

      setUpdatedCart(updatedCart);
    } catch (error) {
      console.error("Error removing item:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to remove item."
      );
    }
  };

  // Move item to wishlist
  const moveToWishlist = async (item: Cart) => {
    if (!item.productId) {
      alert("Product ID is missing.");
      return;
    }

    if (
      status !== "authenticated" ||
      !session?.user?.id
    ) {
      alert("Please login to use wishlist.");
      return;
    }

    try {
      const wishlistRes = await fetch("/api/wishlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: item.productId,
        }),
      });

      const wishlistData = await wishlistRes.json();

      if (!wishlistRes.ok) {
        const alreadyExists =
          wishlistRes.status === 400 &&
          wishlistData.message ===
            "Product already in wishlist";

        if (!alreadyExists) {
          throw new Error(
            wishlistData.message ||
              "Failed to add to wishlist"
          );
        }
      }

      const cartRes = await fetch(
        `/api/cart/${session.user.id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            cartItemId: item.id,
          }),
        }
      );

      const cartData = await cartRes.json();

      if (!cartRes.ok) {
        throw new Error(
          cartData.message ||
            "Failed to remove item from cart"
        );
      }

      const updatedCart = cart.filter(
        (cartItem) => cartItem.id !== item.id
      );

      setUpdatedCart(updatedCart);

      alert("Moved to wishlist ❤️");
    } catch (error) {
      console.error("Move to wishlist error:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Something went wrong"
      );
    }
  };

  // Update a specific cart line quantity
  const updateQuantity = async (
    id: string,
    newQuantity: number
  ) => {
    const item = cart.find((item) => item.id === id);

    if (
      !item ||
      status !== "authenticated" ||
      !session?.user?.id
    ) {
      return;
    }

    if (newQuantity < 1 || newQuantity > 99) {
      return;
    }

    if (updatingItems.includes(id)) return;

    setUpdatingItems((prev) => [...prev, id]);

    try {
      const res = await fetch(
        `/api/cart/${session.user.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            cartItemId: item.id,
            quantity: newQuantity,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok || data.success === false) {
        throw new Error(
          data.message || "Failed to update quantity"
        );
      }

      const updatedCart = cart.map((cartItem) =>
        cartItem.id === id
          ? {
              ...cartItem,
              quantity: newQuantity,
              price: Number(
                data.data?.price ?? cartItem.price
              ),
            }
          : cartItem
      );

      setUpdatedCart(updatedCart);
    } catch (error) {
      console.error("Quantity update error:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to update quantity"
      );
    } finally {
      setUpdatingItems((prev) =>
        prev.filter((itemId) => itemId !== id)
      );
    }
  };

  const add = async (id: string) => {
    const item = cart.find((item) => item.id === id);

    if (!item) return;

    await updateQuantity(id, item.quantity + 1);
  };

  const subtract = async (id: string) => {
    const item = cart.find((item) => item.id === id);

    if (!item) return;

    if (item.quantity <= 1) {
      await remove(id);
      return;
    }

    await updateQuantity(id, item.quantity - 1);
  };

  // Clear complete cart
  const clear = async () => {
    if (status !== "authenticated" || !session?.user?.id) {
      alert("Please log in to clear your cart.");
      return;
    }

    if (cart.length === 0 || clearing) return;

    if (!window.confirm("Are you sure you want to clear your cart?")) {
      return;
    }

    setClearing(true);

    try {
      const res = await fetch(
        `/api/cart/${session.user.id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            clearAll: true,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        // Fallback: remove every product from the cart.
        await Promise.all(
          cart.map(async (item) => {
            const deleteRes = await fetch(
              `/api/cart/${session.user.id}`,
              {
                method: "DELETE",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  productId: item.productId,
                }),
              }
            );

            const deleteData = await deleteRes.json();

            if (!deleteRes.ok) {
              throw new Error(
                deleteData.message || "Failed to clear cart"
              );
            }
          })
        );
      } else if (data.success === false) {
        throw new Error(data.message || "Failed to clear cart");
      }

      setUpdatedCart([]);
    } catch (error) {
      console.error("Error clearing cart:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to clear cart"
      );
    } finally {
      setClearing(false);
    }
  };

  // Add recommended product
  const addRecommended = async (product: Product) => {
    if (
      status !== "authenticated" ||
      !session?.user?.id
    ) {
      alert("Please log in to add items to your cart.");
      return;
    }

    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: product.id,
          quantity: 1,
          customizations: [],
        }),
      });

      const data = await res.json();

      if (!res.ok || data.success === false) {
        throw new Error(
          data.message || "Failed to add item to cart"
        );
      }

      // Refresh cart from server
      const cartRes = await fetch(
        `/api/cart/${session.user.id}`,
        {
          headers: {
            userId: session.user.id,
          },
        }
      );

      const cartData = await cartRes.json();

      if (!cartRes.ok) {
        throw new Error(
          cartData.message || "Failed to refresh cart"
        );
      }

      const newCart: ApiCartItem[] =
        cartData.data?.items || [];

      const formattedCart = newCart.map(formatCartItem);

      setUpdatedCart(formattedCart);

      const newRecommend = allProducts
        .filter(
          (item) =>
            !newCart.some(
              (cartItem) => cartItem.productId === item.id
            )
        )
        .slice(0, 3);

      setRecommend(newRecommend);

      alert("Product added to cart successfully!");
    } catch (error) {
      console.error(
        "Error adding recommended item to cart:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Failed to add product"
      );
    }
  };

  if (load || status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f0e7]">
        <p className="text-[#40594b]">Loading cart...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f0e7] px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">

        {/* HEADER */}
        <div className="mb-8">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#70806e]">
            Coffee Shop
          </p>

          <div className="mt-2 flex items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl font-semibold text-[#39423b] sm:text-5xl">
                Your Cart
              </h1>

              <p className="mt-2 text-sm text-[#7b8178]">
                {totalItems}{" "}
                {totalItems === 1 ? "item" : "items"}
              </p>
            </div>
          </div>
        </div>

        {/* CART + SUMMARY */}
        <div className="grid gap-7 lg:grid-cols-[1fr_330px]">

          {/* CART */}
          <section className="rounded-[28px] border border-[#ddd7ca] bg-[#fbf7ef] p-5 sm:p-7">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#39423b]">
                Cart Items
              </h2>

              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={clear}
                  disabled={clearing}
                  className="text-sm text-[#7b8178] transition hover:text-[#40594b] disabled:opacity-50"
                >
                  {clearing ? "Clearing..." : "Clear Cart"}
                </button>
              )}
            </div>

            {/* EMPTY CART */}
            {cart.length === 0 ? (
              <div className="py-16 text-center">
                <div className="text-5xl">🛒</div>

                <h2 className="mt-5 text-xl font-semibold text-[#39423b]">
                  Your cart is empty
                </h2>

                <p className="mt-2 text-sm text-[#7b8178]">
                  Add your favourite coffee to continue.
                </p>

                <Link
                  href="/menu"
                  className="mt-6 inline-block rounded-full bg-[#40594b] px-7 py-3 text-sm font-semibold text-white transition hover:bg-[#33483c]"
                >
                  Browse Menu
                </Link>
              </div>
            ) : (
              <div>
                {cart.map((item) => (
                  <article
                    key={item.id}
                    className="border-b border-[#ded9ce] py-5 first:pt-2 last:border-b-0"
                  >
                    <div className="flex gap-4">

                      {/* IMAGE */}
                      <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-[#e1e6dc] sm:h-28 sm:w-28">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-3xl">
                            ☕
                          </div>
                        )}
                      </div>

                      {/* PRODUCT DETAILS */}
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between gap-3">
                          <div>
                            <h3 className="text-lg font-semibold text-[#39423b]">
                              {item.name}
                            </h3>

                            {item.description && (
                              <p className="mt-1 line-clamp-2 text-sm text-[#858a82]">
                                {item.description}
                              </p>
                            )}

                            <p className="mt-2 text-sm text-[#69766a]">
                              Unit Price: ₹
                              {Number(item.price).toFixed(2)}
                            </p>
                          </div>

                          {/* ACTIONS */}
                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              type="button"
                              onClick={() => moveToWishlist(item)}
                              className="flex h-9 w-9 items-center justify-center rounded-full text-[#7b8178] transition hover:bg-[#e1e6dc] hover:text-[#b75d08]"
                              aria-label={`Move ${item.name} to wishlist`}
                              title="Move to wishlist"
                            >
                              <Heart size={18} />
                            </button>

                            <button
                              type="button"
                              onClick={() => remove(item.id)}
                              className="flex h-9 w-9 items-center justify-center rounded-full text-[#7b8178] transition hover:bg-[#e1e6dc] hover:text-[#40594b]"
                              aria-label={`Remove ${item.name}`}
                              title="Remove from cart"
                            >
                              🗑
                            </button>
                          </div>
                        </div>

                        {/* CUSTOMIZATIONS */}
                        {item.customizations.length > 0 && (
                          <div className="mt-3 rounded-xl bg-[#f1eee5] p-3">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#69766a]">
                              Your Customizations
                            </p>

                            <div className="space-y-1">
                              {item.customizations.map(
                                (customization) => (
                                  <div
                                    key={`${customization.groupId}-${customization.optionId}`}
                                    className="flex justify-between gap-3 text-sm text-[#858a82]"
                                  >
                                    <span>
                                      {customization.groupName}:{" "}
                                      {customization.optionName}
                                    </span>

                                    <span className="shrink-0">
                                      {Number(
                                        customization.priceAdjustment
                                      ) > 0
                                        ? `+₹${Number(
                                            customization.priceAdjustment
                                          ).toFixed(2)}`
                                        : Number(
                                            customization.priceAdjustment
                                          ) < 0
                                        ? `-₹${Math.abs(
                                            Number(
                                              customization.priceAdjustment
                                            )
                                          ).toFixed(2)}`
                                        : "Included"}
                                    </span>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        )}

                        {/* QUANTITY */}
                        <div className="mt-5 flex items-center justify-between">
                          <div className="flex items-center rounded-full border border-[#cfd5ca] bg-[#f4f5ef]">
                            <button
                              type="button"
                              onClick={() => subtract(item.id)}
                              disabled={updatingItems.includes(item.id)}
                              className="flex h-9 w-9 items-center justify-center rounded-full text-lg text-[#40594b] transition hover:bg-[#e1e6dc] disabled:opacity-40"
                            >
                              −
                            </button>

                            <span className="w-8 text-center text-sm font-semibold text-[#39423b]">
                              {item.quantity}
                            </span>

                            <button
                              type="button"
                              onClick={() => add(item.id)}
                              disabled={
                                updatingItems.includes(item.id) ||
                                item.quantity >= 99
                              }
                              className="flex h-9 w-9 items-center justify-center rounded-full text-lg text-[#40594b] transition hover:bg-[#e1e6dc] disabled:opacity-40"
                            >
                              +
                            </button>
                          </div>

                          <p className="font-semibold text-[#39423b]">
                            ₹
                            {(
                              Number(item.price) * item.quantity
                            ).toFixed(2)}
                          </p>
                        </div>

                        {updatingItems.includes(item.id) && (
                          <p className="mt-2 text-xs text-[#858a82]">
                            Updating quantity...
                          </p>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {/* CONTINUE SHOPPING */}
            <Link
              href="/menu"
              className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[#40594b] hover:underline"
            >
              ← Continue Shopping
            </Link>
          </section>

          {/* ORDER SUMMARY */}
          <aside className="h-fit rounded-[28px] bg-[#e1e6dc] p-6 lg:sticky lg:top-24">
            <h2 className="text-2xl font-semibold text-[#39423b]">
              Order Summary
            </h2>

            <div className="mt-7 space-y-4">
              <div className="flex justify-between text-sm text-[#6f786f]">
                <span>Items ({totalItems})</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-sm text-[#6f786f]">
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-sm text-[#6f786f]">
                <span>Tax (5%)</span>
                <span>₹{tax.toFixed(2)}</span>
              </div>

              <div className="border-t border-[#c6cec1] pt-5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#39423b]">
                    Total
                  </span>

                  <span className="text-2xl font-semibold text-[#39423b]">
                    ₹{grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <Link
              href="/checkout"
              className={`mt-7 block w-full rounded-full bg-[#40594b] py-4 text-center text-sm font-semibold text-white transition hover:bg-[#33483c] ${
                cart.length === 0
                  ? "pointer-events-none opacity-50"
                  : ""
              }`}
              aria-disabled={cart.length === 0}
            >
              Checkout →
            </Link>
          </aside>
        </div>

        {/* RECOMMENDATIONS */}
        <section className="mt-14 pb-10">
          <div className="mb-7 text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-[#788578]">
              Complete Your Order
            </p>

            <h2 className="mt-2 text-2xl font-semibold text-[#39423b] sm:text-3xl">
              You May Also Like
            </h2>
          </div>

          {recommend.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {recommend.map((item) => (
                <div
                  key={item.id}
                  className="overflow-hidden rounded-3xl border border-[#ddd7ca] bg-[#fbf7ef] transition duration-300 hover:-translate-y-1 hover:shadow-md"
                >
                  {/* IMAGE */}
                  <div className="h-40 w-full overflow-hidden bg-[#e1e6dc]">
                    {item.imageUrl || item.image ? (
                      <img
                        src={item.imageUrl || item.image}
                        alt={item.name}
                        className="h-full w-full object-cover transition duration-300 hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-5xl">
                        ☕
                      </div>
                    )}
                  </div>

                  {/* INFO */}
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-lg font-semibold text-[#39423b]">
                          {item.name}
                        </h3>

                        {item.description && (
                          <p className="mt-1 line-clamp-1 text-sm text-[#7b8178]">
                            {item.description}
                          </p>
                        )}
                      </div>

                      <span className="whitespace-nowrap font-semibold text-[#40594b]">
                        ₹{Number(item.price).toFixed(2)}
                      </span>
                    </div>

                    {/* ADD */}
                    <button
                      type="button"
                      onClick={() => addRecommended(item)}
                      className="mt-4 w-full rounded-full bg-[#e1e6dc] py-2.5 text-sm font-semibold text-[#40594b] transition hover:bg-[#40594b] hover:text-white"
                    >
                      + Add to Cart
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-[#7b8178]">
              No products available.
            </p>
          )}

          {/* CONTINUE SHOPPING */}
          <div className="mt-9 text-center">
            <Link
              href="/menu"
              className="inline-flex items-center gap-2 rounded-full border border-[#40594b] px-7 py-3 text-sm font-semibold text-[#40594b] transition hover:bg-[#40594b] hover:text-white"
            >
              <span>←</span>
              Continue Shopping
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
