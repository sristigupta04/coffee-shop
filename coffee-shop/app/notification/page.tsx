
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  Trash2,
  RefreshCw,
  ShoppingBag,
  Gift,
  Coffee,
  AlertCircle,
  Info,
  Inbox,
} from "lucide-react";

type NotificationItem = {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

type FilterType = "ALL" | "UNREAD" | "READ";

const getNotificationIcon = (type: string) => {
  const value = type?.toUpperCase() ?? "";

  if (value.includes("ORDER")) return ShoppingBag;
  if (value.includes("PAYMENT")) return Coffee;
  if (value.includes("PROMO") || value.includes("OFFER")) return Gift;
  if (value.includes("ALERT")) return AlertCircle;
  if (value.includes("INFO")) return Info;

  return Bell;
};

const formatDate = (date: string) => {
  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsedDate);
};

const getRelativeTime = (date: string) => {
  const timestamp = new Date(date).getTime();

  if (Number.isNaN(timestamp)) return "";

  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return formatDate(date);
};

export default function NotificationPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<FilterType>("ALL");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/notifications", {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to load notifications");
      }

      setNotifications(result.data ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.isRead).length,
    [notifications]
  );

  const readCount = notifications.length - unreadCount;

  const filteredNotifications = useMemo(() => {
    if (filter === "UNREAD") {
      return notifications.filter((item) => !item.isRead);
    }

    if (filter === "READ") {
      return notifications.filter((item) => item.isRead);
    }

    return notifications;
  }, [notifications, filter]);

  const handleMarkAsRead = async (
    notification: NotificationItem
  ) => {
    if (notification.isRead || actionLoading) return;

    try {
      setActionLoading(notification.id);
      setError("");
      setSuccess("");

      const response = await fetch(
        `/api/notifications/${encodeURIComponent(notification.id)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            isRead: true,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to update notification");
      }

      setNotifications((previous) =>
        previous.map((item) =>
          item.id === notification.id
            ? { ...item, isRead: true }
            : item
        )
      );

      setSuccess("Notification marked as read.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0 || actionLoading) return;

    try {
      setActionLoading("ALL");
      setError("");
      setSuccess("");

      const response = await fetch("/api/notifications", {
        method: "PATCH",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to update notifications");
      }

      setNotifications((previous) =>
        previous.map((item) => ({
          ...item,
          isRead: true,
        }))
      );

      setSuccess("All notifications marked as read.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this notification?"
    );

    if (!confirmed) return;

    try {
      setActionLoading(id);
      setError("");
      setSuccess("");

      const response = await fetch(
        `/api/notifications/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to delete notification");
      }

      setNotifications((previous) =>
        previous.filter((item) => item.id !== id)
      );

      setSuccess("Notification deleted successfully.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <main className="min-h-screen bg-[#F7F1E8] px-4 py-8 text-[#3E2723] sm:px-6 lg:py-12">
      <div className="mx-auto max-w-5xl">

        {/* Header */}
        <header className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-[#6F4E37] p-4 text-white shadow-md">
              <BellRing size={26} />
            </div>

            <div>
              <h1 className="text-2xl font-bold sm:text-3xl">
                Notifications
              </h1>

              <p className="mt-1 text-sm text-[#8B6F5C]">
                All your BrewBites updates in one place.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadNotifications}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#D8C5B5] bg-white px-4 py-3 text-sm font-semibold text-[#6F4E37] transition hover:bg-[#F7F1E8] disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </header>

        {/* Summary Cards */}
        <section className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#E9DDD1] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-[#8B6F5C]">
                Total Notifications
              </p>
              <Bell size={20} className="text-[#6F4E37]" />
            </div>

            <p className="mt-3 text-3xl font-bold">
              {notifications.length}
            </p>
          </div>

          <div className="rounded-2xl border border-[#E9DDD1] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-[#8B6F5C]">
                Unread
              </p>
              <BellRing size={20} className="text-orange-600" />
            </div>

            <p className="mt-3 text-3xl font-bold text-orange-600">
              {unreadCount}
            </p>
          </div>

          <div className="rounded-2xl border border-[#E9DDD1] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-[#8B6F5C]">
                Read
              </p>
              <CheckCheck size={20} className="text-green-600" />
            </div>

            <p className="mt-3 text-3xl font-bold text-green-600">
              {readCount}
            </p>
          </div>
        </section>

        {/* Main Notification Panel */}
        <section className="overflow-hidden rounded-2xl border border-[#E9DDD1] bg-white shadow-sm">

          {/* Panel Header */}
          <div className="flex flex-col justify-between gap-4 border-b border-[#EEE4DA] p-5 sm:flex-row sm:items-center sm:p-6">
            <div>
              <h2 className="text-xl font-bold">
                Your Activity
              </h2>

              <p className="mt-1 text-sm text-[#8B6F5C]">
                Manage your recent notifications.
              </p>
            </div>

            <button
              type="button"
              onClick={handleMarkAllAsRead}
              disabled={unreadCount === 0 || actionLoading !== null}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#6F4E37] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#573B2A] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <CheckCheck size={17} />
              Mark all as read
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 border-b border-[#EEE4DA] px-5 py-4 sm:px-6">
            {(
              [
                { value: "ALL", label: "All" },
                { value: "UNREAD", label: "Unread" },
                { value: "READ", label: "Read" },
              ] as const
            ).map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  filter === item.value
                    ? "bg-[#6F4E37] text-white"
                    : "bg-[#F7F1E8] text-[#6F4E37] hover:bg-[#EDE1D4]"
                }`}
              >
                {item.label}

                {item.value === "UNREAD" && unreadCount > 0 && (
                  <span className="ml-1">
                    ({unreadCount})
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Feedback */}
          {error && (
            <div
              role="alert"
              className="mx-5 mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 sm:mx-6"
            >
              {error}
            </div>
          )}

          {success && (
            <div
              role="status"
              className="mx-5 mt-5 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700 sm:mx-6"
            >
              {success}
            </div>
          )}

          {/* Loading */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <RefreshCw
                size={30}
                className="animate-spin text-[#6F4E37]"
              />

              <p className="mt-4 text-sm text-[#8B6F5C]">
                Loading notifications...
              </p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center px-5 py-20 text-center">
              <div className="rounded-full bg-[#F7F1E8] p-6">
                <Inbox size={35} className="text-[#6F4E37]" />
              </div>

              <h3 className="mt-5 text-lg font-bold">
                {filter === "UNREAD"
                  ? "You're all caught up!"
                  : filter === "READ"
                    ? "No read notifications"
                    : "No notifications yet"}
              </h3>

              <p className="mt-2 max-w-sm text-sm leading-6 text-[#8B6F5C]">
                {filter === "UNREAD"
                  ? "You don't have any unread notifications right now."
                  : "Your order updates, payment alerts and offers will appear here."}
              </p>
            </div>
          ) : (
            /* Notification List */
            <div className="divide-y divide-[#EEE4DA]">
              {filteredNotifications.map((notification) => {
                const Icon = getNotificationIcon(notification.type);
                const busy = actionLoading === notification.id;

                return (
                  <article
                    key={notification.id}
                    className={`flex flex-col gap-4 px-5 py-5 transition hover:bg-[#FCFAF7] sm:flex-row sm:items-start sm:justify-between sm:px-6 ${
                      !notification.isRead ? "bg-[#FCF8F3]" : ""
                    }`}
                  >
                    <div className="flex min-w-0 flex-1 gap-4">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                          notification.isRead
                            ? "bg-[#F1EAE2] text-[#795548]"
                            : "bg-[#6F4E37] text-white"
                        }`}
                      >
                        <Icon size={21} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="break-words font-semibold text-[#3E2723]">
                            {notification.title}
                          </h3>

                          {!notification.isRead && (
                            <span className="rounded-full bg-orange-100 px-2.5 py-1 text-[11px] font-bold text-orange-700">
                              NEW
                            </span>
                          )}
                        </div>

                        <p className="mt-2 break-words text-sm leading-6 text-[#795548]">
                          {notification.message}
                        </p>

                        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#A18A79]">
                          <span>
                            {getRelativeTime(notification.createdAt)}
                          </span>

                          <span>•</span>

                          <span>
                            {formatDate(notification.createdAt)}
                          </span>
                        </div>

                        <span className="mt-2 inline-block rounded-md bg-[#F1EAE2] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#795548]">
                          {notification.type?.replaceAll("_", " ") || "GENERAL"}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex shrink-0 items-center gap-2 pl-16 sm:pl-0">
                      {!notification.isRead && (
                        <button
                          type="button"
                          onClick={() =>
                            handleMarkAsRead(notification)
                          }
                          disabled={actionLoading !== null}
                          title="Mark as read"
                          aria-label="Mark notification as read"
                          className="rounded-lg border border-[#D8C5B5] p-2.5 text-[#6F4E37] transition hover:bg-[#F7F1E8] disabled:opacity-40"
                        >
                          {busy ? (
                            <RefreshCw
                              size={17}
                              className="animate-spin"
                            />
                          ) : (
                            <Check size={17} />
                          )}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDelete(notification.id)}
                        disabled={actionLoading !== null}
                        title="Delete notification"
                        aria-label="Delete notification"
                        className="rounded-lg border border-red-200 p-2.5 text-red-600 transition hover:bg-red-50 disabled:opacity-40"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="mt-6 text-center">
          <p className="text-xs text-[#A18A79]">
            <Coffee size={13} className="mr-1 inline-block" />
            BrewBites · Your notifications are private to your account.
          </p>
        </footer>
      </div>
    </main>
  );
}
