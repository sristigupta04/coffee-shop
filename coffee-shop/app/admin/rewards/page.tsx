
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Award,
  Coins,
  Gift,
  Search,
  RefreshCw,
  Users,
  TrendingUp,
  TrendingDown,
  History,
  Plus,
  Minus,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
} from "lucide-react";

import StatCard from "@/components/admin/StatCard";

type RewardUser = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  image: string | null;
  createdAt: string;
};

type RewardAccount = {
  id: string;
  userId: string;
  points: number;
  createdAt: string;
  updatedAt: string;
  user: RewardUser;
};

type RewardSummary = {
  totalMembers: number;
  totalPoints: number;
  totalEarnedPoints: number;
  totalRedeemedPoints: number;
  totalExpiredPoints: number;
  earnedTransactions: number;
  redeemedTransactions: number;
  expiredTransactions: number;
  totalTransactions: number;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

const initialSummary: RewardSummary = {
  totalMembers: 0,
  totalPoints: 0,
  totalEarnedPoints: 0,
  totalRedeemedPoints: 0,
  totalExpiredPoints: 0,
  earnedTransactions: 0,
  redeemedTransactions: 0,
  expiredTransactions: 0,
  totalTransactions: 0,
};

const formatNumber = (value: number) =>
  value.toLocaleString("en-IN");

export default function AdminRewardsPage() {
  const [accounts, setAccounts] = useState<RewardAccount[]>([]);
  const [summary, setSummary] = useState<RewardSummary>(initialSummary);

  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] =
    useState<RewardAccount | null>(null);

  const [adjustmentType, setAdjustmentType] =
    useState<"ADD" | "DEDUCT">("ADD");

  const [points, setPoints] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchRewards = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
      });

      if (search.trim()) {
        params.set("search", search.trim());
      }

      const response = await fetch(
        `/api/admin/rewards?${params.toString()}`,
        { cache: "no-store" }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to load rewards."
        );
      }

      setAccounts(result.accounts || []);
      setSummary(result.summary || initialSummary);
      setPagination((previous) => ({
        ...previous,
        ...result.pagination,
      }));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRewards();
    }, 350);

    return () => clearTimeout(timer);
  }, [fetchRewards]);

  const openAdjustment = (account: RewardAccount) => {
    setSelectedAccount(account);
    setAdjustmentType("ADD");
    setPoints("");
    setDescription("");
    setError("");
    setSuccess("");
    setModalOpen(true);
  };

  const closeModal = () => {
    if (submitting) return;

    setModalOpen(false);
    setSelectedAccount(null);
  };

  const handleAdjustment = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!selectedAccount) return;

    const numericPoints = Number(points);

    if (
      !Number.isInteger(numericPoints) ||
      numericPoints <= 0 ||
      numericPoints > 100000
    ) {
      setError("Enter a valid points amount between 1 and 100000.");
      return;
    }

    if (!description.trim()) {
      setError("Please enter an adjustment reason.");
      return;
    }

    const adjustedPoints =
      adjustmentType === "ADD"
        ? numericPoints
        : -numericPoints;

    if (
      adjustmentType === "DEDUCT" &&
      numericPoints > selectedAccount.points
    ) {
      setError("Customer does not have enough points.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const response = await fetch("/api/admin/rewards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: selectedAccount.userId,
          points: adjustedPoints,
          description: description.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Unable to adjust points."
        );
      }

      setModalOpen(false);
      setSelectedAccount(null);
      setSuccess("Reward points adjusted successfully.");

      await fetchRewards();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const changePage = (nextPage: number) => {
    if (
      nextPage < 1 ||
      nextPage > pagination.totalPages
    ) {
      return;
    }

    setPagination((previous) => ({
      ...previous,
      page: nextPage,
    }));
  };

  return (
    <div className="min-h-screen space-y-7 bg-[#faf7f4] p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-[#f1e3d8] p-2.5">
              <Award className="text-[#9a4f24]" size={25} />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-[#3b2115] sm:text-3xl">
                Rewards & Loyalty
              </h1>

              <p className="mt-1 text-sm text-[#80695b]">
                Manage customer loyalty points and reward activity.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchRewards}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#eaded4] bg-white px-4 py-2.5 text-sm font-semibold text-[#593b2b] shadow-sm transition hover:bg-[#f8eee7] disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            className={loading ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </div>

      {/* Messages */}
      {error && !modalOpen && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          <span>{success}</span>
          <button
            type="button"
            onClick={() => setSuccess("")}
            aria-label="Dismiss success message"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Loyalty Members"
          value={summary.totalMembers}
          icon={Users}
          iconColor="text-blue-700"
          iconBackground="bg-blue-100"
          description="Customers with reward accounts"
          loading={loading}
        />

        <StatCard
          title="Points in Circulation"
          value={summary.totalPoints}
          icon={Coins}
          iconColor="text-amber-700"
          iconBackground="bg-amber-100"
          description="Current customer point balances"
          loading={loading}
        />

        <StatCard
          title="Points Earned"
          value={summary.totalEarnedPoints}
          icon={TrendingUp}
          iconColor="text-green-700"
          iconBackground="bg-green-100"
          description={`${formatNumber(summary.earnedTransactions)} earning transactions`}
          loading={loading}
        />

        <StatCard
          title="Points Redeemed"
          value={summary.totalRedeemedPoints}
          icon={Gift}
          iconColor="text-purple-700"
          iconBackground="bg-purple-100"
          description={`${formatNumber(summary.redeemedTransactions)} redemption transactions`}
          loading={loading}
        />
      </div>

      {/* Activity Summary */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-[#eaded4] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#80695b]">
                Expired Points
              </p>
              <h3 className="mt-2 text-2xl font-bold text-[#3b2115]">
                {formatNumber(summary.totalExpiredPoints)}
              </h3>
            </div>

            <div className="rounded-xl bg-red-50 p-3">
              <TrendingDown className="text-red-600" size={22} />
            </div>
          </div>

          <p className="mt-3 text-xs text-[#a18b7c]">
            {formatNumber(summary.expiredTransactions)} expiration transactions
          </p>
        </div>

        <div className="rounded-2xl border border-[#eaded4] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#80695b]">
                Total Transactions
              </p>
              <h3 className="mt-2 text-2xl font-bold text-[#3b2115]">
                {formatNumber(summary.totalTransactions)}
              </h3>
            </div>

            <div className="rounded-xl bg-blue-50 p-3">
              <History className="text-blue-600" size={22} />
            </div>
          </div>

          <p className="mt-3 text-xs text-[#a18b7c]">
            All recorded reward activities
          </p>
        </div>

        <div className="rounded-2xl border border-[#eaded4] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#80695b]">
                Redeemed Transactions
              </p>
              <h3 className="mt-2 text-2xl font-bold text-[#3b2115]">
                {formatNumber(summary.redeemedTransactions)}
              </h3>
            </div>

            <div className="rounded-xl bg-purple-50 p-3">
              <Gift className="text-purple-600" size={22} />
            </div>
          </div>

          <p className="mt-3 text-xs text-[#a18b7c]">
            Customer reward redemptions
          </p>
        </div>
      </div>

      {/* Customer Accounts */}
      <section className="overflow-hidden rounded-2xl border border-[#eaded4] bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-[#f0e7e0] p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-bold text-[#3b2115]">
              Customer Loyalty Accounts
            </h2>
            <p className="mt-1 text-sm text-[#80695b]">
              View and manage customer reward balances.
            </p>
          </div>

          <div className="relative w-full sm:max-w-xs">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a18b7c]"
            />

            <input
              type="text"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPagination((previous) => ({
                  ...previous,
                  page: 1,
                }));
              }}
              placeholder="Search name, email or phone..."
              className="w-full rounded-xl border border-[#eaded4] bg-[#fdfbf9] py-2.5 pl-10 pr-4 text-sm text-[#3b2115] outline-none transition focus:border-[#b87950] focus:ring-2 focus:ring-[#b87950]/10"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left">
            <thead className="bg-[#faf7f4]">
              <tr className="text-xs font-semibold uppercase tracking-wide text-[#80695b]">
                <th className="px-5 py-4">Customer</th>
                <th className="px-5 py-4">Phone</th>
                <th className="px-5 py-4">Available Points</th>
                <th className="px-5 py-4">Member Since</th>
                <th className="px-5 py-4 text-right">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#f2ebe5]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center">
                    <Loader2
                      size={25}
                      className="mx-auto animate-spin text-[#9a4f24]"
                    />
                    <p className="mt-3 text-sm text-[#80695b]">
                      Loading loyalty accounts...
                    </p>
                  </td>
                </tr>
              ) : accounts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-14 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f5e9df]">
                      <Award size={25} className="text-[#9a4f24]" />
                    </div>

                    <p className="mt-3 font-semibold text-[#3b2115]">
                      No loyalty accounts found
                    </p>

                    <p className="mt-1 text-sm text-[#80695b]">
                      Try another search or check back later.
                    </p>
                  </td>
                </tr>
              ) : (
                accounts.map((account) => (
                  <tr
                    key={account.id}
                    className="transition hover:bg-[#fdfbf9]"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {account.user.image ? (
                          <img
                            src={account.user.image}
                            alt={account.user.name || "Customer"}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f1e3d8] font-bold text-[#9a4f24]">
                            {(account.user.name || account.user.email)
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                        )}

                        <div className="min-w-0">
                          <p className="font-semibold text-[#3b2115]">
                            {account.user.name || "Unnamed Customer"}
                          </p>
                          <p className="max-w-[220px] truncate text-xs text-[#a18b7c]">
                            {account.user.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-sm text-[#80695b]">
                      {account.user.phone || "—"}
                    </td>

                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-1.5 text-sm font-bold text-amber-800">
                        <Coins size={15} />
                        {formatNumber(account.points)}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-sm text-[#80695b]">
                      {new Date(account.createdAt).toLocaleDateString(
                        "en-IN",
                        {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        }
                      )}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => openAdjustment(account)}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#9a4f24] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#7f3e1c]"
                      >
                        <Gift size={14} />
                        Adjust Points
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col justify-between gap-3 border-t border-[#f0e7e0] px-5 py-4 sm:flex-row sm:items-center">
          <p className="text-sm text-[#80695b]">
            Showing{" "}
            <span className="font-semibold text-[#3b2115]">
              {accounts.length === 0
                ? 0
                : (pagination.page - 1) * pagination.limit + 1}
              {"–"}
              {(pagination.page - 1) * pagination.limit +
                accounts.length}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-[#3b2115]">
              {formatNumber(pagination.total)}
            </span>{" "}
            accounts
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => changePage(pagination.page - 1)}
              disabled={pagination.page <= 1 || loading}
              className="rounded-lg border border-[#eaded4] p-2 text-[#593b2b] transition hover:bg-[#f8eee7] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft size={18} />
            </button>

            <span className="px-2 text-sm font-medium text-[#593b2b]">
              Page {pagination.page} of {pagination.totalPages}
            </span>

            <button
              type="button"
              onClick={() => changePage(pagination.page + 1)}
              disabled={
                pagination.page >= pagination.totalPages || loading
              }
              className="rounded-lg border border-[#eaded4] p-2 text-[#593b2b] transition hover:bg-[#f8eee7] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* Points Adjustment Modal */}
      {modalOpen && selectedAccount && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <div className="my-auto w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#3b2115]">
                  Adjust Reward Points
                </h2>
                <p className="mt-1 text-sm text-[#80695b]">
                  Update customer's loyalty balance.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                className="rounded-lg p-2 text-[#80695b] transition hover:bg-[#f5eee8]"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-5 rounded-xl bg-[#faf7f4] p-4">
              <p className="text-sm font-semibold text-[#3b2115]">
                {selectedAccount.user.name || "Unnamed Customer"}
              </p>
              <p className="mt-1 text-xs text-[#80695b]">
                {selectedAccount.user.email}
              </p>

              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm text-[#80695b]">
                  Current balance
                </span>
                <span className="font-bold text-amber-700">
                  {formatNumber(selectedAccount.points)} points
                </span>
              </div>
            </div>

            <form
              onSubmit={handleAdjustment}
              className="mt-5 space-y-4"
            >
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#593b2b]">
                  Adjustment Type
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAdjustmentType("ADD")}
                    className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                      adjustmentType === "ADD"
                        ? "border-green-500 bg-green-50 text-green-700"
                        : "border-[#eaded4] text-[#80695b]"
                    }`}
                  >
                    <Plus size={17} />
                    Add Points
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdjustmentType("DEDUCT")}
                    className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                      adjustmentType === "DEDUCT"
                        ? "border-red-500 bg-red-50 text-red-700"
                        : "border-[#eaded4] text-[#80695b]"
                    }`}
                  >
                    <Minus size={17} />
                    Deduct Points
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="reward-points"
                  className="mb-2 block text-sm font-semibold text-[#593b2b]"
                >
                  Points
                </label>

                <input
                  id="reward-points"
                  type="number"
                  min="1"
                  max="100000"
                  step="1"
                  required
                  value={points}
                  onChange={(event) => setPoints(event.target.value)}
                  placeholder="Enter points"
                  className="w-full rounded-xl border border-[#eaded4] px-4 py-3 text-sm outline-none transition focus:border-[#b87950] focus:ring-2 focus:ring-[#b87950]/10"
                />
              </div>

              <div>
                <label
                  htmlFor="reward-description"
                  className="mb-2 block text-sm font-semibold text-[#593b2b]"
                >
                  Reason
                </label>

                <textarea
                  id="reward-description"
                  rows={3}
                  required
                  value={description}
                  onChange={(event) =>
                    setDescription(event.target.value)
                  }
                  placeholder="Enter reason for this adjustment..."
                  className="w-full resize-none rounded-xl border border-[#eaded4] px-4 py-3 text-sm outline-none transition focus:border-[#b87950] focus:ring-2 focus:ring-[#b87950]/10"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle
                    size={17}
                    className="mt-0.5 shrink-0"
                  />
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="flex-1 rounded-xl border border-[#eaded4] px-4 py-3 text-sm font-semibold text-[#593b2b] transition hover:bg-[#faf7f4] disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold text-white transition disabled:opacity-60 ${
                    adjustmentType === "ADD"
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 size={16} className="animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    adjustmentType === "ADD"
                      ? "Add Points"
                      : "Deduct Points"
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
