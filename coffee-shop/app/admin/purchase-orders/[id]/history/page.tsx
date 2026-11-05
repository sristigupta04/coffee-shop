
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type Movement = {
  id: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string | null;
  createdAt: string;
  product: {
    id: string;
    name: string;
    image: string | null;
    stock: number;
  };
  user: {
    id: string;
    name: string | null;
    email: string;
  };
};

type PurchaseOrder = {
  id: string;
  orderNumber: string;
  status: string;
  supplier: {
    id: string;
    name: string;
  };
};

type HistoryResponse = {
  success: boolean;
  message?: string;
  data: {
    purchaseOrder: PurchaseOrder;
    movements: Movement[];
    summary: {
      totalRecords: number;
      totalReceivedQuantity: number;
    };
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  };
};

export default function PurchaseOrderHistoryPage() {
  const params = useParams();
  const id = params.id as string;

  const [data, setData] = useState<HistoryResponse["data"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  const fetchHistory = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/admin/purchase-orders/${id}/history?page=${page}&limit=10`,
        { cache: "no-store" }
      );

      const result: HistoryResponse = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to load receiving history");
      }

      setData(result.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }, [id, page]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const formatDate = (date: string) =>
    new Date(date).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });

  if (loading && !data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-[#80695B]">Loading receiving history...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <p className="font-medium text-red-700">{error}</p>
        <button
          onClick={fetchHistory}
          className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { purchaseOrder, movements, summary, pagination } = data;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href={`/admin/purchase-orders/${id}`}
            className="text-sm text-[#80695B] hover:text-[#754426]"
          >
            ← Back to Purchase Order
          </Link>

          <h1 className="mt-3 text-2xl font-bold text-[#2B1B14]">
            Receiving History
          </h1>

          <p className="mt-1 text-sm text-[#80695B]">
            {purchaseOrder.orderNumber} · {purchaseOrder.supplier.name}
          </p>
        </div>

        <button
          onClick={fetchHistory}
          disabled={loading}
          className="rounded-lg border border-[#EADED4] px-4 py-2 text-sm font-medium text-[#754426] hover:bg-[#F8F3ED] disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-[#EADED4] bg-white p-5">
          <p className="text-sm text-[#80695B]">Total Receiving Records</p>
          <p className="mt-2 text-2xl font-bold text-[#2B1B14]">
            {summary.totalRecords}
          </p>
        </div>

        <div className="rounded-xl border border-[#EADED4] bg-white p-5">
          <p className="text-sm text-[#80695B]">Total Quantity Received</p>
          <p className="mt-2 text-2xl font-bold text-[#754426]">
            {summary.totalReceivedQuantity}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#EADED4] bg-white">
        <div className="border-b border-[#EADED4] p-5">
          <h2 className="font-semibold text-[#2B1B14]">
            Receiving Transactions
          </h2>
        </div>

        {movements.length === 0 ? (
          <div className="p-10 text-center">
            <p className="font-medium text-[#2B1B14]">
              No receiving records found
            </p>
            <p className="mt-1 text-sm text-[#80695B]">
              Received stock transactions will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-[#F8F3ED] text-[#80695B]">
                <tr>
                  <th className="px-5 py-3 font-medium">Product</th>
                  <th className="px-5 py-3 font-medium">Received Qty</th>
                  <th className="px-5 py-3 font-medium">Previous Stock</th>
                  <th className="px-5 py-3 font-medium">New Stock</th>
                  <th className="px-5 py-3 font-medium">Received By</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#EADED4]">
                {movements.map((movement) => (
                  <tr key={movement.id} className="hover:bg-[#FDFBF9]">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {movement.product.image ? (
                          <img
                            src={movement.product.image}
                            alt={movement.product.name}
                            className="h-10 w-10 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#F8F3ED] text-xs text-[#80695B]">
                            N/A
                          </div>
                        )}

                        <span className="font-medium text-[#2B1B14]">
                          {movement.product.name}
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-4 font-semibold text-green-700">
                      +{movement.quantity}
                    </td>

                    <td className="px-5 py-4 text-[#80695B]">
                      {movement.previousStock}
                    </td>

                    <td className="px-5 py-4 font-medium text-[#2B1B14]">
                      {movement.newStock}
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-medium text-[#2B1B14]">
                        {movement.user.name || "Admin"}
                      </p>
                      <p className="text-xs text-[#80695B]">
                        {movement.user.email}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-[#80695B]">
                      {formatDate(movement.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[#EADED4] p-4">
            <p className="text-sm text-[#80695B]">
              Page {pagination.page} of {pagination.totalPages}
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setPage((current) => current - 1)}
                disabled={!pagination.hasPreviousPage || loading}
                className="rounded-lg border border-[#EADED4] px-3 py-2 text-sm disabled:opacity-40"
              >
                Previous
              </button>

              <button
                onClick={() => setPage((current) => current + 1)}
                disabled={!pagination.hasNextPage || loading}
                className="rounded-lg bg-[#754426] px-3 py-2 text-sm text-white disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
