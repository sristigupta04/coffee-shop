
"use client";

import { useCallback, useEffect, useState } from "react";

type Supplier = {
  id: string;
  name: string;
  isActive?: boolean;
};

type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
};

type POItem = {
  id: string;
  productId: string;
  orderedQuantity: number;
  receivedQuantity: number;
  unitCost: number;
  product: Product;
};

type PurchaseOrder = {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: number;
  tax: number;
  shippingCost: number;
  totalAmount: number;
  notes?: string | null;
  expectedDate?: string | null;
  createdAt: string;
  supplier: Supplier;
  items?: POItem[];
  _count?: { items: number };
};

const STATUSES = [
  "ALL",
  "DRAFT",
  "ORDERED",
  "PARTIALLY_RECEIVED",
  "RECEIVED",
  "CANCELLED",
];

const currency = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount || 0);

const statusStyle: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  ORDERED: "bg-blue-100 text-blue-700",
  PARTIALLY_RECEIVED: "bg-amber-100 text-amber-800",
  RECEIVED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const inputClass =
  "w-full rounded-lg border border-[#EADED4] bg-white px-3 py-2.5 text-sm text-[#2B1B14] outline-none focus:border-[#A76535]";

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [showCreate, setShowCreate] = useState(false);
  const [showReceive, setShowReceive] = useState(false);
  const [selectedOrder, setSelectedOrder] =
    useState<PurchaseOrder | null>(null);

  const [supplierId, setSupplierId] = useState("");
  const [notes, setNotes] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [tax, setTax] = useState("0");
  const [shippingCost, setShippingCost] = useState("0");

  const [formItems, setFormItems] = useState<
    { productId: string; orderedQuantity: string; unitCost: string }[]
  >([{ productId: "", orderedQuantity: "1", unitCost: "0" }]);

  const [receiveQuantities, setReceiveQuantities] = useState<
    Record<string, string>
  >({});

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
        search,
        status,
      });

      const response = await fetch(
        `/api/admin/purchase-orders?${params.toString()}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not load purchase orders");
      }

      setOrders(data.purchaseOrders || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  const loadFormData = async () => {
    try {
      const [supplierResponse, productResponse] = await Promise.all([
        fetch("/api/admin/suppliers?status=ACTIVE"),
        fetch("/api/products?limit=100"),
      ]);

      const supplierData = await supplierResponse.json();
      const productData = await productResponse.json();

      if (!supplierResponse.ok) {
        throw new Error(supplierData.message || "Could not load suppliers");
      }

      if (!productResponse.ok) {
        throw new Error(productData.message || "Could not load products");
      }

      setSuppliers(
        (supplierData.suppliers || []).filter(
          (supplier: Supplier) => supplier.isActive !== false
        )
      );

      setProducts(
        productData.products ||
          productData.data?.products ||
          (Array.isArray(productData) ? productData : [])
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load form data"
      );
    }
  };

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    loadFormData();
  }, []);

  const resetMessages = () => {
    setError("");
    setSuccess("");
  };

  const resetCreateForm = () => {
    setSupplierId("");
    setNotes("");
    setExpectedDate("");
    setTax("0");
    setShippingCost("0");
    setFormItems([
      { productId: "", orderedQuantity: "1", unitCost: "0" },
    ]);
  };

  const addItem = () => {
    setFormItems((current) => [
      ...current,
      { productId: "", orderedQuantity: "1", unitCost: "0" },
    ]);
  };

  const updateItem = (
    index: number,
    field: "productId" | "orderedQuantity" | "unitCost",
    value: string
  ) => {
    setFormItems((current) =>
      current.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  };

  const removeItem = (index: number) => {
    setFormItems((current) => current.filter((_, i) => i !== index));
  };

  const estimatedSubtotal = formItems.reduce((sum, item) => {
    return (
      sum +
      Math.max(0, Number(item.orderedQuantity) || 0) *
        Math.max(0, Number(item.unitCost) || 0)
    );
  }, 0);

  const estimatedTotal =
    estimatedSubtotal +
    Math.max(0, Number(tax) || 0) +
    Math.max(0, Number(shippingCost) || 0);

  const createOrder = async (event: React.FormEvent) => {
    event.preventDefault();
    resetMessages();

    if (!supplierId) {
      setError("Please select a supplier");
      return;
    }

    if (
      formItems.some(
        (item) =>
          !item.productId ||
          !Number.isInteger(Number(item.orderedQuantity)) ||
          Number(item.orderedQuantity) <= 0 ||
          !Number.isFinite(Number(item.unitCost)) ||
          Number(item.unitCost) < 0
      )
    ) {
      setError("Please enter valid product quantities and unit costs");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/admin/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId,
          notes,
          expectedDate: expectedDate || null,
          tax: Number(tax),
          shippingCost: Number(shippingCost),
          items: formItems.map((item) => ({
            productId: item.productId,
            orderedQuantity: Number(item.orderedQuantity),
            unitCost: Number(item.unitCost),
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not create purchase order");
      }

      setShowCreate(false);
      resetCreateForm();
      setSuccess("Purchase order created successfully");
      await loadOrders();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not create purchase order"
      );
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (
    order: PurchaseOrder,
    newStatus: "ORDERED" | "CANCELLED"
  ) => {
    const message =
      newStatus === "ORDERED"
        ? "Mark this purchase order as ordered?"
        : "Cancel this draft purchase order?";

    if (!window.confirm(message)) return;

    resetMessages();
    setSaving(true);

    try {
      const response = await fetch(
        `/api/admin/purchase-orders/${order.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not update order");
      }

      setSuccess(data.message || "Purchase order updated");
      await loadOrders();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not update order"
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteOrder = async (order: PurchaseOrder) => {
    if (!window.confirm(`Delete draft ${order.orderNumber}?`)) return;

    resetMessages();
    setSaving(true);

    try {
      const response = await fetch(
        `/api/admin/purchase-orders/${order.id}`,
        { method: "DELETE" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not delete order");
      }

      setSuccess("Purchase order deleted");
      await loadOrders();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not delete order"
      );
    } finally {
      setSaving(false);
    }
  };

  const openReceiveModal = async (order: PurchaseOrder) => {
    resetMessages();
    setSaving(true);

    try {
      const response = await fetch(
        `/api/admin/purchase-orders/${order.id}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not load order details");
      }

      const detailedOrder = data.purchaseOrder as PurchaseOrder;

      setSelectedOrder(detailedOrder);
      setReceiveQuantities(
        Object.fromEntries(
          (detailedOrder.items || []).map((item) => [
            item.id,
            String(
              Math.max(
                0,
                item.orderedQuantity - item.receivedQuantity
              )
            ),
          ])
        )
      );
      setShowReceive(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load order details"
      );
    } finally {
      setSaving(false);
    }
  };

  const receiveStock = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedOrder) return;

    resetMessages();

    const items = (selectedOrder.items || [])
      .map((item) => ({
        purchaseOrderItemId: item.id,
        receivedQuantity: Number(receiveQuantities[item.id] || 0),
      }))
      .filter((item) => item.receivedQuantity > 0);

    if (items.length === 0) {
      setError("Enter at least one quantity to receive");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        `/api/admin/purchase-orders/${selectedOrder.id}/receive`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Stock receiving failed");
      }

      setShowReceive(false);
      setSelectedOrder(null);
      setSuccess("Stock received and inventory updated successfully");
      await loadOrders();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Stock receiving failed"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F8F3ED] p-4 text-[#2B1B14] sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-[#A76535]">
              INVENTORY MANAGEMENT
            </p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
              Purchase Orders
            </h1>
            <p className="mt-1 text-sm text-[#80695B]">
              Manage suppliers, orders and incoming stock.
            </p>
          </div>

          <button
            onClick={() => {
              resetMessages();
              resetCreateForm();
              setShowCreate(true);
            }}
            className="rounded-lg bg-[#754426] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2B1B14]"
          >
            + Create Purchase Order
          </button>
        </div>

        {/* Notifications */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
            <button
              onClick={() => setError("")}
              className="float-right font-bold"
            >
              ×
            </button>
          </div>
        )}

        {success && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            {success}
            <button
              onClick={() => setSuccess("")}
              className="float-right font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* Filters */}
        <section className="rounded-xl border border-[#EADED4] bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search order number or supplier..."
              className={inputClass}
            />

            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
              className={inputClass}
            >
              {STATUSES.map((item) => (
                <option key={item} value={item}>
                  {item.replaceAll("_", " ")}
                </option>
              ))}
            </select>

            <button
              onClick={() => {
                setSearch("");
                setStatus("ALL");
                setPage(1);
              }}
              className="rounded-lg border border-[#EADED4] px-4 py-2 text-sm font-medium hover:bg-[#F8F3ED]"
            >
              Clear filters
            </button>
          </div>
        </section>

        {/* Orders table */}
        <section className="overflow-hidden rounded-xl border border-[#EADED4] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#EADED4] p-4">
            <h2 className="font-semibold">All Purchase Orders</h2>
            <button
              onClick={loadOrders}
              className="text-sm font-semibold text-[#A76535] hover:underline"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="p-12 text-center text-sm text-[#80695B]">
              Loading purchase orders...
            </div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-4xl">📦</div>
              <h3 className="mt-3 font-semibold">No purchase orders found</h3>
              <p className="mt-1 text-sm text-[#80695B]">
                Create a purchase order to start tracking incoming stock.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-[#F8F3ED] text-xs uppercase text-[#80695B]">
                  <tr>
                    <th className="px-5 py-4">Order</th>
                    <th className="px-5 py-4">Supplier</th>
                    <th className="px-5 py-4">Items</th>
                    <th className="px-5 py-4">Total</th>
                    <th className="px-5 py-4">Expected date</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#EADED4]">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-[#FDFBF8]">
                      <td className="px-5 py-4">
                        <p className="font-semibold">{order.orderNumber}</p>
                        <p className="mt-1 text-xs text-[#80695B]">
                          {new Date(order.createdAt).toLocaleDateString("en-IN")}
                        </p>
                      </td>

                      <td className="px-5 py-4 font-medium">
                        {order.supplier?.name || "—"}
                      </td>

                      <td className="px-5 py-4">
                        {order._count?.items ?? order.items?.length ?? 0}
                      </td>

                      <td className="px-5 py-4 font-semibold">
                        {currency(order.totalAmount)}
                      </td>

                      <td className="px-5 py-4 text-[#80695B]">
                        {order.expectedDate
                          ? new Date(order.expectedDate).toLocaleDateString("en-IN")
                          : "Not set"}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            statusStyle[order.status] ||
                            "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {order.status.replaceAll("_", " ")}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          {order.status === "DRAFT" && (
                            <>
                              <button
                                disabled={saving}
                                onClick={() =>
                                  updateStatus(order, "ORDERED")
                                }
                                className="rounded-md bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                              >
                                Mark ordered
                              </button>

                              <button
                                disabled={saving}
                                onClick={() => deleteOrder(order)}
                                className="rounded-md bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                              >
                                Delete
                              </button>
                            </>
                          )}

                          {["ORDERED", "PARTIALLY_RECEIVED"].includes(
                            order.status
                          ) && (
                            <button
                              disabled={saving}
                              onClick={() => openReceiveModal(order)}
                              className="rounded-md bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100 disabled:opacity-50"
                            >
                              Receive stock
                            </button>
                          )}

                          {order.status === "DRAFT" && (
                            <button
                              disabled={saving}
                              onClick={() =>
                                updateStatus(order, "CANCELLED")
                              }
                              className="rounded-md border border-[#EADED4] px-3 py-1.5 text-xs font-semibold hover:bg-[#F8F3ED] disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-[#EADED4] p-4">
            <p className="text-xs text-[#80695B]">
              Page {page} of {totalPages}
            </p>

            <div className="flex gap-2">
              <button
                disabled={page <= 1 || loading}
                onClick={() => setPage((current) => current - 1)}
                className="rounded-lg border border-[#EADED4] px-4 py-2 text-sm disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages || loading}
                onClick={() => setPage((current) => current + 1)}
                className="rounded-lg border border-[#EADED4] px-4 py-2 text-sm disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* CREATE PURCHASE ORDER MODAL */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-[#EADED4] bg-white p-5">
              <div>
                <h2 className="text-xl font-bold">Create Purchase Order</h2>
                <p className="mt-1 text-xs text-[#80695B]">
                  Add supplier and products to your order.
                </p>
              </div>
              <button
                onClick={() => setShowCreate(false)}
                className="text-2xl text-[#80695B]"
              >
                ×
              </button>
            </div>

            <form onSubmit={createOrder} className="space-y-5 p-5">
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Supplier *
                </label>
                <select
                  required
                  value={supplierId}
                  onChange={(event) => setSupplierId(event.target.value)}
                  className={inputClass}
                >
                  <option value="">Select supplier</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
                {suppliers.length === 0 && (
                  <p className="mt-1 text-xs text-red-600">
                    No active suppliers found. Add a supplier first.
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Order Items</h3>
                  <button
                    type="button"
                    onClick={addItem}
                    className="text-sm font-semibold text-[#A76535]"
                  >
                    + Add product
                  </button>
                </div>

                {formItems.map((item, index) => (
                  <div
                    key={index}
                    className="grid gap-3 rounded-xl border border-[#EADED4] p-3 sm:grid-cols-[1fr_110px_130px_auto]"
                  >
                    <select
                      required
                      value={item.productId}
                      onChange={(event) => {
                        const selected = products.find(
                          (product) => product.id === event.target.value
                        );

                        updateItem(index, "productId", event.target.value);

                        if (selected) {
                          updateItem(
                            index,
                            "unitCost",
                            String(selected.price)
                          );
                        }
                      }}
                      className={inputClass}
                    >
                      <option value="">Select product</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} (Stock: {product.stock})
                        </option>
                      ))}
                    </select>

                    <input
                      required
                      type="number"
                      min="1"
                      step="1"
                      value={item.orderedQuantity}
                      onChange={(event) =>
                        updateItem(index, "orderedQuantity", event.target.value)
                      }
                      placeholder="Quantity"
                      className={inputClass}
                    />

                    <input
                      required
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitCost}
                      onChange={(event) =>
                        updateItem(index, "unitCost", event.target.value)
                      }
                      placeholder="Unit cost"
                      className={inputClass}
                    />

                    <button
                      type="button"
                      disabled={formItems.length === 1}
                      onClick={() => removeItem(index)}
                      className="rounded-lg px-3 text-sm font-semibold text-red-600 disabled:opacity-30"
                    >
                      Remove
                    </button>
                  </div>
                ))}

                {products.length === 0 && (
                  <p className="text-xs text-red-600">
                    No products loaded. Check your products API response.
                  </p>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Tax amount (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={tax}
                    onChange={(event) => setTax(event.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Shipping cost (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={shippingCost}
                    onChange={(event) =>
                      setShippingCost(event.target.value)
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Expected delivery
                  </label>
                  <input
                    type="date"
                    value={expectedDate}
                    onChange={(event) =>
                      setExpectedDate(event.target.value)
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Notes
                  </label>
                  <input
                    maxLength={1000}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Optional notes"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="rounded-xl bg-[#F8F3ED] p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-[#80695B]">Subtotal</span>
                  <span>{currency(estimatedSubtotal)}</span>
                </div>
                <div className="mt-2 flex justify-between text-sm">
                  <span className="text-[#80695B]">Tax + Shipping</span>
                  <span>
                    {currency(
                      (Number(tax) || 0) + (Number(shippingCost) || 0)
                    )}
                  </span>
                </div>
                <div className="mt-3 flex justify-between border-t border-[#EADED4] pt-3 font-bold">
                  <span>Estimated total</span>
                  <span className="text-[#754426]">
                    {currency(estimatedTotal)}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="rounded-lg border border-[#EADED4] px-5 py-2.5 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    saving ||
                    suppliers.length === 0 ||
                    products.length === 0
                  }
                  className="rounded-lg bg-[#754426] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2B1B14] disabled:opacity-50"
                >
                  {saving ? "Creating..." : "Create Draft Order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECEIVE STOCK MODAL */}
      {showReceive && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#EADED4] p-5">
              <div>
                <h2 className="text-xl font-bold">Receive Stock</h2>
                <p className="mt-1 text-xs text-[#80695B]">
                  {selectedOrder.orderNumber} · {selectedOrder.supplier?.name}
                </p>
              </div>
              <button
                onClick={() => setShowReceive(false)}
                className="text-2xl text-[#80695B]"
              >
                ×
              </button>
            </div>

            <form onSubmit={receiveStock} className="space-y-4 p-5">
              {(selectedOrder.items || []).map((item) => {
                const remaining =
                  item.orderedQuantity - item.receivedQuantity;

                return (
                  <div
                    key={item.id}
                    className="grid grid-cols-[1fr_100px_110px] items-center gap-3 rounded-xl border border-[#EADED4] p-3"
                  >
                    <div>
                      <p className="text-sm font-semibold">
                        {item.product.name}
                      </p>
                      <p className="mt-1 text-xs text-[#80695B]">
                        Ordered: {item.orderedQuantity} · Received:{" "}
                        {item.receivedQuantity} · Remaining: {remaining}
                      </p>
                    </div>

                    <div className="text-right text-xs text-[#80695B]">
                      Receive
                    </div>

                    <input
                      type="number"
                      min="0"
                      max={remaining}
                      step="1"
                      value={receiveQuantities[item.id] ?? "0"}
                      onChange={(event) =>
                        setReceiveQuantities((current) => ({
                          ...current,
                          [item.id]: event.target.value,
                        }))
                      }
                      className={inputClass}
                    />
                  </div>
                );
              })}

              <p className="text-xs text-[#80695B]">
                Enter only the quantities physically received. Leave other
                items at zero. Inventory will update after submission.
              </p>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowReceive(false)}
                  className="rounded-lg border border-[#EADED4] px-5 py-2.5 text-sm font-semibold"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-green-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50"
                >
                  {saving ? "Processing..." : "Confirm Receiving"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
