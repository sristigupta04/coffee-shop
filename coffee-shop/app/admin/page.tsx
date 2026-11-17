
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  IndianRupee,
  Package,
  ShoppingBag,
  Users,
  RefreshCw,
} from "lucide-react";

import StatCard from "@/components/admin/StatCard";
import StatusBadge from "@/components/admin/StatusBadge";
import DataTable, {
  type DataTableColumn,
} from "@/components/admin/DataTable";

type DashboardStats = {
  revenue: number;
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  newCustomers: number;
  totalCustomers: number;
  totalProducts: number;
  lowStockProducts: number;
};

type RecentOrder = {
  id: string;
  customer: string;
  total: number;
  status: string;
  createdAt: string;
};

type TopProduct = {
  id: string;
  name: string;
  quantity: number;
  revenue: number;
};

type DashboardData = {
  summary: DashboardStats;
  recentOrders: RecentOrder[];
  topSellingProducts: TopProduct[];
};

type AnalyticsResponse = {
  success: boolean;
  message?: string;
  data?: {
    summary: DashboardStats;
    recentOrders: {
      id: string;
      totalPrice: number;
      status: string;
      paymentStatus: string;
      createdAt: string;
      user?: {
        name: string | null;
        email: string;
      } | null;
    }[];
    topSellingProducts: {
      id: string;
      name: string;
      image: string;
      quantitySold: number;
      revenue: number;
    }[];
  };
};

const currency = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

