
"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Coffee,
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
  orders: number;
  customers: number;
  products: number;
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
      <span className="font-semibold">{currency(order.total)}</span>
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

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/admin/analytics?range=7d", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Unable to load dashboard analytics.");
      }

      const result: DashboardData = await response.json();

      if (
        !result.summary ||
        !Array.isArray(result.recentOrders) ||
        !Array.isArray(result.topSellingProducts)
      ) {
        throw new Error("The analytics API returned an invalid response.");
      }

      setDashboard(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading the dashboard."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  const stats = dashboard?.summary;

  return (
    <main className="min-h-screen bg-[#F8F3ED] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-7">
        {/* Page heading */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-[#A76535]">
              BREWB​ITES ADMINISTRATION
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

        {/* Statistics */}
        <section>
          <div className="mb-4 flex items-center gap-2">
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
              value={stats ? stats.orders.toLocaleString("en-IN") : "—"}
              icon={ShoppingBag}
              loading={loading}
              description="Orders received"
              iconColor="#2563EB"
              iconBackground="#EEF4FF"
            />

            <StatCard
              title="Customers"
              value={stats ? stats.customers.toLocaleString("en-IN") : "—"}
              icon={Users}
              loading={loading}
              description="Registered customers"
              iconColor="#16835D"
              iconBackground="#E8F5EE"
            />

            <StatCard
              title="Products"
              value={stats ? stats.products.toLocaleString("en-IN") : "—"}
              icon={Package}
              loading={loading}
              description="Products in catalogue"
              iconColor="#A76535"
              iconBackground="#F5E9DF"
            />
          </div>
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
            emptyDescription="Product sales will appear here once orders are completed."
          />
        </section>
      </div>
    </main>
  );
}
