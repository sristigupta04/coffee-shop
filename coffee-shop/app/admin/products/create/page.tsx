
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ProductForm {
  name: string;
  price: string;
  description: string;
  category: string;
  image: string;
  stock: string;
}

const initialForm: ProductForm = {
  name: "",
  price: "",
  description: "",
  category: "",
  image: "",
  stock: "0",
};

export default function CreateProductPage() {
  const router = useRouter();

  const [form, setForm] = useState<ProductForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim() || !form.description.trim() ||
        !form.category.trim() || !form.image.trim()) {
      setError("Please fill in all required fields.");
      return;
    }

    const price = Number(form.price);
    const stock = Number(form.stock);

    if (!Number.isFinite(price) || price <= 0) {
      setError("Enter a valid price greater than zero.");
      return;
    }

    if (!Number.isInteger(stock) || stock < 0) {
      setError("Stock must be a non-negative whole number.");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name.trim(),
          price,
          description: form.description.trim(),
          category: form.category.trim(),
          image: form.image.trim(),
          stock,
          isAvailable: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to create product.");
      }

      alert("Product added successfully!");
      setForm(initialForm);
      router.push("/admin/products");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-[#EADED4] bg-white px-4 py-3 text-sm text-[#2B1B14] outline-none transition focus:border-[#754426] focus:ring-2 focus:ring-[#754426]/10";

  return (
    <div className="min-h-screen bg-[#F8F3ED] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <button
            type="button"
            onClick={() => router.back()}
            className="mb-4 text-sm font-medium text-[#754426] hover:underline"
          >
            ← Back to Products
          </button>

          <h1 className="text-3xl font-bold text-[#2B1B14]">
            Add New Product
          </h1>
          <p className="mt-2 text-sm text-[#80695B]">
            Add a new item to your BrewBites menu.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-2xl border border-[#EADED4] bg-white p-5 shadow-sm sm:p-8"
        >
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-semibold text-[#2B1B14]">
              Product Name *
            </label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Cappuccino"
              className={inputClass}
              required
              maxLength={150}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#2B1B14]">
                Price (₹) *
              </label>
              <input
                type="number"
                name="price"
                value={form.price}
                onChange={handleChange}
                placeholder="250"
                min="0.01"
                step="0.01"
                className={inputClass}
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#2B1B14]">
                Available Stock *
              </label>
              <input
                type="number"
                name="stock"
                value={form.stock}
                onChange={handleChange}
                placeholder="50"
                min="0"
                step="1"
                className={inputClass}
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-[#2B1B14]">
              Category *
            </label>
            <input
              name="category"
              value={form.category}
              onChange={handleChange}
              placeholder="e.g. Coffee, Tea, Desserts"
              className={inputClass}
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-[#2B1B14]">
              Description *
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Describe your product..."
              rows={4}
              className={`${inputClass} resize-y`}
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-[#2B1B14]">
              Product Image URL *
            </label>
            <input
              type="url"
              name="image"
              value={form.image}
              onChange={handleChange}
              placeholder="https://example.com/product.jpg"
              className={inputClass}
              required
            />

            {form.image && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-medium text-[#80695B]">
                  Image Preview
                </p>
                <img
                  src={form.image}
                  alt="Product preview"
                  className="h-40 w-40 rounded-xl border border-[#EADED4] object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                  onLoad={(e) => {
                    e.currentTarget.style.display = "block";
                  }}
                />
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-[#EADED4] pt-6 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => router.push("/admin/products")}
              className="rounded-xl border border-[#EADED4] px-6 py-3 text-sm font-semibold text-[#754426] hover:bg-[#F8F3ED]"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-[#754426] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#2B1B14] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Saving Product..." : "Add Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
