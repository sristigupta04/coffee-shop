
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

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

type PurchaseOrderItem = {
  id: string;
  productId: string;
  orderedQuantity: number;
  unitCost: number;
  receivedQuantity: number;
  product: Product;
};

type PurchaseOrder = {
  id: string;
  orderNumber: string;
  status: string;
  supplierId: string;
  tax: number;
  shippingCost: number;
  notes: string | null;
  expectedDate: string | null;
  items: PurchaseOrderItem[];
};

type FormItem = {
  productId: string;
  orderedQuantity: string;
  unitCost: string;
};

const inputClass =
  "w-full rounded-lg border border-[#EADED4] bg-white px-3 py-2.5 text-sm text-[#2B1B14] outline-none focus:border-[#A76535]";

const currency = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount || 0);

export default function EditPurchaseOrderPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [supplierId, setSupplierId] = useState("");
  const [tax, setTax] = useState("0");
  const [shippingCost, setShippingCost] = useState("0");
  const [notes, setNotes] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [items, setItems] = useState<FormItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError("");

      try {
        const [orderResponse, supplierResponse, productResponse] =
          await Promise.all([
            fetch(`/api/admin/purchase-orders/${id}`),
            fetch("/api/admin/suppliers?status=ACTIVE"),
            fetch("/api/products?limit=100"),
          ]);

        const [orderData, supplierData, productData] = await Promise.all([
          orderResponse.json(),
          supplierResponse.json(),
          productResponse.json(),
        ]);

        if (!orderResponse.ok) {
          throw new Error(
            orderData.message || "Could not load purchase order"
          );
        }

        if (!supplierResponse.ok) {
          throw new Error(
            supplierData.message || "Could not load suppliers"
          );
        }

        if (!productResponse.ok) {
          throw new Error(
            productData.message || "Could not load products"
          );
        }

        const currentOrder: PurchaseOrder = orderData.purchaseOrder;

        if (currentOrder.status !== "DRAFT") {
          throw new Error("Only draft purchase orders can be edited");
        }

        const loadedProducts: Product[] =
          productData.products ||
          productData.data?.products ||
          (Array.isArray(productData) ? productData : []);

        if (cancelled) return;

        setOrder(currentOrder);

        setSuppliers(
          (supplierData.suppliers || []).filter(
            (supplier: Supplier) => supplier.isActive !== false
          )
        );

        setProducts(loadedProducts);

        setSupplierId(currentOrder.supplierId);
        setTax(String(currentOrder.tax));
        setShippingCost(String(currentOrder.shippingCost));
        setNotes(currentOrder.notes || "");

        setExpectedDate(
          currentOrder.expectedDate
            ? new Date(currentOrder.expectedDate)
                .toISOString()
                .slice(0, 10)
            : ""
        );

        setItems(
          currentOrder.items.map((item) => ({
            productId: item.productId,
            orderedQuantity: String(item.orderedQuantity),
            unitCost: String(item.unitCost),
          }))
        );
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load purchase order"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const updateItem = (
    index: number,
    field: keyof FormItem,
    value: string
  ) => {
    setItems((current) =>
      current.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  };

  const addItem = () => {
    setItems((current) => [
      ...current,
      { productId: "", orderedQuantity: "1", unitCost: "0" },
    ]);
  };

  const removeItem = (index: number) => {
    setItems((current) => current.filter((_, i) => i !== index));
  };

  const subtotal = items.reduce(
    (sum, item) =>
      sum +
      Math.max(0, Number(item.orderedQuantity) || 0) *
        Math.max(0, Number(item.unitCost) || 0),
    0
  );

  const total =
    subtotal +
    Math.max(0, Number(tax) || 0) +
    Math.max(0, Number(shippingCost) || 0);

  const saveChanges = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (!supplierId) {
      setError("Please select a supplier");
      return;
    }

    if (items.length === 0) {
      setError("Add at least one product");
      return;
    }

    if (
      items.some(
        (item) =>
          !item.productId ||
          !Number.isInteger(Number(item.orderedQuantity)) ||
          Number(item.orderedQuantity) <= 0 ||
          !Number.isFinite(Number(item.unitCost)) ||
          Number(item.unitCost) < 0
      )
    ) {
      setError("Please enter valid product quantities and costs");
      return;
    }

    if (new Set(items.map((item) => item.productId)).size !== items.length) {
      setError("Duplicate products are not allowed");
      return;
    }

    if (
      !Number.isFinite(Number(tax)) ||
      Number(tax) < 0 ||
      !Number.isFinite(Number(shippingCost)) ||
      Number(shippingCost) < 0
    ) {
      setError("Tax and shipping cost must be valid non-negative amounts");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        `/api/admin/purchase-orders/${id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            supplierId,
            tax: Number(tax),
            shippingCost: Number(shippingCost),
            notes,
            expectedDate: expectedDate || null,
            items: items.map((item) => ({
              productId: item.productId,
              orderedQuantity: Number(item.orderedQuantity),
              unitCost: Number(item.unitCost),
            })),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not update purchase order");
      }

      router.push("/admin/purchase-orders");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update purchase order"
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8F3ED]">
        <p className="text-sm text-[#80695B]">Loading purchase order...</p>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="min-h-screen bg-[#F8F3ED] p-6">
        <div className="mx-auto max-w-3xl rounded-xl border border-[#EADED4] bg-white p-6">
          <h1 className="text-xl font-bold">Purchase Order unavailable</h1>
          <p className="mt-2 text-sm text-red-600">
            {error || "Purchase order could not be loaded."}
          </p>
          <button
            onClick={() => router.push("/admin/purchase-orders")}
            className="mt-5 rounded-lg bg-[#754426] px-4 py-2 text-sm font-semibold text-white"
          >
            Back to Purchase Orders
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8F3ED] p-4 text-[#2B1B14] sm:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <button
              onClick={() => router.push("/admin/purchase-orders")}
              className="mb-3 text-sm font-semibold text-[#A76535] hover:underline"
            >
              ← Back to Purchase Orders
            </button>

            <h1 className="text-2xl font-bold sm:text-3xl">
              Edit Purchase Order
            </h1>
            <p className="mt-1 text-sm text-[#80695B]">
              {order.orderNumber} · Draft
            </p>
          </div>

          <span className="rounded-full bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-700">
            DRAFT
          </span>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form
          onSubmit={saveChanges}
          className="space-y-6 rounded-xl border border-[#EADED4] bg-white p-5 shadow-sm sm:p-6"
        >
          <section>
            <h2 className="mb-4 font-semibold">Supplier Details</h2>

            <label className="mb-2 block text-sm font-medium">
              Select Supplier *
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

            {!suppliers.some((supplier) => supplier.id === supplierId) && (
              <p className="mt-2 text-xs text-amber-700">
                The current supplier may be inactive. Select an active
                supplier before saving.
              </p>
            )}
          </section>

          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold">Products</h2>

              <button
                type="button"
                onClick={addItem}
                className="text-sm font-semibold text-[#A76535] hover:underline"
              >
                + Add Product
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="grid gap-3 rounded-xl border border-[#EADED4] p-3 sm:grid-cols-[1fr_110px_130px_auto]"
                >
                  <select
                    required
                    value={item.productId}
                    onChange={(event) => {
                      const product = products.find(
                        (p) => p.id === event.target.value
                      );

                      updateItem(index, "productId", event.target.value);

                      if (product) {
                        updateItem(index, "unitCost", String(product.price));
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
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={item.orderedQuantity}
                    onChange={(event) =>
                      updateItem(index, "orderedQuantity", event.target.value)
                    }
                    placeholder="Quantity"
                    className={inputClass}
                  />

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={item.unitCost}
                    onChange={(event) =>
                      updateItem(index, "unitCost", event.target.value)
                    }
                    placeholder="Unit cost"
                    className={inputClass}
                  />

                  <button
                    type="button"
                    disabled={items.length === 1}
                    onClick={() => removeItem(index)}
                    className="rounded-lg px-3 text-sm font-semibold text-red-600 disabled:opacity-30"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            {products.length === 0 && (
              <p className="mt-2 text-xs text-red-600">
                No products loaded. Check your products API response.
              </p>
            )}
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">
                Tax (₹)
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
              <label className="mb-2 block text-sm font-medium">
                Shipping Cost (₹)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={shippingCost}
                onChange={(event) => setShippingCost(event.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Expected Delivery
              </label>
              <input
                type="date"
                value={expectedDate}
                onChange={(event) => setExpectedDate(event.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
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
          </section>

          <section className="rounded-xl bg-[#F8F3ED] p-4">
            <h2 className="mb-3 font-semibold">Order Summary</h2>

            <div className="flex justify-between text-sm">
              <span className="text-[#80695B]">Subtotal</span>
              <span>{currency(subtotal)}</span>
            </div>

            <div className="mt-2 flex justify-between text-sm">
              <span className="text-[#80695B]">Tax</span>
              <span>{currency(Number(tax) || 0)}</span>
            </div>

            <div className="mt-2 flex justify-between text-sm">
              <span className="text-[#80695B]">Shipping</span>
              <span>{currency(Number(shippingCost) || 0)}</span>
            </div>

            <div className="mt-3 flex justify-between border-t border-[#EADED4] pt-3 font-bold">
              <span>Total</span>
              <span className="text-[#754426]">{currency(total)}</span>
            </div>
          </section>

          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={() => router.push("/admin/purchase-orders")}
              className="rounded-lg border border-[#EADED4] px-5 py-2.5 text-sm font-semibold hover:bg-[#F8F3ED]"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving || suppliers.length === 0 || products.length === 0}
              className="rounded-lg bg-[#754426] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#2B1B14] disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
