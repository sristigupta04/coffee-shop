
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Bell,
  BellRing,
  CheckCheck,
  Search,
  Send,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  User,
  Mail,
  Clock,
  Filter,
  X,
  Loader2,
  AlertCircle,
  CreditCard,
  ShieldAlert,
  Settings,
  ShoppingBag,
} from "lucide-react";

type NotificationType =
  | "ORDER_UPDATE"
  | "PAYMENT"
  | "SYSTEM"
  | "SECURITY";

type Notification = {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
};

type Summary = {
  totalNotifications: number;
  unreadCount: number;
  readCount: number;
  typeCounts: {
    type: NotificationType;
    count: number;
  }[];
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

const typeOptions: {
  value: NotificationType;
  label: string;
}[] = [
  { value: "ORDER_UPDATE", label: "Order Update" },
  { value: "PAYMENT", label: "Payment" },
  { value: "SYSTEM", label: "System" },
  { value: "SECURITY", label: "Security" },
];

function getTypeIcon(type: NotificationType) {
  switch (type) {
    case "ORDER_UPDATE":
      return ShoppingBag;
    case "PAYMENT":
      return CreditCard;
    case "SECURITY":
      return ShieldAlert;
    default:
      return Settings;
  }
}

function getTypeStyle(type: NotificationType) {
  switch (type) {
    case "ORDER_UPDATE":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "PAYMENT":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "SECURITY":
      return "bg-red-50 text-red-700 border-red-200";
    default:
      return "bg-purple-50 text-purple-700 border-purple-200";
  }
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  iconClass,
}: {
  title: string;
  value: number;
  description: string;
  icon: typeof Bell;
  iconClass: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {value.toLocaleString("en-IN")}
          </p>
          <p className="mt-1 text-xs text-gray-500">{description}</p>
        </div>
        <div className={`rounded-xl p-3 ${iconClass}`}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [summary, setSummary] = useState<Summary>({
    totalNotifications: 0,
    unreadCount: 0,
    readCount: 0,
    typeCounts: [],
  });

  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const [search, setSearch] = useState("");
  const [readStatus, setReadStatus] = useState("ALL");
  const [type, setType] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showSendModal, setShowSendModal] = useState(false);

  const [form, setForm] = useState({
    userId: "",
    title: "",
    message: "",
    type: "SYSTEM",
  });

  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
        search,
        readStatus,
        type,
      });

      const response = await fetch(
        `/api/admin/notifications?${params.toString()}`,
        { cache: "no-store" }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to load notifications"
        );
      }

      setNotifications(result.data || []);
      setSummary(result.summary);
      setPagination((previous) => ({
        ...previous,
        ...result.pagination,
      }));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }, [
    pagination.page,
    pagination.limit,
    search,
    readStatus,
    type,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchNotifications();
    }, 300);

    return () => clearTimeout(timer);
  }, [fetchNotifications]);

  const handleSendNotification = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setFormError("");
    setSuccessMessage("");

    if (
      !form.userId.trim() ||
      !form.title.trim() ||
      !form.message.trim()
    ) {
      setFormError("Please fill all required fields.");
      return;
    }

    try {
      setSending(true);

      const response = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: form.userId.trim(),
          title: form.title.trim(),
          message: form.message.trim(),
          type: form.type,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to send notification");
      }

      setSuccessMessage("Notification sent successfully!");
      setForm({
        userId: "",
        title: "",
        message: "",
        type: "SYSTEM",
      });

      setShowSendModal(false);
      setPagination((previous) => ({ ...previous, page: 1 }));
      await fetchNotifications();
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : "Unable to send notification"
      );
    } finally {
      setSending(false);
    }
  };

  const resetFilters = () => {
    setSearch("");
    setReadStatus("ALL");
    setType("ALL");
    setPagination((previous) => ({ ...previous, page: 1 }));
  };

  const hasFilters =
    search !== "" || readStatus !== "ALL" || type !== "ALL";

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
              <Link href="/admin" className="hover:text-gray-900">
                Admin
              </Link>
              <span>/</span>
              <span className="text-gray-900">Notifications</span>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              Notifications
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Monitor customer notifications and send important updates.
            </p>
          </div>

          <button
            onClick={() => {
              setFormError("");
              setSuccessMessage("");
              setShowSendModal(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-700"
          >
            <Send size={17} />
            Send Notification
          </button>
        </div>

        {/* Success */}
        {successMessage && (
          <div className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            <span>{successMessage}</span>
            <button
              onClick={() => setSuccessMessage("")}
              aria-label="Dismiss message"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            title="Total Notifications"
            value={summary.totalNotifications}
            description="All customer notifications"
            icon={Bell}
            iconClass="bg-blue-50 text-blue-600"
          />
          <StatCard
            title="Unread Notifications"
            value={summary.unreadCount}
            description="Waiting to be read"
            icon={BellRing}
            iconClass="bg-orange-50 text-orange-600"
          />
          <StatCard
            title="Read Notifications"
            value={summary.readCount}
            description="Already viewed by customers"
            icon={CheckCheck}
            iconClass="bg-green-50 text-green-600"
          />
        </div>

        {/* Type Summary */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Filter size={18} className="text-gray-500" />
            <h2 className="font-semibold text-gray-900">
              Notification Categories
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {typeOptions.map((option) => {
              const Icon = getTypeIcon(option.value);
              const count =
                summary.typeCounts.find(
                  (item) => item.type === option.value
                )?.count || 0;

              return (
                <div
                  key={option.value}
                  className="rounded-xl border border-gray-100 bg-gray-50 p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-gray-500">
                      {option.label}
                    </span>
                    <Icon size={17} className="text-gray-400" />
                  </div>
                  <p className="mt-2 text-xl font-bold text-gray-900">
                    {count.toLocaleString("en-IN")}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Filters */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPagination((previous) => ({
                    ...previous,
                    page: 1,
                  }));
                }}
                placeholder="Search title, message, customer or email..."
                className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
              />
            </div>

            <select
              value={readStatus}
              onChange={(event) => {
                setReadStatus(event.target.value);
                setPagination((previous) => ({
                  ...previous,
                  page: 1,
                }));
              }}
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-gray-400"
            >
              <option value="ALL">All Status</option>
              <option value="UNREAD">Unread</option>
              <option value="READ">Read</option>
            </select>

            <select
              value={type}
              onChange={(event) => {
                setType(event.target.value);
                setPagination((previous) => ({
                  ...previous,
                  page: 1,
                }));
              }}
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-gray-400"
            >
              <option value="ALL">All Types</option>
              {typeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <button
              onClick={() => void fetchNotifications()}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={loading ? "animate-spin" : ""}
              />
              Refresh
            </button>

            {hasFilters && (
              <button
                onClick={resetFilters}
                className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <X size={16} />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Notifications Table */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">
                Notification History
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                {pagination.total.toLocaleString("en-IN")} records found
              </p>
            </div>
            <span className="text-xs text-gray-500">
              Page {pagination.page} of {Math.max(1, pagination.totalPages)}
            </span>
          </div>

          {error && (
            <div className="m-5 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle size={18} />
              {error}
              <button
                onClick={() => void fetchNotifications()}
                className="ml-auto font-semibold underline"
              >
                Retry
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-gray-500">
              <Loader2 size={28} className="animate-spin" />
              <p className="text-sm">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-4 text-center">
              <div className="mb-3 rounded-full bg-gray-100 p-4">
                <Bell size={26} className="text-gray-400" />
              </div>
              <h3 className="font-semibold text-gray-900">
                No notifications found
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Try changing your filters or send a new notification.
              </p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                    <tr>
                      <th className="px-5 py-4 font-semibold">Customer</th>
                      <th className="px-5 py-4 font-semibold">
                        Notification
                      </th>
                      <th className="px-5 py-4 font-semibold">Type</th>
                      <th className="px-5 py-4 font-semibold">Status</th>
                      <th className="px-5 py-4 font-semibold">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {notifications.map((notification) => {
                      const Icon = getTypeIcon(notification.type);

                      return (
                        <tr
                          key={notification.id}
                          className="transition hover:bg-gray-50"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600">
                                <User size={17} />
                              </div>
                              <div className="min-w-0">
                                <p className="max-w-48 truncate text-sm font-semibold text-gray-900">
                                  {notification.user.name || "Customer"}
                                </p>
                                <p className="max-w-48 truncate text-xs text-gray-500">
                                  {notification.user.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="max-w-sm px-5 py-4">
                            <p className="font-medium text-gray-900">
                              {notification.title}
                            </p>
                            <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                              {notification.message}
                            </p>
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${getTypeStyle(
                                notification.type
                              )}`}
                            >
                              <Icon size={13} />
                              {notification.type.replace("_", " ")}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            {notification.isRead ? (
                              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700">
                                <CheckCheck size={14} />
                                Read
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-orange-700">
                                <BellRing size={14} />
                                Unread
                              </span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-5 py-4 text-xs text-gray-500">
                            <span className="inline-flex items-center gap-1.5">
                              <Clock size={13} />
                              {formatDate(notification.createdAt)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="space-y-3 p-4 md:hidden">
                {notifications.map((notification) => {
                  const Icon = getTypeIcon(notification.type);

                  return (
                    <div
                      key={notification.id}
                      className="rounded-xl border border-gray-100 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <div className="rounded-full bg-gray-100 p-2 text-gray-600">
                            <User size={16} />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-gray-900">
                              {notification.user.name || "Customer"}
                            </p>
                            <p className="truncate text-xs text-gray-500">
                              {notification.user.email}
                            </p>
                          </div>
                        </div>
                        {notification.isRead ? (
                          <span className="shrink-0 rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                            Read
                          </span>
                        ) : (
                          <span className="shrink-0 rounded-full bg-orange-50 px-2 py-1 text-xs font-medium text-orange-700">
                            Unread
                          </span>
                        )}
                      </div>

                      <div className="mt-4">
                        <p className="text-sm font-semibold text-gray-900">
                          {notification.title}
                        </p>
                        <p className="mt-1 text-sm text-gray-600">
                          {notification.message}
                        </p>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs ${getTypeStyle(
                            notification.type
                          )}`}
                        >
                          <Icon size={12} />
                          {notification.type.replace("_", " ")}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatDate(notification.createdAt)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Pagination */}
          {!loading && pagination.totalPages > 1 && (
            <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-gray-500">
                Showing{" "}
                {(pagination.page - 1) * pagination.limit + 1} to{" "}
                {Math.min(
                  pagination.page * pagination.limit,
                  pagination.total
                )}{" "}
                of {pagination.total} notifications
              </p>

              <div className="flex items-center gap-2">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() =>
                    setPagination((previous) => ({
                      ...previous,
                      page: previous.page - 1,
                    }))
                  }
                  className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={18} />
                </button>

                <span className="px-2 text-sm font-medium text-gray-700">
                  {pagination.page} / {pagination.totalPages}
                </span>

                <button
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() =>
                    setPagination((previous) => ({
                      ...previous,
                      page: previous.page + 1,
                    }))
                  }
                  className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Next page"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Send Notification Modal */}
      {showSendModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowSendModal(false);
            }
          }}
        >
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Send Notification
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Send an update directly to a customer.
                </p>
              </div>
              <button
                onClick={() => setShowSendModal(false)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle size={17} />
                {formError}
              </div>
            )}

            <form
              onSubmit={handleSendNotification}
              className="space-y-4"
            >
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Customer User ID *
                </label>
                <input
                  required
                  value={form.userId}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      userId: event.target.value,
                    }))
                  }
                  placeholder="Enter customer's user ID"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
                />
                <p className="mt-1 text-xs text-gray-400">
                  Copy the customer ID from the Customers section.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Notification Type
                </label>
                <select
                  value={form.type}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      type: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-gray-400"
                >
                  {typeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Title *
                </label>
                <input
                  required
                  maxLength={150}
                  value={form.title}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Notification title"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Message *
                </label>
                <textarea
                  required
                  maxLength={2000}
                  rows={4}
                  value={form.message}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      message: event.target.value,
                    }))
                  }
                  placeholder="Write your notification message..."
                  className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
                />
                <p className="mt-1 text-right text-xs text-gray-400">
                  {form.message.length}/2000
                </p>
              </div>

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowSendModal(false)}
                  className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sending ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      Send Notification
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
