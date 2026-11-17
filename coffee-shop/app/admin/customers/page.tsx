
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Users,
  UserCheck,
  ShoppingBag,
  IndianRupee,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  CalendarDays,
  Eye,
  X,
} from "lucide-react";

import StatCard from "@/components/admin/StatCard";

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  image: string | null;
  createdAt: string;
  totalOrders: number;
  completedOrderCount: number;
  totalSpent: number;
  lastOrderAt: string | null;
}

interface CustomerResponse {
  success: boolean;
  customers: Customer[];
  summary: {
    totalCustomers: number;
    activeCustomers: number;
    filteredCustomers: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  message?: string;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

const formatDate = (date: string | null) => {
  if (!date) return "Never";

  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [summary, setSummary] = useState({
    totalCustomers: 0,
    activeCustomers: 0,
    filteredCustomers: 0,
  });

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedCustomer, setSelectedCustomer] =
    useState<Customer | null>(null);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
      });

      if (search) {
        params.set("search", search);
      }

      const response = await fetch(
        `/api/admin/customers?${params.toString()}`,
        {
          method: "GET",
          cache: "no-store",
          credentials: "include",
        }
      );

      const result: CustomerResponse = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Unable to load customers."
        );
      }

      setCustomers(result.customers ?? []);
      setSummary(
        result.summary ?? {
          totalCustomers: 0,
          activeCustomers: 0,
          filteredCustomers: 0,
        }
      );

      setTotal(result.pagination?.total ?? 0);
      setTotalPages(
        Math.max(1, result.pagination?.totalPages ?? 1)
      );
    } catch (err) {
      console.error("Customer fetch error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    return () => {
      if (searchTimer.current) {
        clearTimeout(searchTimer.current);
      }
    };
  }, []);

  const handleSearch = (value: string) => {
    setSearchInput(value);

    if (searchTimer.current) {
      clearTimeout(searchTimer.current);
    }

    searchTimer.current = setTimeout(() => {
      setPage(1);
      setSearch(value.trim());
    }, 400);
  };

  const handleRefresh = () => {
    fetchCustomers();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Customers
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage your coffee shop customers and their activity.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          <RefreshCw
            size={16}
            className={loading ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </div>

      {/* Statistics */}
   {/* Statistics */}
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
  <StatCard
    title="Total Customers"
    value={summary.totalCustomers}
    icon={Users}
    iconColor="text-blue-700"
    iconBackground="bg-blue-100"
  />

  <StatCard
    title="Active Customers"
    value={summary.activeCustomers}
    icon={UserCheck}
    iconColor="text-green-700"
    iconBackground="bg-green-100"
  />

  <StatCard
    title="Matching Customers"
    value={summary.filteredCustomers}
    icon={ShoppingBag}
    iconColor="text-purple-700"
    iconBackground="bg-purple-100"
  />
</div>

      {/* Search and Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="flex flex-col gap-4 border-b border-gray-200 p-4 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">
              Customer Directory
            </h2>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {total} customers found
            </p>
          </div>

          <div className="relative w-full sm:max-w-sm">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="search"
              value={searchInput}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search name, email or phone..."
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:ring-blue-900"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="m-4 flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-red-700 dark:text-red-300">
              {error}
            </p>

            <button
              onClick={handleRefresh}
              className="text-sm font-semibold text-red-700 hover:underline dark:text-red-300"
            >
              Try again
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3">
            <RefreshCw
              size={26}
              className="animate-spin text-blue-600"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Loading customers...
            </p>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && customers.length === 0 && (
          <div className="flex min-h-64 flex-col items-center justify-center px-4 text-center">
            <Users
              size={42}
              className="mb-3 text-gray-300 dark:text-gray-600"
            />

            <h3 className="font-semibold text-gray-800 dark:text-white">
              No customers found
            </h3>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Try changing your search or check back later.
            </p>
          </div>
        )}

        {/* Customer Table */}
        {!loading && !error && customers.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-800/70 dark:text-gray-400">
                  <tr>
                    <th className="px-5 py-4 font-semibold">
                      Customer
                    </th>
                    <th className="px-5 py-4 font-semibold">
                      Contact
                    </th>
                    <th className="px-5 py-4 font-semibold">
                      Orders
                    </th>
                    <th className="px-5 py-4 font-semibold">
                      Total Spent
                    </th>
                    <th className="px-5 py-4 font-semibold">
                      Last Order
                    </th>
                    <th className="px-5 py-4 text-right font-semibold">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {customers.map((customer) => (
                    <tr
                      key={customer.id}
                      className="transition hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {customer.image ? (
                            <img
                              src={customer.image}
                              alt={customer.name}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                              {customer.name
                                ?.charAt(0)
                                .toUpperCase() || "C"}
                            </div>
                          )}

                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {customer.name}
                            </p>
                            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                              Joined {formatDate(customer.createdAt)}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          <p className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                            <Mail size={14} className="text-gray-400" />
                            {customer.email || "No email"}
                          </p>

                          <p className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <Phone size={13} className="text-gray-400" />
                            {customer.phone || "No phone"}
                          </p>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {customer.totalOrders}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Non-cancelled: {customer.completedOrderCount}
                          </p>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(customer.totalSpent)}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                        {formatDate(customer.lastOrderAt)}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() =>
                            setSelectedCustomer(customer)
                          }
                          title="View customer details"
                          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-blue-950/30 dark:hover:text-blue-300"
                        >
                          <Eye size={15} />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col gap-3 border-t border-gray-200 px-4 py-4 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Showing{" "}
                {total === 0 ? 0 : (page - 1) * 10 + 1}–
                {Math.min(page * 10, total)} of {total}
              </p>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((current) => current - 1)}
                  disabled={page <= 1 || loading}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>

                <span className="px-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  {page} / {totalPages}
                </span>

                <button
                  onClick={() => setPage((current) => current + 1)}
                  disabled={page >= totalPages || loading}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Customer Details Modal */}
      {selectedCustomer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelectedCustomer(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Customer Details
              </h2>

              <button
                onClick={() => setSelectedCustomer(null)}
                className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Close customer details"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-6 flex items-center gap-4">
              {selectedCustomer.image ? (
                <img
                  src={selectedCustomer.image}
                  alt={selectedCustomer.name}
                  className="h-16 w-16 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                  {selectedCustomer.name?.charAt(0).toUpperCase() || "C"}
                </div>
              )}

              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {selectedCustomer.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Customer since {formatDate(selectedCustomer.createdAt)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Email
                </p>
                <p className="mt-1 break-all text-sm font-medium text-gray-900 dark:text-white">
                  {selectedCustomer.email || "Not provided"}
                </p>
              </div>

              <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Phone
                </p>
                <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                  {selectedCustomer.phone || "Not provided"}
                </p>
              </div>

              <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Total Orders
                </p>
                <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
                  {selectedCustomer.totalOrders}
                </p>
              </div>

              <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Non-cancelled Orders
                </p>
                <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
                  {selectedCustomer.completedOrderCount}
                </p>
              </div>

              <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Total Spending
                </p>
                <p className="mt-1 text-xl font-bold text-green-600">
                  {formatCurrency(selectedCustomer.totalSpent)}
                </p>
              </div>

              <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Last Order
                </p>
                <p className="mt-1 flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
                  <CalendarDays size={15} />
                  {formatDate(selectedCustomer.lastOrderAt)}
                </p>
              </div>
            </div>

            <button
              onClick={() => setSelectedCustomer(null)}
              className="mt-6 w-full rounded-lg bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
