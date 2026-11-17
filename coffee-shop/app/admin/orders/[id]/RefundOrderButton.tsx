
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, X, Loader2 } from "lucide-react";

type RefundOrderButtonProps = {
  orderId: string;
  paymentWay: string;
  paymentStatus: string;
  orderStatus: string;
  refundStatus: string;
};

export default function RefundOrderButton({
  orderId,
  paymentWay,
  paymentStatus,
  orderStatus,
  refundStatus,
}: RefundOrderButtonProps) {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isOnlinePayment =
    paymentWay === "RAZORPAY" || paymentWay === "ONLINE";

  const canRefund =
    isOnlinePayment &&
    paymentStatus === "PAID" &&
    orderStatus !== "DELIVERED" &&
    refundStatus !== "REFUNDING" &&
    refundStatus !== "PENDING" &&
    refundStatus !== "PROCESSED";

  const isRetry = refundStatus === "FAILED";

  if (!canRefund) return null;

  async function handleRefund() {
    setError("");
    setSuccess("");

    if (!reason.trim()) {
      setError("Please enter a refund reason.");
      return;
    }

    const confirmed = window.confirm(
      isRetry
        ? "Are you sure you want to retry this refund?"
        : "Are you sure you want to initiate this refund?"
    );

    if (!confirmed) return;

    try {
      setLoading(true);

      const response = await fetch(
        `/api/admin/orders/${orderId}/refund`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reason: reason.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to process refund."
        );
      }

      setSuccess(
        data.message || "Refund request submitted successfully."
      );
      setIsOpen(false);
      setReason("");

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => {
          setError("");
          setSuccess("");
          setIsOpen(true);
        }}
        className="inline-flex items-center gap-2 rounded-lg bg-[#8B4513] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#6F3610]"
      >
        <RotateCcw size={16} />
        {isRetry ? "Retry Refund" : "Initiate Refund"}
      </button>

      {error && !isOpen && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {success && (
        <p className="text-sm text-green-700">{success}</p>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#3E2723]">
                {isRetry ? "Retry Refund" : "Initiate Refund"}
              </h3>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={loading}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <p className="mb-4 text-sm text-gray-600">
              {isRetry
                ? "The previous refund failed. You can submit another refund request."
                : "This will submit a full refund request to Razorpay."}
            </p>

            <label
              htmlFor="refund-reason"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Refund reason
            </label>

            <textarea
              id="refund-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Enter the reason for refund..."
              maxLength={500}
              rows={4}
              disabled={loading}
              className="w-full rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-[#8B4513] focus:ring-1 focus:ring-[#8B4513] disabled:bg-gray-100"
            />

            <p className="mt-1 text-right text-xs text-gray-400">
              {reason.length}/500
            </p>

            {error && (
              <p className="mt-3 text-sm text-red-600">
                {error}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={loading}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleRefund}
                disabled={loading || !reason.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-[#8B4513] px-4 py-2 text-sm font-semibold text-white hover:bg-[#6F3610] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading && (
                  <Loader2 size={16} className="animate-spin" />
                )}
                {loading
                  ? "Processing..."
                  : isRetry
                    ? "Confirm Retry"
                    : "Confirm Refund"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
