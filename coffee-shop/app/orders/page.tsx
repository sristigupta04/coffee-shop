"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
type Orderitem ={
  id:string;
  productId:string;
  quantity:number;
  price:number;
  product:{
    id:string;
    name:string;
    image:string;
  }
}
type Order = {
  id: string;
  userId: string;
totalPrice: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  items :Orderitem[];
};

export default function Order() {
  const [orders, setorders] = useState<Order[]>([]);
  const [load, setload] = useState(true);

  useEffect(() => {
    const order = async () => {
      try {
      const res = await fetch("/api/orders");

console.log("STATUS:", res.status);
console.log("URL:", res.url);

const data = await res.json();

if (!res.ok) {
  throw new Error(
    data.message || "Orders API failed"
  );
}

setorders(data.data || []);
console.log("DATA:", data);
      

        setorders(data.data);
      } catch (err) {
        console.error("Error fetching orders:", err);
      } finally {
        setload(false);
      }
    };

    order();
  }, []);

 return (
    <main className="min-h-screen bg-[#f8f3ed] px-4 py-8 md:px-10 lg:px-16">
      <div className="mx-auto max-w-4xl">

        {/* Header */}
        <div className="mb-8">
          <a
            href="/settings"
            className="text-sm font-medium text-[#806654] hover:text-[#3b2115]"
          >
            ← Back to Settings
          </a>

          <h1 className="mt-5 text-3xl font-bold text-[#3b2115] md:text-4xl">
            Order History
          </h1>

          <p className="mt-2 text-sm text-[#806654]">
            View your previous coffee orders
          </p>
        </div>

        {/* No Orders */}
        {orders.length === 0 ? (
          <div className="rounded-3xl bg-white px-6 py-16 text-center shadow-sm">
            <div className="text-5xl">☕</div>

            <h2 className="mt-5 text-xl font-semibold text-[#3b2115]">
              No orders yet
            </h2>

            <p className="mt-2 text-sm text-[#806654]">
              Your previous orders will appear here.
            </p>

            <a
              href="/menu"
              className="mt-6 inline-block rounded-xl bg-[#3b2115] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#542f20]"
            >
              Explore Menu
            </a>
          </div>
        ) : (
          <div className="space-y-5">

            {orders.map((order) => (
              <div
                key={order.id}
                className="rounded-3xl bg-white p-5 shadow-sm md:p-6"
              >

                {/* Order Header */}
                <div className="flex flex-col gap-3 border-b border-[#eee4da] pb-4 sm:flex-row sm:items-center sm:justify-between">

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-[#806654]">
                      Order
                    </p>

                    <h2 className="mt-1 font-semibold text-[#3b2115]">
                      #{order.id}
                    </h2>
                  </div>

                  <span
                    className={`w-fit rounded-full px-4 py-1.5 text-xs font-semibold ${
                      order.status === "DELIVERED"
                        ? "bg-[#dfe9dc] text-[#3b5a32]"
                        : order.status === "CANCELLED"
                        ? "bg-red-50 text-red-600"
                        : "bg-[#f8eadc] text-[#8a5a32]"
                    }`}
                  >
                    {order.status}
                  </span>

                </div>

                {/* Order Items */}
                <div className="mt-5 space-y-4">

                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-4"
                    >

                      {/* Product Image */}
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#f8f3ed]">
                        {item.product.image ? (
                          <img
                            src={item.product.image}
                            alt={item.product.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            ☕
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-semibold text-[#3b2115]">
                          {item.product.name}
                        </h3>

                        <p className="mt-1 text-sm text-[#806654]">
                          Quantity: {item.quantity}
                        </p>
                      </div>

                      {/* Price */}
                      <p className="font-semibold text-[#3b2115]">
                        ₹{item.price * item.quantity}
                      </p>

                    </div>
                  ))}

                </div>

                {/* Footer */}
                <div className="mt-5 flex flex-col gap-3 border-t border-[#eee4da] pt-5 sm:flex-row sm:items-center sm:justify-between">

                  <p className="text-sm text-[#806654]">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </p>

                  <div className="flex items-center justify-between gap-6 sm:justify-end">
                    <div>
                      <span className="text-sm text-[#806654]">
                        Total
                      </span>

                      <p className="font-bold text-[#3b2115]">
                        ₹{order.totalPrice}
                      </p>
                    </div>

                   <Link
  href={`/orders/${order.id}`}
  className="rounded-xl border border-[#cdbba9] px-4 py-2 text-sm font-semibold text-[#3b2115] transition hover:bg-[#f8f3ed]"
>
  View Order
</Link>
                  </div>

                </div>

              </div>
            ))}

          </div>
        )}

      </div>
    </main>
  );
}