"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CalendarDays,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  AlertCircle,
  ClipboardList,
} from "lucide-react";

type ReservationStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CANCELLED"
  | "COMPLETED"
  | "NO_SHOW";

type Reservation = {
  id: string;
  reservationNumber: string;
  guestName: string;
  guestEmail: string | null;
  guestPhone: string;
  partySize: number;
  reservationDate: string;
  specialRequest: string | null;
  status: ReservationStatus;
  adminNotes: string | null;
  confirmedAt: string | null;
  cancelledAt: string | null;
  completedAt: string | null;
  createdAt: string;
  user?: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
  };
};

type Summary = {
  totalReservations: number;
  totalGuests: number;
  pending: number;
  confirmed: number;
  cancelled: number;
  completed: number;
  noShow: number;
};

type Pagination = {
  page: number;
  limit: number;
  totalRecords: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

const emptySummary: Summary = {
  totalReservations: 0,
  totalGuests: 0,
  pending: 0,
  confirmed: 0,
  cancelled: 0,
  completed: 0,
  noShow: 0,
};

const emptyPagination: Pagination = {
  page: 1,
  limit: 10,
  totalRecords: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
};

const statusStyles: Record<ReservationStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  CONFIRMED: "bg-blue-50 text-blue-700 border-blue-200",
  CANCELLED: "bg-red-50 text-red-700 border-red-200",
  COMPLETED: "bg-green-50 text-green-700 border-green-200",
  NO_SHOW: "bg-gray-100 text-gray-700 border-gray-200",
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateTime(value: string) {
  return `${formatDate(value)} at ${formatTime(value)}`;
}

function StatusBadge({ status }: { status: ReservationStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusStyles[status]}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

export default function AdminReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [summary, setSummary] = useState<Summary>(emptySummary);
  const [pagination, setPagination] =
    useState<Pagination>(emptyPagination);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  const [selectedReservation, setSelectedReservation] =
    useState<Reservation | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [updating, setUpdating] = useState(false);

  const fetchReservations = useCallback(
    async (showRefresh = false) => {
      try {
        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const params = new URLSearchParams({
          page: String(page),
          limit: "10",
          search,
          status,
        });

        if (from) params.set("from", from);
        if (to) params.set("to", to);

        const response = await fetch(
          `/api/reservations?${params.toString()}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.message || "Failed to fetch reservations."
          );
        }

        setReservations(data.reservations ?? []);
        setSummary(data.summary ?? emptySummary);
        setPagination(data.pagination ?? emptyPagination);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, search, status, from, to]
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchReservations();
    }, 300);

    return () => clearTimeout(timeout);
  }, [fetchReservations]);

  const updateReservation = async (
    reservation: Reservation,
    newStatus: ReservationStatus
  ) => {
    const confirmed = window.confirm(
      `Are you sure you want to mark this reservation as ${newStatus.replace(
        "_",
        " "
      )}?`
    );

    if (!confirmed) return;

    try {
      setUpdating(true);
      setError("");
      setSuccess("");

      const response = await fetch("/api/reservations", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reservationId: reservation.id,
          status: newStatus,
          adminNotes:
            selectedReservation?.id === reservation.id
              ? adminNotes
              : reservation.adminNotes,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to update reservation."
        );
      }

      setSuccess(
        `Reservation ${reservation.reservationNumber} updated successfully.`
      );

      setSelectedReservation(null);
      setAdminNotes("");

      await fetchReservations(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update reservation."
      );
    } finally {
      setUpdating(false);
    }
  };

  const saveAdminNotes = async (reservation: Reservation) => {
    if (!adminNotes.trim()) {
      setError("Please enter admin notes before saving.");
      return;
    }

    try {
      setUpdating(true);
      setError("");
      setSuccess("");

      const response = await fetch("/api/reservations", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reservationId: reservation.id,
          status: reservation.status,
          adminNotes: adminNotes.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to save admin notes."
        );
      }

      setSuccess("Admin notes saved successfully.");
      setSelectedReservation(null);
      setAdminNotes("");
      await fetchReservations(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save admin notes."
      );
    } finally {
      setUpdating(false);
    }
  };

  const openDetails = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setAdminNotes(reservation.adminNotes ?? "");
    setError("");
    setSuccess("");
  };

  const clearFilters = () => {
    setSearch("");
    setStatus("ALL");
    setFrom("");
    setTo("");
    setPage(1);
  };

  const statCards = [
    {
      title: "Total Reservations",
      value: summary.totalReservations,
      icon: CalendarDays,
      color: "bg-amber-100 text-amber-700",
    },
    {
      title: "Total Guests",
      value: summary.totalGuests,
      icon: Users,
      color: "bg-blue-100 text-blue-700",
    },
    {
      title: "Pending",
      value: summary.pending,
      icon: Clock,
      color: "bg-orange-100 text-orange-700",
    },
    {
      title: "Confirmed",
      value: summary.confirmed,
      icon: CheckCircle2,
      color: "bg-green-100 text-green-700",
    },
    {
      title: "Completed",
      value: summary.completed,
      icon: CheckCircle2,
      color: "bg-emerald-100 text-emerald-700",
    },
    {
      title: "Cancelled / No-show",
      value: summary.cancelled + summary.noShow,
      icon: XCircle,
      color: "bg-red-100 text-red-700",
    },
  ];

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium text-amber-700">
            Admin Management
          </p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">
            Reservations
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage customer table reservations and booking requests.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchReservations(true)}
          disabled={refreshing || loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            className={refreshing ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {statCards.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.title}
              className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    {item.title}
                  </p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">
                    {item.value.toLocaleString("en-IN")}
                  </p>
                </div>

                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${item.color}`}
                >
                  <Icon size={22} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <Search size={18} className="text-gray-500" />
          <h2 className="font-semibold text-gray-900">
            Search & Filters
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="relative xl:col-span-2">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search name, email, phone, booking ID..."
              className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
            />
          </div>

          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-amber-500"
          >
            <option value="ALL">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="COMPLETED">Completed</option>
            <option value="NO_SHOW">No-show</option>
          </select>

          <input
            type="date"
            value={from}
            onChange={(event) => {
              setFrom(event.target.value);
              setPage(1);
            }}
            aria-label="From date"
            className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-amber-500"
          />

          <input
            type="date"
            value={to}
            onChange={(event) => {
              setTo(event.target.value);
              setPage(1);
            }}
            aria-label="To date"
            min={from || undefined}
            className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-amber-500"
          />
        </div>

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={clearFilters}
            className="text-sm font-semibold text-amber-700 hover:text-amber-800"
          >
            Clear filters
          </button>
        </div>
      </div>

      {/* Reservation Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="font-semibold text-gray-900">
              All Reservations
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              {pagination.totalRecords} records found
            </p>
          </div>

          <ClipboardList size={21} className="text-amber-700" />
        </div>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center">
            <RefreshCw
              size={25}
              className="animate-spin text-amber-700"
            />
          </div>
        ) : reservations.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-4 text-center">
            <CalendarDays size={42} className="text-gray-300" />
            <h3 className="mt-3 font-semibold text-gray-800">
              No reservations found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Try changing your search or filters.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-5 py-4 font-semibold">
                      Reservation
                    </th>
                    <th className="px-5 py-4 font-semibold">
                      Guest
                    </th>
                    <th className="px-5 py-4 font-semibold">
                      Date & Time
                    </th>
                    <th className="px-5 py-4 font-semibold">
                      Guests
                    </th>
                    <th className="px-5 py-4 font-semibold">
                      Status
                    </th>
                    <th className="px-5 py-4 text-right font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {reservations.map((reservation) => (
                    <tr
                      key={reservation.id}
                      className="transition hover:bg-gray-50/70"
                    >
                      <td className="px-5 py-4">
                        <p className="font-semibold text-gray-900">
                          {reservation.reservationNumber}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          Created {formatDate(reservation.createdAt)}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-900">
                          {reservation.guestName}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {reservation.guestEmail || "No email"}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {reservation.guestPhone}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-900">
                          {formatDate(reservation.reservationDate)}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {formatTime(reservation.reservationDate)}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 text-gray-700">
                          <Users size={15} />
                          {reservation.partySize}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge status={reservation.status} />
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openDetails(reservation)}
                            title="View details"
                            className="rounded-lg border border-gray-200 p-2 text-gray-600 transition hover:bg-gray-100"
                          >
                            <Eye size={16} />
                          </button>

                          {reservation.status === "PENDING" && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  updateReservation(
                                    reservation,
                                    "CONFIRMED"
                                  )
                                }
                                disabled={updating}
                                title="Confirm reservation"
                                className="rounded-lg bg-green-50 p-2 text-green-700 transition hover:bg-green-100 disabled:opacity-50"
                              >
                                <CheckCircle2 size={16} />
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  updateReservation(
                                    reservation,
                                    "CANCELLED"
                                  )
                                }
                                disabled={updating}
                                title="Cancel reservation"
                                className="rounded-lg bg-red-50 p-2 text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                              >
                                <XCircle size={16} />
                              </button>
                            </>
                          )}

                          {reservation.status === "CONFIRMED" && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  updateReservation(
                                    reservation,
                                    "COMPLETED"
                                  )
                                }
                                disabled={updating}
                                title="Mark completed"
                                className="rounded-lg bg-green-50 p-2 text-green-700 transition hover:bg-green-100 disabled:opacity-50"
                              >
                                <CheckCircle2 size={16} />
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  updateReservation(
                                    reservation,
                                    "NO_SHOW"
                                  )
                                }
                                disabled={updating}
                                title="Mark no-show"
                                className="rounded-lg bg-gray-100 p-2 text-gray-700 transition hover:bg-gray-200 disabled:opacity-50"
                              >
                                <XCircle size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-100 px-5 py-4 sm:flex-row">
              <p className="text-sm text-gray-500">
                Page {pagination.page} of{" "}
                {Math.max(pagination.totalPages, 1)}
                {" · "}
                {pagination.totalRecords} total records
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => current - 1)}
                  disabled={!pagination.hasPreviousPage}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>

                <button
                  type="button"
                  onClick={() => setPage((current) => current + 1)}
                  disabled={!pagination.hasNextPage}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Details Modal */}
      {selectedReservation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => {
            if (!updating) {
              setSelectedReservation(null);
              setAdminNotes("");
            }
          }}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Reservation Details
                </h2>
                <p className="mt-1 text-xs text-gray-500">
                  {selectedReservation.reservationNumber}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedReservation(null);
                  setAdminNotes("");
                }}
                disabled={updating}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <StatusBadge status={selectedReservation.status} />
                <span className="text-xs text-gray-500">
                  Created {formatDateTime(selectedReservation.createdAt)}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-xs font-medium text-gray-500">
                    Guest Name
                  </p>
                  <p className="mt-1 font-semibold text-gray-900">
                    {selectedReservation.guestName}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-xs font-medium text-gray-500">
                    Phone Number
                  </p>
                  <p className="mt-1 font-semibold text-gray-900">
                    {selectedReservation.guestPhone}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-xs font-medium text-gray-500">
                    Email
                  </p>
                  <p className="mt-1 break-all font-semibold text-gray-900">
                    {selectedReservation.guestEmail || "Not provided"}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-xs font-medium text-gray-500">
                    Party Size
                  </p>
                  <p className="mt-1 font-semibold text-gray-900">
                    {selectedReservation.partySize} guests
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-4 sm:col-span-2">
                  <p className="text-xs font-medium text-gray-500">
                    Reservation Date & Time
                  </p>
                  <p className="mt-1 font-semibold text-gray-900">
                    {formatDateTime(selectedReservation.reservationDate)}
                  </p>
                </div>
              </div>

              {selectedReservation.specialRequest && (
                <div>
                  <p className="mb-2 text-sm font-semibold text-gray-800">
                    Special Request
                  </p>
                  <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-gray-700">
                    {selectedReservation.specialRequest}
                  </div>
                </div>
              )}

              <div>
                <label
                  htmlFor="adminNotes"
                  className="mb-2 block text-sm font-semibold text-gray-800"
                >
                  Admin Notes
                </label>

                <textarea
                  id="adminNotes"
                  rows={4}
                  maxLength={1000}
                  value={adminNotes}
                  onChange={(event) => setAdminNotes(event.target.value)}
                  placeholder="Add internal notes about this reservation..."
                  className="w-full resize-y rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                />
              </div>

              <div className="flex flex-col-reverse justify-end gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => saveAdminNotes(selectedReservation)}
                  disabled={updating}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Save Notes
                </button>

                {selectedReservation.status === "PENDING" && (
                  <button
                    type="button"
                    onClick={() =>
                      updateReservation(
                        selectedReservation,
                        "CONFIRMED"
                      )
                    }
                    disabled={updating}
                    className="rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    Confirm Reservation
                  </button>
                )}

                {selectedReservation.status === "CONFIRMED" && (
                  <button
                    type="button"
                    onClick={() =>
                      updateReservation(
                        selectedReservation,
                        "COMPLETED"
                      )
                    }
                    disabled={updating}
                    className="rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    Mark Completed
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}