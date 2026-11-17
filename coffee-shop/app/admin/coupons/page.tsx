
"use client";

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";
import {
  Plus,
  Search,
  Tag,
  Pencil,
  Power,
  RefreshCw,
  X,
  TicketPercent,
  CheckCircle,
  Clock,
  Ban,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

type Coupon = {
  id: string;
  code: string;
  description: string;
  discount: number;
  discountType: "FLAT" | "PERCENTAGE";
  minimumAmount: number;
  maximumDiscount: number | null;
  usageLimit: number | null;
  usedCount: number;
  isActive: boolean;
  expireDate: string;
  createdAt: string;
  orderCount?: number;
  isExpired?: boolean;
};

type CouponForm = {
  code: string;
  description: string;
  discount: string;
  discountType: "FLAT" | "PERCENTAGE";
  minimumAmount: string;
  maximumDiscount: string;
  usageLimit: string;
  expireDate: string;
};

type CouponStatus = "ALL" | "ACTIVE" | "INACTIVE" | "EXPIRED";

type CouponResponse = {
  success: boolean;
  message?: string;
  coupons?: Coupon[];
  summary?: {
    totalCoupons?: number;
    activeCoupons?: number;
    inactiveCoupons?: number;
    expiredCoupons?: number;
  };
  pagination?: {
    page?: number;
    totalPages?: number;
  };
};

const emptyForm: CouponForm = {
  code: "",
  description: "",
  discount: "",
  discountType: "PERCENTAGE",
  minimumAmount: "0",
  maximumDiscount: "",
  usageLimit: "",
  expireDate: "",
};

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100";

function getTodayDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDateInputValue(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

async function readResponse<T>(response: Response): Promise<T> {
  const result = await response.json().catch(() => null);

  if (!result || typeof result !== "object") {
    throw new Error("Invalid server response.");
  }

  if (!response.ok || !result.success) {
    throw new Error(
      typeof result.message === "string"
        ? result.message
        : "Something went wrong."
    );
  }

  return result as T;
}

function formatCurrency(value: number | null | undefined) {
  const amount = Number(value ?? 0);

  if (!Number.isFinite(amount)) return "₹0";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isCouponExpired(coupon: Coupon) {
  return (
    coupon.isExpired === true ||
    new Date(coupon.expireDate).getTime() <= Date.now()
  );
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<CouponStatus>("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [summary, setSummary] = useState({
    totalCoupons: 0,
    activeCoupons: 0,
    inactiveCoupons: 0,
    expiredCoupons: 0,
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CouponForm>(emptyForm);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchCoupons = useCallback(
    async (signal?: AbortSignal) => {
      try {
        setLoading(true);
        setError("");

        const params = new URLSearchParams({
          search: search.trim(),
          status,
          page: String(page),
          limit: "10",
        });

        const response = await fetch(
          `/api/admin/coupons?${params.toString()}`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
            signal,
          }
        );

        const result = await readResponse<CouponResponse>(response);

        setCoupons(Array.isArray(result.coupons) ? result.coupons : []);

        setSummary({
          totalCoupons: Number(result.summary?.totalCoupons ?? 0),
          activeCoupons: Number(result.summary?.activeCoupons ?? 0),
          inactiveCoupons: Number(result.summary?.inactiveCoupons ?? 0),
          expiredCoupons: Number(result.summary?.expiredCoupons ?? 0),
        });

        setTotalPages(
          Math.max(1, Number(result.pagination?.totalPages ?? 1))
        );
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load coupons."
        );
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [search, status, page]
  );

  useEffect(() => {
    const controller = new AbortController();

    const timer = window.setTimeout(() => {
      void fetchCoupons(controller.signal);
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [fetchCoupons, refreshKey]);

  function openCreateModal() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setMessage("");
    setModalOpen(true);
  }

  function openEditModal(coupon: Coupon) {
    setEditingId(coupon.id);
    setError("");
    setMessage("");

    setForm({
      code: coupon.code,
      description: coupon.description,
      discount: String(coupon.discount),
      discountType: coupon.discountType,
      minimumAmount: String(coupon.minimumAmount),
      maximumDiscount:
        coupon.maximumDiscount !== null
          ? String(coupon.maximumDiscount)
          : "",
      usageLimit:
        coupon.usageLimit !== null
          ? String(coupon.usageLimit)
          : "",
      expireDate: getDateInputValue(coupon.expireDate),
    });

    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;

    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    setError("");
  }

  function updateField<K extends keyof CouponForm>(
    field: K,
    value: CouponForm[K]
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function validateForm() {
    if (!form.code.trim()) {
      return "Coupon code is required.";
    }

    if (!/^[A-Z0-9_-]+$/i.test(form.code.trim())) {
      return "Coupon code can contain only letters, numbers, hyphens and underscores.";
    }

    if (!form.description.trim()) {
      return "Coupon description is required.";
    }

    const discount = Number(form.discount);
    const minimumAmount = Number(form.minimumAmount || 0);

    if (!Number.isFinite(discount) || discount <= 0) {
      return "Enter a valid discount amount.";
    }

    if (
      form.discountType === "PERCENTAGE" &&
      discount > 100
    ) {
      return "Percentage discount cannot exceed 100.";
    }

    if (!Number.isFinite(minimumAmount) || minimumAmount < 0) {
      return "Enter a valid minimum order amount.";
    }

    if (form.maximumDiscount.trim()) {
      const maximumDiscount = Number(form.maximumDiscount);

      if (!Number.isFinite(maximumDiscount) || maximumDiscount <= 0) {
        return "Maximum discount must be greater than zero.";
      }
    }

    if (form.usageLimit.trim()) {
      const usageLimit = Number(form.usageLimit);

      if (
        !Number.isSafeInteger(usageLimit) ||
        usageLimit < 1
      ) {
        return "Usage limit must be a positive whole number.";
      }
    }

    if (!form.expireDate) {
      return "Please select an expiry date.";
    }

    const expiry = new Date(`${form.expireDate}T23:59:59`);

    if (Number.isNaN(expiry.getTime())) {
      return "Please select a valid expiry date.";
    }

    if (expiry.getTime() <= Date.now()) {
      return "Expiry date must be in the future.";
    }

    return "";
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = {
      code: form.code.trim().toUpperCase(),
      description: form.description.trim(),
      discount: Number(form.discount),
      discountType: form.discountType,
      minimumAmount: Number(form.minimumAmount || 0),
      maximumDiscount: form.maximumDiscount.trim()
        ? Number(form.maximumDiscount)
        : null,
      usageLimit: form.usageLimit.trim()
        ? Number(form.usageLimit)
        : null,
      expireDate: new Date(
        `${form.expireDate}T23:59:59`
      ).toISOString(),
    };

    try {
      setSaving(true);

      const response = await fetch(
        editingId
          ? `/api/admin/coupons/${encodeURIComponent(editingId)}`
          : "/api/admin/coupons",
        {
          method: editingId ? "PUT" : "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      await readResponse(response);

      const successMessage = editingId
        ? "Coupon updated successfully."
        : "Coupon created successfully.";

      setModalOpen(false);
      setForm(emptyForm);
      setEditingId(null);
      setError("");
      setMessage(successMessage);

      setPage(1);
      setRefreshKey((current) => current + 1);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save coupon."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleCoupon(coupon: Coupon) {
    const expired = isCouponExpired(coupon);

    if (expired && !coupon.isActive) {
      setError("An expired coupon cannot be activated.");
      return;
    }

    const shouldActivate = !coupon.isActive;

    const confirmed = window.confirm(
      shouldActivate
        ? `Activate coupon ${coupon.code}?`
        : `Deactivate coupon ${coupon.code}?`
    );

    if (!confirmed) return;

    try {
      setError("");
      setMessage("");
      setActionId(coupon.id);

      const response = await fetch(
        `/api/admin/coupons/${encodeURIComponent(coupon.id)}`,
        {
          method: shouldActivate ? "PUT" : "DELETE",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          ...(shouldActivate
            ? {
                body: JSON.stringify({ isActive: true }),
              }
            : {}),
        }
      );

      await readResponse(response);

      setMessage(
        shouldActivate
          ? "Coupon activated successfully."
          : "Coupon deactivated successfully."
      );

      setRefreshKey((current) => current + 1);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update coupon."
      );
    } finally {
      setActionId(null);
    }
  }

  function formatDiscount(coupon: Coupon) {
    return coupon.discountType === "PERCENTAGE"
      ? `${coupon.discount}%`
      : formatCurrency(coupon.discount);
  }

  function getCouponStatus(coupon: Coupon) {
    if (isCouponExpired(coupon)) {
      return {
        label: "Expired",
        className: "bg-red-50 text-red-700",
      };
    }

    if (!coupon.isActive) {
      return {
        label: "Inactive",
        className: "bg-gray-100 text-gray-600",
      };
    }

    if (
      coupon.usageLimit !== null &&
      coupon.usedCount >= coupon.usageLimit
    ) {
      return {
        label: "Limit reached",
        className: "bg-orange-50 text-orange-700",
      };
    }

    return {
      label: "Active",
      className: "bg-green-50 text-green-700",
    };
  }

  const stats = [
    {
      label: "Total Coupons",
      value: summary.totalCoupons,
      icon: TicketPercent,
      iconClass: "bg-blue-50 text-blue-700",
    },
    {
      label: "Active Coupons",
      value: summary.activeCoupons,
      icon: CheckCircle,
      iconClass: "bg-green-50 text-green-700",
    },
    {
      label: "Inactive Coupons",
      value: summary.inactiveCoupons,
      icon: Ban,
      iconClass: "bg-gray-100 text-gray-600",
    },
    {
      label: "Expired Coupons",
      value: summary.expiredCoupons,
      icon: Clock,
      iconClass: "bg-red-50 text-red-700",
    },
  ];

  return (
    <div className="min-h-screen space-y-6 bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Coupons & Offers
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage discount coupons and promotional offers.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-800"
        >
          <Plus size={18} />
          Create Coupon
        </button>
      </div>

      {message && (
        <div className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <span>{message}</span>
          <button
            onClick={() => setMessage("")}
            aria-label="Dismiss message"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {error && !modalOpen && (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.label}
              className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">
                    {stat.label}
                  </p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">
                    {stat.value.toLocaleString("en-IN")}
                  </p>
                </div>

                <div className={`rounded-xl p-3 ${stat.iconClass}`}>
                  <Icon size={22} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search coupon code..."
              className={`${inputClass} pl-10`}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(
              ["ALL", "ACTIVE", "INACTIVE", "EXPIRED"] as CouponStatus[]
            ).map((item) => (
              <button
                key={item}
                onClick={() => {
                  setStatus(item);
                  setPage(1);
                }}
                className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
                  status === item
                    ? "bg-amber-700 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {item}
              </button>
            ))}

            <button
              onClick={() => setRefreshKey((current) => current + 1)}
              disabled={loading}
              className="rounded-lg border border-gray-200 p-2.5 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              title="Refresh"
              aria-label="Refresh coupons"
            >
              <RefreshCw
                size={17}
                className={loading ? "animate-spin" : ""}
              />
            </button>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[850px] text-left">
            <thead>
              <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500">
                <th className="px-4 py-4 font-semibold">Coupon</th>
                <th className="px-4 py-4 font-semibold">Discount</th>
                <th className="px-4 py-4 font-semibold">Usage</th>
                <th className="px-4 py-4 font-semibold">Minimum Order</th>
                <th className="px-4 py-4 font-semibold">Expiry</th>
                <th className="px-4 py-4 font-semibold">Status</th>
                <th className="px-4 py-4 text-right font-semibold">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-sm text-gray-500"
                  >
                    Loading coupons...
                  </td>
                </tr>
              ) : coupons.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <Tag
                      size={32}
                      className="mx-auto text-gray-300"
                    />
                    <p className="mt-3 text-sm font-medium text-gray-600">
                      No coupons found
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      Create a coupon or change your search filters.
                    </p>
                  </td>
                </tr>
              ) : (
                coupons.map((coupon) => {
                  const couponStatus = getCouponStatus(coupon);
                  const expired = isCouponExpired(coupon);

                  return (
                    <tr
                      key={coupon.id}
                      className="transition hover:bg-gray-50"
                    >
                      <td className="px-4 py-4">
                        <p className="font-bold text-gray-900">
                          {coupon.code}
                        </p>
                        <p className="mt-1 max-w-[220px] truncate text-xs text-gray-500">
                          {coupon.description}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <span className="font-semibold text-amber-800">
                          {formatDiscount(coupon)}
                        </span>

                        {coupon.maximumDiscount !== null &&
                          coupon.maximumDiscount !== undefined && (
                            <p className="mt-1 text-xs text-gray-400">
                              Max {formatCurrency(coupon.maximumDiscount)}
                            </p>
                          )}
                      </td>

                      <td className="px-4 py-4 text-sm text-gray-700">
                        {coupon.usedCount}
                        <span className="text-gray-400">
                          {" "}
                          / {coupon.usageLimit ?? "∞"}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-sm text-gray-700">
                        {formatCurrency(coupon.minimumAmount)}
                      </td>

                      <td className="px-4 py-4 text-sm text-gray-600">
                        {formatDate(coupon.expireDate)}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${couponStatus.className}`}
                        >
                          {couponStatus.label}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEditModal(coupon)}
                            disabled={actionId === coupon.id}
                            className="rounded-lg border border-gray-200 p-2 text-gray-600 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800 disabled:opacity-50"
                            title="Edit coupon"
                            aria-label={`Edit ${coupon.code}`}
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            onClick={() => void toggleCoupon(coupon)}
                            disabled={
                              actionId === coupon.id ||
                              (expired && !coupon.isActive)
                            }
                            className="rounded-lg border border-gray-200 p-2 text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                            title={
                              coupon.isActive
                                ? "Deactivate coupon"
                                : "Activate coupon"
                            }
                            aria-label={`${
                              coupon.isActive ? "Deactivate" : "Activate"
                            } ${coupon.code}`}
                          >
                            {actionId === coupon.id ? (
                              <RefreshCw
                                size={16}
                                className="animate-spin"
                              />
                            ) : (
                              <Power size={16} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex flex-col items-center justify-between gap-3 border-t border-gray-100 pt-4 sm:flex-row">
          <p className="text-xs text-gray-500">
            Page {page} of {totalPages}
          </p>

          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft size={18} />
            </button>

            <button
              disabled={page >= totalPages || loading}
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
              className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-auto w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {editingId ? "Edit Coupon" : "Create Coupon"}
                </h2>
                <p className="mt-1 text-xs text-gray-500">
                  Configure your promotional offer.
                </p>
              </div>

              <button
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-6">
              {error && (
                <div className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <span>{error}</span>
                  <button
                    type="button"
                    onClick={() => setError("")}
                    aria-label="Dismiss error"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Coupon Code *
                  </label>
                  <input
                    value={form.code}
                    onChange={(event) =>
                      updateField("code", event.target.value.toUpperCase())
                    }
                    placeholder="e.g. COFFEE20"
                    maxLength={50}
                    className={inputClass}
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Discount Type *
                  </label>
                  <select
                    value={form.discountType}
                    onChange={(event) =>
                      updateField(
                        "discountType",
                        event.target.value as CouponForm["discountType"]
                      )
                    }
                    className={inputClass}
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FLAT">Flat Amount (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Discount Value *
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    max={
                      form.discountType === "PERCENTAGE"
                        ? "100"
                        : undefined
                    }
                    step="0.01"
                    value={form.discount}
                    onChange={(event) =>
                      updateField("discount", event.target.value)
                    }
                    placeholder="Enter discount"
                    className={inputClass}
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Minimum Order (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.minimumAmount}
                    onChange={(event) =>
                      updateField("minimumAmount", event.target.value)
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Maximum Discount (₹)
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.maximumDiscount}
                    onChange={(event) =>
                      updateField("maximumDiscount", event.target.value)
                    }
                    placeholder="Optional"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Usage Limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={form.usageLimit}
                    onChange={(event) =>
                      updateField("usageLimit", event.target.value)
                    }
                    placeholder="Unlimited if empty"
                    className={inputClass}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Description *
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(event) =>
                      updateField("description", event.target.value)
                    }
                    placeholder="Describe this coupon offer..."
                    rows={3}
                    maxLength={500}
                    className={inputClass}
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Expiry Date *
                  </label>
                  <input
                    type="date"
                    value={form.expireDate}
                    onChange={(event) =>
                      updateField("expireDate", event.target.value)
                    }
                    min={getTodayDate()}
                    className={inputClass}
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse justify-end gap-3 border-t border-gray-100 pt-5 sm:flex-row">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-amber-700 px-6 py-3 text-sm font-semibold text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Update Coupon"
                      : "Create Coupon"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
