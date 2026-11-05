
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ShoppingBag,
  IndianRupee,
  Users,
  Coffee,
  Clock,
  CheckCircle,
  XCircle,
  Package,
  RefreshCw,
} from "lucide-react";

type Analytics = {
  summary: {
    revenue: number;
    totalOrders: number;
    pendingOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    newCustomers: number;
    totalProducts: number;
    lowStockProducts: number;
  };
  recentOrders: {
    id: string;
    totalPrice: number;
    status: string;
    paymentStatus: string;
    createdAt: string;
    user: { name: string; email: string | null };
  }[];
  topSellingProducts: {
    id: string;
    name: string;
    image: string;
    quantitySold: number;
    price: number;
  }[];
};

const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

const cards = [
  { key: "revenue", label: "Paid Revenue", icon: IndianRupee },
  { key: "totalOrders", label: "Total Orders", icon: ShoppingBag },
  { key: "newCustomers", label: "New Customers", icon: Users },
  { key: "totalProducts", label: "Total Products", icon: Coffee },
  { key: "pendingOrders", label: "Pending Orders", icon: Clock },
  { key: "completedOrders", label: "Delivered Orders", icon: CheckCircle },
  { key: "cancelledOrders", label: "Cancelled Orders", icon: XCircle },
  { key: "lowStockProducts", label: "Low Stock Products", icon: Package },
] as const;

export default function AdminPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/analytics", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to load dashboard");
      }

      setData(result.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f8f3ed]">
        <RefreshCw className="animate-spin text-[#8b4a24]" />
        <span className="ml-3 text-[#6f4e37]">
          Loading analytics...
        </span>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-[#f8f3ed] p-8">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8">
          <h2 className="text-xl font-bold text-red-700">
            Dashboard unavailable
          </h2>
          <p className="mt-2 text-gray-600">{error}</p>
          <button
            onClick={fetchAnalytics}
            className="mt-5 rounded-lg bg-[#8b4a24] px-5 py-3 text-white"
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f3ed] px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#9a4f24]">
              BREWBITES MANAGEMENT
            </p>
            <h1 className="mt-2 text-3xl font-bold text-[#3b2115]">
              Admin Dashboard
            </h1>
            <p className="mt-2 text-[#80695b]">
              Monitor your coffee shop performance.
            </p>
          </div>

          <button
            onClick={fetchAnalytics}
            className="flex items-center gap-2 rounded-xl bg-[#8b4a24] px-5 py-3 text-white hover:bg-[#6f351c]"
          >
            <RefreshCw size={17} />
            Refresh
          </button>
        </header>

        <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(({ key, label, icon: Icon }) => {
            const value = data.summary[key];

            return (
              <article
                key={key}
                className="rounded-2xl border border-[#eaded4] bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm text-[#80695b]">{label}</p>
                  <Icon className="text-[#9a4f24]" size={21} />
                </div>

                <h2 className="mt-4 text-2xl font-bold text-[#3b2115]">
                  {key === "revenue"
                    ? money(value)
                    : value.toLocaleString("en-IN")}
                </h2>
              </article>
            );
          })}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-[#eaded4] bg-white p-6">
            <h2 className="text-xl font-bold text-[#3b2115]">
              Top Selling Products
            </h2>

            <div className="mt-5 space-y-4">
              {data.topSellingProducts.length === 0 ? (
                <p className="text-gray-500">
                  No product sales found.
                </p>
              ) : (
                data.topSellingProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center gap-4"
                  >
                    <div className="h-12 w-12 overflow-hidden rounded-lg bg-[#f8f3ed]">
                      {product.image && (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-[#3b2115]">
                        {product.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {product.quantitySold} units sold
                      </p>
                    </div>

                    <p className="font-semibold text-[#9a4f24]">
                      {money(product.price)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-[#eaded4] bg-white p-6">
            <h2 className="text-xl font-bold text-[#3b2115]">
              Recent Orders
            </h2>

            <div className="mt-5 space-y-4">
              {data.recentOrders.length === 0 ? (
                <p className="text-gray-500">No orders found.</p>
              ) : (
                data.recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between gap-3 border-b border-[#f0e7df] pb-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[#3b2115]">
                        {order.user.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        #{order.id.slice(-8)} ·{" "}
                        {new Date(order.createdAt).toLocaleDateString(
                          "en-IN"
                        )}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-semibold text-[#3b2115]">
                        {money(order.totalPrice)}
                      </p>
                      <p className="text-xs text-[#9a4f24]">
                        {order.status.replaceAll("_", " ")}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-[#eaded4] bg-white p-6">
          <h2 className="font-bold text-[#3b2115]">
            Dashboard information
          </h2>
          <p className="mt-2 text-sm text-[#80695b]">
            Revenue includes orders marked PAID or COMPLETED.
            Product sales include non-cancelled orders. Stock alerts
            currently use a threshold of 5 units.
          </p>
        </section>
      </div>
    </main>
  );
}