const orderColumns: DataTableColumn<RecentOrder>[] = [
  {
    key: "id",
    header: "Order ID",
    render: (order) => (
      <span className="font-semibold text-[#754426]">
        #{order.id.slice(-8).toUpperCase()}
      </span>
    ),
  },
  {
    key: "customer",
    header: "Customer",
    sortable: true,
  },
  {
    key: "total",
    header: "Amount",
    sortable: true,
    render: (order) => (
      <span className="font-semibold">
        {currency(order.total)}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (order) => <StatusBadge status={order.status} />,
  },
  {
    key: "createdAt",
    header: "Date",
    sortable: true,
    render: (order) =>
      new Date(order.createdAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
  },
];

const productColumns: DataTableColumn<TopProduct>[] = [
  {
    key: "name",
    header: "Product",
    sortable: true,
  },
  {
    key: "quantity",
    header: "Units Sold",
    sortable: true,
  },
  {
    key: "revenue",
    header: "Revenue",
    sortable: true,
    render: (product) => currency(product.revenue),
  },
];

export default function AdminDashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      // Last 7 days: today and previous 6 days
      const to = new Date();
      const from = new Date();

      from.setDate(from.getDate() - 6);

      const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
      };

      const params = new URLSearchParams({
        from: formatDate(from),
        to: formatDate(to),
      });

      const response = await fetch(
        `/api/admin/analytics?${params.toString()}`,
        {
          cache: "no-store",
        }
      );

      const result: AnalyticsResponse = await response.json();

      if (!response.ok || !result.success || !result.data) {
        throw new Error(
          result.message || "Unable to load dashboard analytics."
        );
      }

      const data = result.data;

      const recentOrders: RecentOrder[] = data.recentOrders.map(
        (order) => ({
          id: order.id,
          customer:
            order.user?.name ||
            order.user?.email ||
            "Guest Customer",
          total: Number(order.totalPrice) || 0,
          status: order.status,
          createdAt: order.createdAt,
        })
      );

      const topSellingProducts: TopProduct[] =
        data.topSellingProducts.map((product) => ({
          id: product.id,
          name: product.name,
          quantity: Number(product.quantitySold) || 0,
          revenue: Number(product.revenue) || 0,
        }));

      setDashboard({
        summary: {
          revenue: Number(data.summary.revenue) || 0,
          totalOrders: Number(data.summary.totalOrders) || 0,
          pendingOrders: Number(data.summary.pendingOrders) || 0,
          completedOrders: Number(data.summary.completedOrders) || 0,
          cancelledOrders: Number(data.summary.cancelledOrders) || 0,
          newCustomers: Number(data.summary.newCustomers) || 0,
          totalCustomers: Number(data.summary.totalCustomers) || 0,
          totalProducts: Number(data.summary.totalProducts) || 0,
          lowStockProducts: Number(data.summary.lowStockProducts) || 0,
        },
        recentOrders,
        topSellingProducts,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading the dashboard."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const stats = dashboard?.summary;

  return (
    <main className="min-h-screen bg-[#F8F3ED] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-7">

        {/* Page heading */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-[#A76535]">
              BREWBITES ADMINISTRATION
            </p>

            <h1 className="mt-1 text-2xl font-bold text-[#2B1B14] sm:text-3xl">
              Dashboard Overview
            </h1>

            <p className="mt-1 text-sm text-[#80695B]">
              Monitor your coffee shop's business performance.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadDashboard()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2B1B14] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#754426] disabled:opacity-60"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        {/* Error state */}
        {error && (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="text-sm text-red-700">{error}</p>

            <button
              type="button"
              onClick={() => void loadDashboard()}
              className="text-sm font-semibold text-red-700 underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Business summary */}
        <section>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Activity size={18} className="text-[#754426]" />

            <h2 className="font-semibold text-[#2B1B14]">
              Business Summary
            </h2>

            <span className="text-xs text-[#A18B7C]">
              Last 7 days
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Total Revenue"
              value={stats ? currency(stats.revenue) : "—"}
              icon={IndianRupee}
              loading={loading}
              description="Paid orders"
              iconColor="#754426"
              iconBackground="#F5E9DF"
            />

            <StatCard
              title="Total Orders"
              value={
                stats
                  ? stats.totalOrders.toLocaleString("en-IN")
                  : "—"
              }
              icon={ShoppingBag}
              loading={loading}
              description="Orders received"
              iconColor="#2563EB"
              iconBackground="#EEF4FF"
            />

            <StatCard
              title="Total Customers"
              value={
                stats
                  ? stats.totalCustomers.toLocaleString("en-IN")
                  : "—"
              }
              icon={Users}
              loading={loading}
              description="All registered customers"
              iconColor="#16835D"
              iconBackground="#E8F5EE"
            />

            <StatCard
              title="Products"
              value={
                stats
                  ? stats.totalProducts.toLocaleString("en-IN")
                  : "—"
              }
              icon={Package}
              loading={loading}
              description="Products in catalogue"
              iconColor="#A76535"
              iconBackground="#F5E9DF"
            />
          </div>
        </section>

        {/* Additional order statistics */}
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            {
              label: "Pending Orders",
              value: stats?.pendingOrders,
            },
            {
              label: "Completed Orders",
              value: stats?.completedOrders,
            },
            {
              label: "Cancelled Orders",
              value: stats?.cancelledOrders,
            },
            {
              label: "Low Stock Products",
              value: stats?.lowStockProducts,
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-[#E9DCCF] bg-white p-4 shadow-sm"
            >
              <p className="text-sm text-[#80695B]">
                {item.label}
              </p>

              <p className="mt-2 text-2xl font-bold text-[#2B1B14]">
                {loading
                  ? "—"
                  : (item.value ?? 0).toLocaleString("en-IN")}
              </p>
            </div>
          ))}
        </section>

        {/* Recent orders */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-[#2B1B14]">
              Recent Orders
            </h2>

            <p className="text-sm text-[#80695B]">
              Latest customer orders and their current status.
            </p>
          </div>

          <DataTable
            data={dashboard?.recentOrders ?? []}
            columns={orderColumns}
            rowKey={(order) => order.id}
            loading={loading}
            pageSize={5}
            searchPlaceholder="Search orders..."
            emptyTitle="No recent orders"
            emptyDescription="New customer orders will appear here."
          />
        </section>

        {/* Top products */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-[#2B1B14]">
              Top Selling Products
            </h2>

            <p className="text-sm text-[#80695B]">
              Products ranked by units sold.
            </p>
          </div>

          <DataTable
            data={dashboard?.topSellingProducts ?? []}
            columns={productColumns}
            rowKey={(product) => product.id}
            loading={loading}
            pageSize={5}
            searchable={false}
            emptyTitle="No sales data yet"
            emptyDescription="Product sales will appear here once paid orders are received."
          />
        </section>

      </div>
    </main>
  );
}
