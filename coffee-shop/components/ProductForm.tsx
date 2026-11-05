
"use client";

import { useEffect, useState } from "react";

export type ProductFormData = {
  name: string;
  description: string;
  price: number;
  image: string;
  categoryId: string;
  stock: number;
  isAvailable: boolean;
};

type Category = {
  id: string;
  name: string;
  slug: string;
};

type ProductFormProps = {
  onSubmit: (product: ProductFormData) => void | Promise<void>;
  initialval?: ProductFormData | null;
  btntext?: string;
};

const emptyForm: ProductFormData = {
  name: "",
  description: "",
  price: 0,
  image: "",
  categoryId: "",
  stock: 0,
  isAvailable: true,
};

export default function ProductForm({
  onSubmit,
  initialval,
  btntext = "Save Product",
}: ProductFormProps) {
  const [form, setForm] = useState<ProductFormData>(
    initialval ?? emptyForm
  );

  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Fetch categories
  useEffect(() => {
    async function fetchCategories() {
      try {
        const response = await fetch("/api/categories");
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Failed to load categories.");
        }

        setCategories(result.categories ?? []);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load categories."
        );
      } finally {
        setLoadingCategories(false);
      }
    }

    fetchCategories();
  }, []);

  // Update form when editing an existing product
  useEffect(() => {
    setForm(initialval ?? emptyForm);
  }, [initialval]);

  function handleChange(
    event: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]:
        name === "price" || name === "stock"
          ? Number(value)
          : value,
    }));
  }

  function handleAvailability(checked: boolean) {
    setForm((previous) => ({
      ...previous,
      isAvailable: checked,
    }));
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");

    if (!form.categoryId) {
      setError("Please select a category.");
      return;
    }

    if (form.price <= 0 || !Number.isFinite(form.price)) {
      setError("Please enter a valid price.");
      return;
    }

    if (!Number.isInteger(form.stock) || form.stock < 0) {
      setError("Stock must be a non-negative integer.");
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit(form);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-[#EADED4] bg-white px-4 py-3 text-sm text-[#2B1B14] outline-none transition focus:border-[#754426] focus:ring-2 focus:ring-[#754426]/10";

  const labelClass =
    "mb-2 block text-sm font-medium text-[#2B1B14]";

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-2xl border border-[#EADED4] bg-white p-6 shadow-sm"
    >
      <div>
        <h2 className="text-xl font-semibold text-[#2B1B14]">
          Product Information
        </h2>
        <p className="mt-1 text-sm text-[#80695B]">
          Add or update your BrewBites product details.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {/* Product Name */}
      <div>
        <label htmlFor="name" className={labelClass}>
          Product Name *
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          maxLength={150}
          value={form.name}
          onChange={handleChange}
          placeholder="Enter product name"
          className={inputClass}
        />
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className={labelClass}>
          Description *
        </label>
        <textarea
          id="description"
          name="description"
          required
          rows={4}
          value={form.description}
          onChange={handleChange}
          placeholder="Describe your product..."
          className={inputClass}
        />
      </div>

      {/* Category */}
      <div>
        <label htmlFor="categoryId" className={labelClass}>
          Category *
        </label>

        <select
          id="categoryId"
          name="categoryId"
          required
          value={form.categoryId}
          onChange={handleChange}
          disabled={loadingCategories}
          className={inputClass}
        >
          <option value="">
            {loadingCategories
              ? "Loading categories..."
              : "Select a category"}
          </option>

          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>

        {!loadingCategories && categories.length === 0 && (
          <p className="mt-2 text-xs text-red-600">
            No active categories found. Please create a category first.
          </p>
        )}
      </div>

      {/* Price and Stock */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="price" className={labelClass}>
            Price (₹) *
          </label>
          <input
            id="price"
            name="price"
            type="number"
            min="0.01"
            step="0.01"
            required
            value={form.price}
            onChange={handleChange}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="stock" className={labelClass}>
            Stock Quantity *
          </label>
          <input
            id="stock"
            name="stock"
            type="number"
            min="0"
            step="1"
            required
            value={form.stock}
            onChange={handleChange}
            className={inputClass}
          />
        </div>
      </div>

      {/* Image */}
      <div>
        <label htmlFor="image" className={labelClass}>
          Product Image Path *
        </label>
        <input
          id="image"
          name="image"
          type="text"
          required
          value={form.image}
          onChange={handleChange}
          placeholder="/coffee1.jpg"
          className={inputClass}
        />
      </div>

      {/* Availability */}
      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={form.isAvailable}
          onChange={(event) =>
            handleAvailability(event.target.checked)
          }
          className="h-4 w-4 accent-[#754426]"
        />
        <span className="text-sm font-medium text-[#2B1B14]">
          Product is available for sale
        </span>
      </label>

      {/* Submit */}
      <button
        type="submit"
        disabled={
          submitting ||
          loadingCategories ||
          categories.length === 0
        }
        className="w-full rounded-lg bg-[#754426] px-5 py-3 font-semibold text-white transition hover:bg-[#2B1B14] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {submitting ? "Saving..." : btntext}
      </button>
    </form>
  );
}
