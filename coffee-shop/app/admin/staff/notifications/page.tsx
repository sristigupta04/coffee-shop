
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type NotificationType =
  | "ATTENDANCE"
  | "LEAVE"
  | "SHIFT"
  | "PAYROLL"
  | "DOCUMENT"
  | "PERFORMANCE"
  | "SYSTEM";

type Staff = {
  id: string;
  name: string;
};

type StaffNotification = {
  id: string;
  staffId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  staff: Staff;
};

const notificationTypes: NotificationType[] = [
  "ATTENDANCE",
  "LEAVE",
  "SHIFT",
  "PAYROLL",
  "DOCUMENT",
  "PERFORMANCE",
  "SYSTEM",
];

const formatType = (type: string) =>
  type.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (c) =>
    c.toUpperCase()
  );

const formatDate = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(date);
};

export default function StaffNotificationsPage() {
  const [notifications, setNotifications] = useState<StaffNotification[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [readFilter, setReadFilter] = useState("ALL");

  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    staffId: "",
    type: "SYSTEM" as NotificationType,
    title: "",
    message: "",
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [notificationResponse, staffResponse] = await Promise.all([
        fetch("/api/admin/staff/notifications", {
          cache: "no-store",
        }),
        fetch("/api/admin/staff?status=active", {
          cache: "no-store",
        }),
      ]);

      const notificationData = await notificationResponse.json();
      const staffData = await staffResponse.json();

      if (!notificationResponse.ok) {
        throw new Error(
          notificationData.message || "Unable to load notifications."
        );
      }

      if (!staffResponse.ok) {
        throw new Error(staffData.message || "Unable to load staff.");
      }

      setNotifications(
        notificationData.notifications ?? notificationData.data ?? []
      );

      setStaff(staffData.staff ?? staffData.data ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const summary = useMemo(() => {
    return {
      total: notifications.length,
      unread: notifications.filter((item) => !item.isRead).length,
      read: notifications.filter((item) => item.isRead).length,
      staffCount: new Set(notifications.map((item) => item.staffId)).size,
    };
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    const query = search.trim().toLowerCase();

    return notifications.filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(query) ||
        item.message.toLowerCase().includes(query) ||
        item.staff.name.toLowerCase().includes(query);

      const matchesType =
        typeFilter === "ALL" || item.type === typeFilter;

      const matchesRead =
        readFilter === "ALL" ||
        (readFilter === "READ" && item.isRead) ||
        (readFilter === "UNREAD" && !item.isRead);

      return matchesSearch && matchesType && matchesRead;
    });
  }, [notifications, search, typeFilter, readFilter]);

  const sendNotification = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!form.staffId || !form.title.trim() || !form.message.trim()) {
      setError("Please fill all required fields.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await fetch("/api/admin/staff/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          staffId: form.staffId,
          type: form.type,
          title: form.title.trim(),
          message: form.message.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to send notification.");
      }

      setForm({
        staffId: "",
        type: "SYSTEM",
        title: "",
        message: "",
      });

      setShowForm(false);
      setSuccess("Notification sent successfully.");

      await fetchData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to send notification."
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteNotification = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this notification?")) {
      return;
    }

    try {
      setDeletingId(id);
      setError("");
      setSuccess("");

      const response = await fetch(
        `/api/admin/staff/notifications/${id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to delete notification.");
      }

      setNotifications((current) =>
        current.filter((item) => item.id !== id)
      );

      setSuccess("Notification deleted successfully.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Delete failed."
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <Link
            href="/admin/staff"
            className="text-sm text-gray-500 hover:text-[#754426]"
          >
            Staff
          </Link>

          <h1 className="mt-2 text-2xl font-bold text-[#2B1B14]">
            Staff Notifications
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Send and manage notifications for your staff members.
          </p>
        </div>

        <button
          onClick={() => {
            setError("");
            setSuccess("");
            setShowForm((current) => !current);
          }}
          className="rounded-lg bg-[#754426] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#5e361d]"
        >
          {showForm ? "Close Form" : "+ Send Notification"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Total Notifications",
            value: summary.total,
            color: "text-[#2B1B14]",
          },
          {
            label: "Unread Notifications",
            value: summary.unread,
            color: "text-orange-600",
          },
          {
            label: "Read Notifications",
            value: summary.read,
            color: "text-green-600",
          },
          {
            label: "Staff Reached",
            value: summary.staffCount,
            color: "text-blue-600",
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-gray-200 bg-white p-5"
          >
            <p className="text-sm text-gray-500">{item.label}</p>
            <p className={`mt-2 text-2xl font-bold ${item.color}`}>
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {/* Send Notification Form */}
      {showForm && (
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-5 font-semibold text-[#2B1B14]">
            Create Staff Notification
          </h2>

          <form onSubmit={sendNotification} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Staff Member *
                </label>

                <select
                  required
                  value={form.staffId}
                  onChange={(e) =>
                    setForm({ ...form, staffId: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                >
                  <option value="">Select staff member</option>

                  {staff.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>

                {staff.length === 0 && (
                  <p className="mt-1 text-xs text-red-500">
                    No active staff members found.
                  </p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Notification Type *
                </label>

                <select
                  value={form.type}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      type: e.target.value as NotificationType,
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                >
                  {notificationTypes.map((type) => (
                    <option key={type} value={type}>
                      {formatType(type)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Notification Title *
                </label>

                <input
                  required
                  maxLength={150}
                  value={form.title}
                  onChange={(e) =>
                    setForm({ ...form, title: e.target.value })
                  }
                  placeholder="Enter notification title"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Message *
                </label>

                <textarea
                  required
                  rows={4}
                  maxLength={2000}
                  value={form.message}
                  onChange={(e) =>
                    setForm({ ...form, message: e.target.value })
                  }
                  placeholder="Write your notification message..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                />

                <p className="mt-1 text-right text-xs text-gray-400">
                  {form.message.length}/2000
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving || staff.length === 0}
                className="rounded-lg bg-[#754426] px-5 py-2 text-sm font-semibold text-white hover:bg-[#5e361d] disabled:opacity-50"
              >
                {saving ? "Sending..." : "Send Notification"}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Filters */}
      <section className="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 md:grid-cols-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title, message or staff..."
          className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
        />

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
        >
          <option value="ALL">All notification types</option>
          {notificationTypes.map((type) => (
            <option key={type} value={type}>
              {formatType(type)}
            </option>
          ))}
        </select>

        <select
          value={readFilter}
          onChange={(e) => setReadFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
        >
          <option value="ALL">All notifications</option>
          <option value="READ">Read</option>
          <option value="UNREAD">Unread</option>
        </select>
      </section>

      {/* Notification List */}
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-col justify-between gap-2 border-b border-gray-200 p-5 sm:flex-row sm:items-center">
          <h2 className="font-semibold text-[#2B1B14]">
            Notification History
          </h2>

          <span className="text-sm text-gray-500">
            {filteredNotifications.length} notifications
          </span>
        </div>

        {loading ? (
          <p className="p-10 text-center text-sm text-gray-500">
            Loading notifications...
          </p>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-10 text-center">
            <p className="font-medium text-gray-700">
              No notifications found.
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Try changing your filters or send a new notification.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className="flex flex-col justify-between gap-4 p-5 transition hover:bg-gray-50 sm:flex-row sm:items-start"
              >
                <div className="flex min-w-0 gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F8F3ED] text-lg text-[#754426]">
                    {notification.type === "ATTENDANCE"
                      ? "◷"
                      : notification.type === "LEAVE"
                        ? "▣"
                        : notification.type === "PAYROLL"
                          ? "₹"
                          : notification.type === "SHIFT"
                            ? "◫"
                            : "●"}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-gray-900">
                        {notification.title}
                      </h3>

                      <span className="rounded-full bg-[#F8F3ED] px-2.5 py-1 text-xs font-medium text-[#754426]">
                        {formatType(notification.type)}
                      </span>

                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          notification.isRead
                            ? "bg-green-50 text-green-700"
                            : "bg-orange-50 text-orange-700"
                        }`}
                      >
                        {notification.isRead ? "Read" : "Unread"}
                      </span>
                    </div>

                    <p className="mt-2 whitespace-pre-wrap break-words text-sm text-gray-600">
                      {notification.message}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span>
                        Staff:{" "}
                        <strong className="font-medium text-gray-700">
                          {notification.staff?.name || "Unknown"}
                        </strong>
                      </span>

                      <span>{formatDate(notification.createdAt)}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => deleteNotification(notification.id)}
                  disabled={deletingId === notification.id}
                  className="shrink-0 self-start rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  {deletingId === notification.id ? "Deleting..." : "Delete"}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
