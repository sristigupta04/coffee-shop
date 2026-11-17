
"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ImagePlus,
  Package,
  IndianRupee,
  Tag,
  FileText,
  Boxes,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";

interface ProductForm {
  name: string;
  price: string;
  description: string;
  category: string;
  image: string;
  stock: string;
  isAvailable: boolean;
}

const initialForm: ProductForm = {
  name: "",
  price: "",
  description: "",
  category: "",
  image: "",
  stock: "0",
  isAvailable: true,
};

export default function CreateProductPage() {
  const router = useRouter();

  const [form, setForm] = useState<ProductForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [imageError, setImageError] = useState(false);
  const [success, setSuccess] = useState("");

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (error) setError("");
  };

  const handleAvailabilityChange = () => {
    setForm((previous) => ({
      ...previous,
      isAvailable: !previous.isAvailable,
    }));
  };

  const validateForm = () => {
    if (
      !form.name.trim() ||
      !form.description.trim() ||
      !form.category.trim() ||
      !form.image.trim()
    ) {
      return "Please fill in all required fields.";
    }

    if (form.name.trim().length > 150) {
      return "Product name cannot exceed 150 characters.";
    }

    const price = Number(form.price);
    const stock = Number(form.stock);

    if (!form.price.trim() || !Number.isFinite(price) || price <= 0) {
      return "Enter a valid price greater than zero.";
    }

    if (
      !form.stock.trim() ||
      !Number.isInteger(stock) ||
      stock < 0
    ) {
      return "Stock must be a non-negative whole number.";
    }

    try {
      const imageUrl = new URL(form.image.trim());

      if (!["http:", "https:"].includes(imageUrl.protocol)) {
        return "Please enter a valid HTTP or HTTPS image URL.";
      }
    } catch {
      return "Please enter a valid product image URL.";
    }

    return "";
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (loading) return;

    setError("");
    setSuccess("");

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name.trim(),
          price: Number(form.price),
          description: form.description.trim(),
          category: form.category.trim(),
          image: form.image.trim(),
          stock: Number(form.stock),
          isAvailable: form.isAvailable,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Failed to create product.");
      }

      setSuccess("Product added successfully!");

      setTimeout(() => {
        router.push("/admin/products");
        router.refresh();
      }, 700);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-100";

  const labelClass =
    "mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700";

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-7">
          <Link
            href="/admin/products"
            className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-amber-700"
          >
            <ArrowLeft size={17} />
            Back to Products
          </Link>

          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-700">
                <Package size={15} />
                Product Management
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Add New Product
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Add a new item to your BrewBites menu.
              </p>
            </div>

            <span className="w-fit rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">
              New Product
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Alerts */}
          {error && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              <AlertCircle size={19} className="mt-0.5 shrink-0" />
              <p className="flex-1">{error}</p>
              <button
                type="button"
                onClick={() => setError("")}
                aria-label="Dismiss error"
              >
                <X size={17} />
              </button>
            </div>
          )}

          {success && (
            <div
              role="status"
              className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-800"
            >
              <CheckCircle2 size={19} />
              {success}
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Main Form */}
            <div className="space-y-6 lg:col-span-2">
              {/* Basic Information */}
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-5">
                  <h2 className="text-base font-bold text-slate-900">
                    Basic Information
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Enter the basic details of your product.
                  </p>
                </div>

                <div className="space-y-5">
                  <div>
                    <label htmlFor="name" className={labelClass}>
                      <Package size={16} />
                      Product Name *
                    </label>
                    <input
                      id="name"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="e.g. Classic Cappuccino"
                      className={inputClass}
                      required
                      maxLength={150}
                      disabled={loading}
                    />
                    <p className="mt-1 text-right text-xs text-slate-400">
                      {form.name.length}/150
                    </p>
                  </div>

                  <div>
                    <label htmlFor="description" className={labelClass}>
                      <FileText size={16} />
                      Product Description *
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      value={form.description}
                      onChange={handleChange}
                      placeholder="Describe the ingredients, taste and features of your product..."
                      rows={5}
                      className={`${inputClass} resize-y`}
                      required
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label htmlFor="category" className={labelClass}>
                      <Tag size={16} />
                      Category *
                    </label>
                    <input
                      id="category"
                      name="category"
                      value={form.category}
                      onChange={handleChange}
                      placeholder="e.g. Coffee, Tea, Desserts"
                      className={inputClass}
                      required
                      disabled={loading}
                    />
                    <p className="mt-1 text-xs text-slate-400">
                      Enter the category name used by your existing product API.
                    </p>
                  </div>
                </div>
              </section>

              {/* Pricing and Stock */}
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-5">
                  <h2 className="text-base font-bold text-slate-900">
                    Pricing & Inventory
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Set the selling price and available stock.
                  </p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="price" className={labelClass}>
                      <IndianRupee size={16} />
                      Price (INR) *
                    </label>
                    <input
                      id="price"
                      type="number"
                      name="price"
                      value={form.price}
                      onChange={handleChange}
                      placeholder="250"
                      min="0.01"
                      step="0.01"
                      className={inputClass}
                      required
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label htmlFor="stock" className={labelClass}>
                      <Boxes size={16} />
                      Available Stock *
                    </label>
                    <input
                      id="stock"
                      type="number"
                      name="stock"
                      value={form.stock}
                      onChange={handleChange}
                      placeholder="50"
                      min="0"
                      step="1"
                      className={inputClass}
                      required
                      disabled={loading}
                    />
                  </div>
                </div>
              </section>

              {/* Image */}
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-5">
                  <h2 className="text-base font-bold text-slate-900">
                    Product Image
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Add a publicly accessible image URL.
                  </p>
                </div>

                <label htmlFor="image" className={labelClass}>
                  <ImagePlus size={16} />
                  Image URL *
                </label>

                <input
                  id="image"
                  type="url"
                  name="image"
                  value={form.image}
                  onChange={(e) => {
                    handleChange(e);
                    setImageError(false);
                  }}
                  placeholder="https://example.com/product-image.jpg"
                  className={inputClass}
                  required
                  disabled={loading}
                />

                {form.image && (
                  <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="mb-3 text-xs font-semibold text-slate-600">
                      Image Preview
                    </p>

                    {!imageError ? (
                      <img
                        src={form.image}
                        alt="Product preview"
                        className="h-52 w-full rounded-lg object-contain"
                        onError={() => setImageError(true)}
                      />
                    ) : (
                      <div className="flex h-40 flex-col items-center justify-center gap-2 text-sm text-red-500">
                        <AlertCircle size={25} />
                        Image could not be loaded. Check the URL.
                      </div>
                    )}
                  </div>
                )}
              </section>
            </div>

            {/* Sidebar */}
            <aside className="space-y-6">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-base font-bold text-slate-900">
                  Product Availability
                </h2>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Choose whether customers can order this product immediately.
                </p>

                <button
                  type="button"
                  onClick={handleAvailabilityChange}
                  disabled={loading}
                  className={`mt-5 flex w-full items-center justify-between rounded-xl border p-4 transition ${
                    form.isAvailable
                      ? "border-green-200 bg-green-50"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3 text-left">
                    {form.isAvailable ? (
                      <Eye size={20} className="text-green-700" />
                    ) : (
                      <EyeOff size={20} className="text-slate-500" />
                    )}

                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {form.isAvailable ? "Available" : "Unavailable"}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {form.isAvailable
                          ? "Visible to customers"
                          : "Hidden from customers"}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`relative h-6 w-11 rounded-full transition ${
                      form.isAvailable ? "bg-green-600" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${
                        form.isAvailable ? "left-6" : "left-1"
                      }`}
                    />
                  </span>
                </button>
              </section>

              {/* Preview Summary */}
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-base font-bold text-slate-900">
                  Product Summary
                </h2>

                <div className="mt-4 space-y-4">
                  <div>
                    <p className="text-xs text-slate-500">Product Name</p>
                    <p className="mt-1 break-words text-sm font-semibold text-slate-800">
                      {form.name.trim() || "Not entered"}
                    </p>
                  </div>

                  <div className="flex justify-between gap-3">
                    <span className="text-xs text-slate-500">Price</span>
                    <span className="text-sm font-bold text-amber-700">
                      {form.price && Number.isFinite(Number(form.price))
                        ? `₹${Number(form.price).toLocaleString("en-IN")}`
                        : "—"}
                    </span>
                  </div>

                  <div className="flex justify-between gap-3">
                    <span className="text-xs text-slate-500">Stock</span>
                    <span className="text-sm font-semibold text-slate-800">
                      {form.stock || "0"} units
                    </span>
                  </div>

                  <div className="flex justify-between gap-3">
                    <span className="text-xs text-slate-500">Category</span>
                    <span className="max-w-32 truncate text-sm font-semibold text-slate-800">
                      {form.category || "—"}
                    </span>
                  </div>

                  <div className="border-t border-slate-100 pt-3">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        form.isAvailable
                          ? "bg-green-100 text-green-800"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {form.isAvailable ? "Available for sale" : "Hidden"}
                    </span>
                  </div>
                </div>
              </section>

              <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                <p className="text-xs font-semibold text-amber-900">
                  Before publishing
                </p>
                <p className="mt-1 text-xs leading-5 text-amber-800">
                  Check the product name, category, price, stock and image URL before saving.
                </p>
              </div>
            </aside>
          </div>

          {/* Footer Actions */}
          <div className="flex flex-col-reverse gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:justify-end sm:p-5">
            <Link
              href="/admin/products"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={loading || !!success}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-7 py-3 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  Saving Product...
                </>
              ) : (
                <>
                  <CheckCircle2 size={17} />
                  Create Product
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
