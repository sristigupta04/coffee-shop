
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Check } from "lucide-react";

type Props = {
  orderId: string;
  currentStatus: string;
  onUpdated?: (status: string) => void;
};

const transitions: Record<string, string[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY"],
  READY: ["OUT_FOR_DELIVERY", "DELIVERED"],
  OUT_FOR_DELIVERY: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

export default function OrderStatusControl({
  orderId,
  currentStatus,
  onUpdated,
}: Props) {
  const router = useRouter();

  const [status, setStatus] = useState(currentStatus);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const availableStatuses = transitions[status] ?? [];

  async function updateStatus() {
    if (!selected || loading) return;

    if (selected === "CANCELLED") {
      const confirmed = window.confirm(
        "Are you sure you want to cancel this order? This action cannot be undone."
      );

      if (!confirmed) return;
    }

    try {
      setLoading(true);
      setMessage("");
      setError("");

      const response = await fetch(
        `/api/admin/orders/${encodeURIComponent(orderId)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: selected,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Status update failed."
        );
      }

      const updatedStatus = result.order.status;

      setStatus(updatedStatus);
      setSelected("");
      setMessage("Order status updated successfully.");

      onUpdated?.(updatedStatus);

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
    <section className="rounded-2xl border border-[#EADED4] bg-white p-5">
      <h2 className="font-bold text-[#2B1B14]">
        Update Order Status
      </h2>

      <p className="mt-1 text-sm text-[#80695B]">
        Current status: {status.replaceAll("_", " ")}
      </p>

      {availableStatuses.length > 0 ? (
        <div className="mt-4 flex flex-col gap-3">
          <select
            value={selected}
            onChange={(event) => {
              setSelected(event.target.value);
              setError("");
              setMessage("");
            }}
            disabled={loading}
            className="w-full rounded-xl border border-[#EADED4] bg-[#F8F3ED] px-4 py-3 text-sm text-[#2B1B14] outline-none focus:border-[#754426] disabled:opacity-60"
          >
            <option value="">Select next status</option>

            {availableStatuses.map((item) => (
              <option key={item} value={item}>
                {item.replaceAll("_", " ")}
              </option>
            ))}
          </select>

          {selected === "CANCELLED" && (
            <p className="rounded-lg bg-red-50 p-3 text-xs text-red-700">
              Cancellation of paid online orders requires a completed refund.
            </p>
          )}

          <button
            type="button"
            onClick={updateStatus}
            disabled={!selected || loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2B1B14] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#754426] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <Check size={16} />
            )}

            {loading ? "Updating..." : "Update Status"}
          </button>
        </div>
      ) : (
        <p className="mt-4 rounded-lg bg-[#F8F3ED] p-3 text-sm text-[#80695B]">
          This order has reached a final status.
        </p>
      )}

      {message && (
        <p role="status" className="mt-3 text-sm text-green-700">
          {message}
        </p>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}
    </section>
  );
}
