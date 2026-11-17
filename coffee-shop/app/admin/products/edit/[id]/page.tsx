
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  AlertCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";

import ProductForm, {
  type ProductFormData,
} from "@/components/ProductForm";

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const productId = params.id;

  const [prod, setProd] = useState<ProductFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");

  const fetchProduct = useCallback(async () => {
    if (!productId) {
      setError("Invalid product ID.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await fetch(`/api/products/${productId}`, {
        method: "GET",
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok || data.success === false) {
        throw new Error(data.message || "Unable to load product.");
      }

      const product = data.product ?? data.data;

      if (!product) {
        throw new Error("Product not found.");
      }

      setProd({
        name: product.name ?? "",
        description: product.description ?? "",
        price: product.price,
        categoryId:
          product.categoryId ?? product.category?.id ?? "",
        image: product.image ?? "",
        stock: product.stock ?? 0,
        isAvailable: product.isAvailable ?? true,
      });
    } catch (err) {
      console.error("Fetch product error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading the product."
      );

      setProd(null);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  const update = async (form: ProductFormData) => {
    if (updating) return;

    try {
      setUpdating(true);
      setError("");

      const res = await fetch(`/api/products/${productId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim(),
          price: form.price,
          categoryId: form.categoryId,
          image: form.image.trim(),
          stock: form.stock,
          isAvailable: form.isAvailable,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.success === false) {
        throw new Error(data.message || "Failed to update product.");
      }

      router.push("/admin/products");
      router.refresh();
    } catch (err) {
      console.error("Update product error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while updating the product."
      );
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={34} className="animate-spin text-amber-600" />
          <p className="text-sm font-medium text-slate-600">
            Loading product details...
          </p>
        </div>
      </main>
    );
  }

  if (!prod) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
            <AlertCircle size={25} className="text-red-600" />
          </div>

          <h1 className="mt-4 text-xl font-bold text-slate-900">
            Unable to Load Product
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            {error || "The requested product could not be found."}
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={fetchProduct}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-700"
            >
              <RefreshCw size={16} />
              Try Again
            </button>

            <Link
              href="/admin/products"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft size={16} />
              Back to Products
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-7 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/admin/products"
          className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-amber-700"
        >
          <ArrowLeft size={17} />
          Back to Products
        </Link>

        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
            Product Management
          </p>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Edit Product
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Update product information, pricing, category and stock.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          {updating && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
              <Loader2 size={16} className="animate-spin" />
              Updating product...
            </div>
          )}

          <ProductForm
            onSubmit={update}
            initialval={prod}
            btntext={updating ? "Updating..." : "Update Product"}
          />
        </div>
      </div>
    </main>
  );
}
