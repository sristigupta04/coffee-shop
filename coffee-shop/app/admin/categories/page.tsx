
"use client";

import { useCallback, useEffect, useState } from "react";

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  isActive: boolean;
  _count?: {
    products: number;
  };
};

const initialForm = {
  name: "",
  description: "",
  image: "",
};

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  const [form, setForm] = useState(initialForm);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/categories", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to fetch categories.");
      }

      setCategories(result.categories ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load categories."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  function handleChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function startEdit(category: Category) {
    setEditingId(category.id);
    setForm({
      name: category.name,
      description: category.description ?? "",
      image: category.image ?? "",
    });

    setError("");
    setSuccess("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(initialForm);
    setError("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!form.name.trim()) {
      setError("Category name is required.");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(
        editingId
          ? `/api/categories/${editingId}`
          : "/api/categories",
        {
          method: editingId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: form.name.trim(),
            description: form.description.trim(),
            image: form.image.trim(),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to save category.");
      }

      setSuccess(
        editingId
          ? "Category updated successfully."
          : "Category created successfully."
      );

      setEditingId(null);
      setForm(initialForm);

      await fetchCategories();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleCategory(category: Category) {
    const action = category.isActive ? "deactivate" : "activate";

    if (
      !window.confirm(
        `Are you sure you want to ${action} "${category.name}"?`
      )
    ) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/categories/${category.id}`, {
        method: category.isActive ? "DELETE" : "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        ...(category.isActive
          ? {}
          : {
              body: JSON.stringify({ isActive: true }),
            }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || `Unable to ${action} category.`);
      }

      setSuccess(`Category ${action}d successfully.`);
      await fetchCategories();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : `Unable to ${action} category.`
      );
    }
  }

  const filteredCategories = categories.filter((category) => {
    if (filter === "ACTIVE") return category.isActive;
    if (filter === "INACTIVE") return !category.isActive;
    return true;
  });

  const activeCount = categories.filter((item) => item.isActive).length;
  const inactiveCount = categories.length - activeCount;

  const inputClass =
    "w-full rounded-lg border border-[#EADED4] bg-white px-4 py-3 text-sm text-[#2B1B14] outline-none transition focus:border-[#754426] focus:ring-2 focus:ring-[#754426]/10";

  const labelClass = "mb-2 block text-sm font-medium text-[#2B1B14]";

  return (
    <main className="min-h-screen bg-[#F8F3ED] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-8">

        {/* Header */}
        <header>
          <p className="text-sm font-semibold tracking-wider text-[#A76535]">
            BREWB​ITES ADMIN
          </p>
          <h1 className="mt-2 text-3xl font-bold text-[#2B1B14]">
            Category Management
          </h1>
          <p className="mt-2 text-sm text-[#80695B]">
            Create, edit and manage your product categories.
          </p>
        </header>

        {/* Messages */}
        {error && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div role="status" className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            {success}
          </div>
        )}

        {/* Statistics */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { label: "Total Categories", value: categories.length },
            { label: "Active Categories", value: activeCount },
            { label: "Inactive Categories", value: inactiveCount },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-[#EADED4] bg-white p-5">
              <p className="text-sm text-[#80695B]">{item.label}</p>
              <p className="mt-2 text-3xl font-bold text-[#2B1B14]">
                {item.value}
              </p>
            </div>
          ))}
        </section>

        {/* Create / Edit Form */}
        <section className="rounded-2xl border border-[#EADED4] bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-[#2B1B14]">
              {editingId ? "Edit Category" : "Create New Category"}
            </h2>
            <p className="mt-1 text-sm text-[#80695B]">
              {editingId
                ? "Update the selected category details."
                : "Add a new category to your BrewBites menu."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="name" className={labelClass}>
                Category Name *
              </label>
              <input
                id="name"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Cold Coffee"
                required
                maxLength={100}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="description" className={labelClass}>
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                placeholder="Describe this category..."
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="image" className={labelClass}>
                Image Path
              </label>
              <input
                id="image"
                name="image"
                value={form.image}
                onChange={handleChange}
                placeholder="/coffee-category.jpg"
                className={inputClass}
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-[#754426] px-6 py-3 text-sm font-semibold text-white hover:bg-[#2B1B14] disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update Category"
                    : "Create Category"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="rounded-lg border border-[#EADED4] px-6 py-3 text-sm font-medium text-[#754426] hover:bg-[#F8F3ED]"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        {/* Category List */}
        <section className="overflow-hidden rounded-2xl border border-[#EADED4] bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#EADED4] p-5">
            <div>
              <h2 className="text-xl font-semibold text-[#2B1B14]">
                All Categories
              </h2>
              <p className="mt-1 text-sm text-[#80695B]">
                Manage your category status and details.
              </p>
            </div>

            <button
              type="button"
              onClick={fetchCategories}
              disabled={loading}
              className="rounded-lg border border-[#EADED4] px-4 py-2 text-sm font-medium text-[#754426] hover:bg-[#F8F3ED] disabled:opacity-50"
            >
              Refresh
            </button>
          </div>

          <div className="flex flex-wrap gap-2 border-b border-[#EADED4] p-4">
            {(["ALL", "ACTIVE", "INACTIVE"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  filter === value
                    ? "bg-[#754426] text-white"
                    : "bg-[#F8F3ED] text-[#754426] hover:bg-[#EADED4]"
                }`}
              >
                {value === "ALL"
                  ? "All"
                  : value === "ACTIVE"
                    ? "Active"
                    : "Inactive"}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="p-10 text-center text-sm text-[#80695B]">
              Loading categories...
            </p>
          ) : filteredCategories.length === 0 ? (
            <p className="p-10 text-center text-sm text-[#80695B]">
              No categories found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[750px] text-left">
                <thead className="bg-[#F8F3ED] text-xs uppercase tracking-wide text-[#80695B]">
                  <tr>
                    <th className="px-5 py-4">Category</th>
                    <th className="px-5 py-4">Slug</th>
                    <th className="px-5 py-4">Products</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#EADED4]">
                  {filteredCategories.map((category) => (
                    <tr key={category.id} className="hover:bg-[#F8F3ED]/60">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-[#2B1B14]">
                          {category.name}
                        </p>
                        <p className="mt-1 max-w-xs truncate text-xs text-[#80695B]">
                          {category.description || "No description"}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-sm text-[#80695B]">
                        {category.slug}
                      </td>

                      <td className="px-5 py-4 text-sm font-medium text-[#2B1B14]">
                        {category._count?.products ?? 0}
                      </td>

                      <td className="px-5 py-4">
                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                          category.isActive
                            ? "bg-green-50 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}>
                          {category.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => startEdit(category)}
                            className="text-sm font-semibold text-[#754426] hover:underline"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleCategory(category)}
                            className={`text-sm font-semibold hover:underline ${
                              category.isActive
                                ? "text-red-600"
                                : "text-green-700"
                            }`}
                          >
                            {category.isActive ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
