"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type Item = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

type Address = {
  id: string;
  type: "HOME" | "WORK" | "OTHER";
  label: string | null;
  fullName: string;
  phone: string;
  addressLine: string;
  landmark: string | null;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
};

type CheckoutProps = {
  item: Item[];
};

export default function Checkout({ item }: CheckoutProps) {
  const router = useRouter();
  const { data: session } = useSession();

  const [load, setLoad] = useState(false);

  const [cartItems, setCartItems] = useState<Item[]>([]);

  // Address
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");

  // Order
  const [orderType, setOrderType] = useState("DELIVERY");
  const [paymentWay, setPaymentWay] = useState("COD");

  // Coupon
  const [couponCode, setCouponCode] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [couponMessage, setCouponMessage] = useState("");

  // =========================
  // FETCH CART
  // =========================
  useEffect(() => {
    const getCart = async () => {
      if (!session?.user?.id) return;

      try {
        const res = await fetch(`/api/cart/${session.user.id}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || "Failed to fetch cart");
        }

        const items = data.data?.items || [];

        setCartItems(
          items.map((cartItem: any) => ({
            id: cartItem.product.id,
            name: cartItem.product.name,
            price: Number(cartItem.product.price),
            quantity: cartItem.quantity,
          }))
        );
      } catch (error) {
        console.error("Error fetching cart:", error);
      }
    };

    getCart();
  }, [session]);

  // =========================
  // FETCH SAVED ADDRESSES
  // =========================
  useEffect(() => {
    const getAddresses = async () => {
      if (!session?.user?.id) return;

      try {
        const res = await fetch("/api/addresses");
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || "Failed to fetch addresses");
        }

        const savedAddresses: Address[] = data.data || [];

        setAddresses(savedAddresses);

        // Automatically select default address
        const defaultAddress = savedAddresses.find(
          (item) => item.isDefault
        );

        if (defaultAddress) {
          selectAddress(defaultAddress);
        }
      } catch (error) {
        console.error("Error fetching addresses:", error);
      }
    };

    getAddresses();
  }, [session]);

  // =========================
  // SELECT ADDRESS
  // =========================
  const selectAddress = (selectedAddress: Address) => {
    setSelectedAddressId(selectedAddress.id);

    setAddress(
      `${selectedAddress.addressLine}, ${
        selectedAddress.landmark
          ? selectedAddress.landmark + ", "
          : ""
      }${selectedAddress.city}, ${selectedAddress.state} - ${
        selectedAddress.pincode
      }`
    );

    setPhone(selectedAddress.phone);
  };

  // =========================
  // TOTAL CALCULATIONS
  // =========================
  const total = cartItems.reduce((acc, item) => {
    return acc + Number(item.price) * item.quantity;
  }, 0);

  const tax = total * 0.1;

  const subtotal = total + tax;

  const grandTotal = Math.max(
    0,
    subtotal - discountAmount
  );

  // =========================
  // APPLY COUPON
  // =========================
  const apply = async () => {
    if (!couponCode.trim()) {
      setCouponMessage("Please enter a coupon code");
      return;
    }

    try {
      const res = await fetch("/api/coupon/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: couponCode,
          totalAmount: subtotal,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setCouponMessage(
          data.error || "Failed to apply coupon"
        );
        setDiscountAmount(0);
        return;
      }

      setDiscountAmount(Number(data.discountAmount || 0));

      setCouponMessage(
        `Coupon applied! You saved ₹${data.discountAmount}`
      );
    } catch (error) {
      console.error("Coupon error:", error);

      setCouponMessage(
        "An error occurred while applying the coupon"
      );

      setDiscountAmount(0);
    }
  };

  // =========================
  // PLACE ORDER
  // =========================
  const handles = async () => {
    // Delivery validation
    if (
      orderType === "DELIVERY" &&
      !address.trim()
    ) {
      alert("Please select or enter a delivery address");
      return;
    }

    // Phone validation
    if (orderType !== "DINE_IN") {
      if (!phone.trim()) {
        alert("Please enter your phone number");
        return;
      }

      if (phone.length < 10) {
        alert("Please enter a valid phone number");
        return;
      }
    }

    // Cart validation
    if (cartItems.length === 0) {
      alert("Cart is empty");
      return;
    }

    // Payment validation
    if (!paymentWay.trim()) {
      alert("Please select a payment method");
      return;
    }

    try {
      setLoad(true);

      // =========================
      // ONLINE PAYMENT
      // =========================
      if (paymentWay === "ONLINE") {
        const res = await fetch(
          "/api/payment/create-order",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              amount: subtotal,
              couponCode,
              discountAmount,
              finalAmount: grandTotal,
            }),
          }
        );

        const data = await res.json();

        if (!res.ok) {
          throw new Error(
            data.message ||
              `Request failed: ${res.status}`
          );
        }

        if (!(window as any).Razorpay) {
          throw new Error(
            "Razorpay SDK not loaded"
          );
        }

        const options = {
          key: process.env
            .NEXT_PUBLIC_RAZORPAY_KEY_ID as string,

          amount: data.data.amount,

          currency: data.data.currency,

          name: "Coffee Shop",

          description: "Coffee Shop Order",

          order_id: data.data.id,

          prefill: {
            name: "",
            contact: phone,
          },

          theme: {
            color: "#6f4e37",
          },

          handler: async function (
            response: any
          ) {
            try {
              const verifyRes = await fetch(
                "/api/payment/verify",
                {
                  method: "POST",
                  headers: {
                    "Content-Type":
                      "application/json",
                  },
                  credentials: "include",

                  body: JSON.stringify({
                    razorpay_order_id:
                      response.razorpay_order_id,

                    razorpay_payment_id:
                      response.razorpay_payment_id,

                    razorpay_signature:
                      response.razorpay_signature,

                    couponCode,

                    address:
                      orderType === "DELIVERY"
                        ? address
                        : "",

                    phone:
                      orderType !== "DINE_IN"
                        ? phone
                        : "",

                    orderType,
                  }),
                }
              );

              const verifyData =
                await verifyRes.json();

              if (!verifyRes.ok) {
                throw new Error(
                  verifyData.message ||
                    `Request failed: ${verifyRes.status}`
                );
              }

              alert(
                verifyData.message ||
                  "Payment successful"
              );

              if (verifyData.data?.id) {
                router.push(
                  `/orders/${verifyData.data.id}`
                );
              } else {
                router.push("/orders");
              }
            } catch (error) {
              console.error(
                "Payment verification error:",
                error
              );

              alert(
                error instanceof Error
                  ? error.message
                  : "Payment verification failed"
              );
            }
          },
        };

        const razorpay = new (
          window as any
        ).Razorpay(options);

        razorpay.open();

        setLoad(false);

        return;
      }

      // =========================
      // COD ORDER
      // =========================
      const res = await fetch(
        "/api/orders",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          credentials: "include",

          body: JSON.stringify({
            address:
              orderType === "DELIVERY"
                ? address
                : "",

            phone:
              orderType !== "DINE_IN"
                ? phone
                : "",

            paymentWay,

            couponCode,

            orderType,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.message ||
            `Request failed: ${res.status}`
        );
      }

      alert(
        data.message ||
          "Order placed successfully"
      );

      if (data.data?.id) {
        router.push(
          `/orders/${data.data.id}`
        );
      } else {
        router.push("/orders");
      }
    } catch (error) {
      console.error(
        "Order error:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "An error occurred"
      );
    } finally {
      setLoad(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f8f3ed] px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">

        {/* HEADER */}
        <h1 className="text-4xl font-bold text-[#3b2115]">
          Checkout
        </h1>

        <p className="mt-2 text-[#80695b]">
          Complete your order
        </p>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">

          {/* =========================
              LEFT SIDE
          ========================= */}
          <section className="rounded-3xl bg-white p-6 shadow-sm">

            {/* =========================
                DELIVERY ADDRESS
            ========================= */}
            {orderType === "DELIVERY" && (
              <div>
                <div className="flex items-center justify-between">

                  <h2 className="text-xl font-semibold text-[#3b2115]">
                    Delivery Address
                  </h2>

                  <button
                    type="button"
                    onClick={() =>
                      router.push("/addresses")
                    }
                    className="text-sm font-semibold text-[#6f4e37] hover:underline"
                  >
                    + Add New
                  </button>
                </div>

                {/* SAVED ADDRESSES */}
                {addresses.length > 0 ? (
                  <div className="mt-4 space-y-3">

                    {addresses.map(
                      (item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() =>
                            selectAddress(item)
                          }
                          className={`w-full rounded-2xl border p-4 text-left transition ${
                            selectedAddressId ===
                            item.id
                              ? "border-[#6f4e37] bg-[#f3e7dc]"
                              : "border-[#d8c8ba] bg-[#fffdfa] hover:border-[#a98c78]"
                          }`}
                        >

                          <div className="flex items-center justify-between">

                            <div className="font-semibold text-[#3b2115]">
                              {item.label ||
                                item.type}
                            </div>

                            {item.isDefault && (
                              <span className="rounded-full bg-[#6f4e37] px-3 py-1 text-xs text-white">
                                Default
                              </span>
                            )}

                          </div>

                          <p className="mt-2 text-sm font-medium text-[#3b2115]">
                            {item.fullName}
                          </p>

                          <p className="mt-1 text-sm text-[#80695b]">

                            {item.addressLine}

                            {item.landmark &&
                              `, ${item.landmark}`}

                            <br />

                            {item.city},{" "}
                            {item.state} -{" "}
                            {item.pincode}

                          </p>

                          <p className="mt-2 text-sm text-[#80695b]">
                            📞 {item.phone}
                          </p>

                        </button>
                      )
                    )}

                  </div>
                ) : (
                  /* NO ADDRESS */
                  <div className="mt-4 rounded-2xl border border-dashed border-[#d8c8ba] bg-[#fffdfa] p-5 text-center">

                    <p className="text-sm text-[#80695b]">
                      No saved addresses found.
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          "/addresses"
                        )
                      }
                      className="mt-3 rounded-full bg-[#6f4e37] px-5 py-2 text-sm font-semibold text-white"
                    >
                      Add Address
                    </button>

                  </div>
                )}

                {/* SELECTED ADDRESS */}
                {address && (
                  <div className="mt-4">

                    <p className="mb-2 text-sm font-medium text-[#80695b]">
                      Selected delivery address
                    </p>

                    <textarea
                      value={address}
                      onChange={(e) =>
                        setAddress(
                          e.target.value
                        )
                      }
                      rows={3}
                      className="w-full rounded-xl border border-[#d8c8ba] bg-[#fffdfa] p-3 outline-none focus:border-[#6f4e37]"
                    />

                  </div>
                )}

              </div>
            )}

            {/* =========================
                PHONE
            ========================= */}
            {orderType !== "DINE_IN" && (
              <div className="mt-6">

                <h2 className="text-xl font-semibold text-[#3b2115]">
                  Phone Number
                </h2>

                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={phone}
                  onChange={(e) =>
                    setPhone(
                      e.target.value.replace(
                        /\D/g,
                        ""
                      )
                    )
                  }
                  placeholder="Enter phone number"
                  className="mt-4 w-full rounded-xl border border-[#d8c8ba] bg-[#fffdfa] p-3 outline-none focus:border-[#6f4e37]"
                />

              </div>
            )}

            {/* =========================
                ORDER TYPE
            ========================= */}
            <div className="mt-6">

              <h2 className="mb-3 text-lg font-bold text-[#3b2115]">
                Order Type
              </h2>

              <div className="grid grid-cols-3 gap-3">

                {/* DELIVERY */}
                <button
                  type="button"
                  onClick={() =>
                    setOrderType(
                      "DELIVERY"
                    )
                  }
                  className={`rounded-xl border p-4 ${
                    orderType === "DELIVERY"
                      ? "border-[#6f4e37] bg-[#f3e7dc]"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="text-2xl">
                    🚚
                  </div>

                  <div className="font-semibold text-[#3b2115]">
                    Delivery
                  </div>
                </button>

                {/* PICKUP */}
                <button
                  type="button"
                  onClick={() =>
                    setOrderType(
                      "PICKUP"
                    )
                  }
                  className={`rounded-xl border p-4 ${
                    orderType === "PICKUP"
                      ? "border-[#6f4e37] bg-[#f3e7dc]"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="text-2xl">
                    🏃
                  </div>

                  <div className="font-semibold text-[#3b2115]">
                    Pickup
                  </div>
                </button>

                {/* DINE IN */}
                <button
                  type="button"
                  onClick={() =>
                    setOrderType(
                      "DINE_IN"
                    )
                  }
                  className={`rounded-xl border p-4 ${
                    orderType === "DINE_IN"
                      ? "border-[#6f4e37] bg-[#f3e7dc]"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="text-2xl">
                    ☕
                  </div>

                  <div className="font-semibold text-[#3b2115]">
                    Dine-in
                  </div>
                </button>

              </div>
            </div>

            {/* =========================
                PAYMENT
            ========================= */}
            <div className="mt-6">

              <h2 className="text-xl font-semibold text-[#3b2115]">
                Payment Method
              </h2>

              <select
                value={paymentWay}
                onChange={(e) =>
                  setPaymentWay(
                    e.target.value
                  )
                }
                className="mt-4 w-full rounded-xl border border-[#d8c8ba] bg-[#fffdfa] p-3 outline-none focus:border-[#6f4e37]"
              >
                <option value="COD">
                  Cash on Delivery
                </option>

                <option value="ONLINE">
                  Online Payment
                </option>
              </select>

            </div>

          </section>

          {/* =========================
              RIGHT SIDE
          ========================= */}
          <aside className="h-fit rounded-3xl bg-[#e1e6dc] p-6">

            <h2 className="text-2xl font-semibold text-[#3b2115]">
              Order Summary
            </h2>

            {/* CART ITEMS */}
            <div className="mt-6 space-y-4">

              {cartItems.map(
                (product) => (
                  <div
                    key={product.id}
                    className="flex justify-between gap-4"
                  >

                    <div>

                      <p className="font-medium text-[#3b2115]">
                        {product.name}
                      </p>

                      <p className="text-sm text-[#80695b]">
                        Qty:{" "}
                        {product.quantity}
                      </p>

                    </div>

                    <p className="font-semibold text-[#3b2115]">
                      ₹
                      {(
                        product.price *
                        product.quantity
                      ).toFixed(2)}
                    </p>

                  </div>
                )
              )}

            </div>

            {/* COUPON */}
            <div className="mt-6 flex gap-2">

              <input
                type="text"
                value={couponCode}
                onChange={(e) =>
                  setCouponCode(
                    e.target.value
                  )
                }
                placeholder="Enter coupon"
                className="min-w-0 flex-1 rounded-xl border border-[#c5cec0] bg-white px-3 py-2 outline-none focus:border-[#6f4e37]"
              />

              <button
                type="button"
                onClick={apply}
                className="rounded-xl bg-[#6f4e37] px-4 py-2 text-white"
              >
                Apply
              </button>

            </div>

            {couponMessage && (
              <p className="mt-2 text-sm text-[#80695b]">
                {couponMessage}
              </p>
            )}

            {/* TOTALS */}
            <div className="mt-6 space-y-3 border-t border-[#c5cec0] pt-5">

              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>
                  ₹{total.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span>Tax</span>
                <span>
                  ₹{tax.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span>Discount</span>
                <span>
                  ₹
                  {discountAmount.toFixed(
                    2
                  )}
                </span>
              </div>

              <div className="flex justify-between border-t border-[#c5cec0] pt-4 text-lg font-bold text-[#3b2115]">
                <span>
                  Final Total
                </span>

                <span>
                  ₹
                  {grandTotal.toFixed(
                    2
                  )}
                </span>
              </div>

            </div>

            {/* PLACE ORDER */}
            <button
              type="button"
              onClick={handles}
              disabled={
                load ||
                cartItems.length === 0
              }
              className="mt-7 w-full rounded-full bg-[#6f4e37] py-4 font-semibold text-white transition hover:bg-[#5a3e2b] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {load
                ? "Processing..."
                : "Place Order"}
            </button>

          </aside>

        </div>
      </div>
    </main>
  );
}