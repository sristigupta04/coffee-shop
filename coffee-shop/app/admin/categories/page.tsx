
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  AlertCircle,
  CheckCircle2,
  FolderOpen,
  FolderPlus,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ToggleLeft,
  ToggleRight,
  X,
} from "lucide-react";

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

type CategoryForm = {
  name: string;
  description: string;
  image: string;
};

type FilterType = "ALL" | "ACTIVE" | "INACTIVE";

const initialForm: CategoryForm = {
  name: "",
  description: "",
  image: "",
};

async function readResponse(response: Response) {
  const result = await response.json().catch(() => null);

  if (!response.ok || !result?.success) {
    throw new Error(
      result?.message || "Something went wrong. Please try again."
    );
  }

  return result;
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CategoryForm>(initialForm);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [filter, setFilter] = useState<FilterType>("ALL");
  const [search, setSearch] = useState("");

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/categories", {
        cache: "no-store",
      });

      const result = await readResponse(response);

      setCategories(
        Array.isArray(result.categories) ? result.categories : []
      );
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
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function resetForm() {
    setEditingId(null);
    setForm(initialForm);
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

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function cancelEdit() {
    resetForm();
    setError("");
    setSuccess("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const name = form.name.trim();

    if (!name) {
      setError("Category name is required.");
      return;
    }

    if (name.length > 100) {
      setError("Category name cannot exceed 100 characters.");
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
            name,
            description: form.description.trim(),
            image: form.image.trim(),
          }),
        }
      );

      await readResponse(response);

      setSuccess(
        editingId
          ? "Category updated successfully."
          : "Category created successfully."
      );

      resetForm();
      await fetchCategories();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to save category."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleCategory(category: Category) {
    const activating = !category.isActive;
    const action = activating ? "activate" : "deactivate";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} "${category.name}"?`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");
    setActionId(category.id);

    try {
      const response = await fetch(`/api/categories/${category.id}`, {
        method: activating ? "PUT" : "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        ...(activating
          ? {
              body: JSON.stringify({ isActive: true }),
            }
          : {}),
      });

      await readResponse(response);

      setSuccess(
        activating
          ? "Category activated successfully."
          : "Category deactivated successfully."
      );

      await fetchCategories();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Unable to ${action} category.`
      );
    } finally {
      setActionId(null);
    }
  }

  const filteredCategories = useMemo(() => {
    const query = search.trim().toLowerCase();

    return categories.filter((category) => {
      const matchesFilter =
        filter === "ALL" ||
        (filter === "ACTIVE" && category.isActive) ||
        (filter === "INACTIVE" && !category.isActive);

      const matchesSearch =
        !query ||
        category.name.toLowerCase().includes(query) ||
        category.slug.toLowerCase().includes(query) ||
        (category.description ?? "").toLowerCase().includes(query);

      return matchesFilter && matchesSearch;
    });
  }, [categories, filter, search]);

  const activeCount = categories.filter(
    (category) => category.isActive
  ).length;

  const inactiveCount = categories.length - activeCount;

  const totalProducts = categories.reduce(
    (total, category) => total + (category._count?.products ?? 0),
    0
  );

  const inputClass =
    "w-full rounded-xl border border-[#EADED4] bg-white px-4 py-3 text-sm text-[#2B1B14] outline-none transition placeholder:text-[#A99486] focus:border-[#754426] focus:ring-2 focus:ring-[#754426]/10 disabled:opacity-60";

  const labelClass =
    "mb-2 block text-sm font-semibold text-[#493326]";

  return (
    <main className="min-h-screen bg-[#F8F3ED] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-7">

        {/* Header */}
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-bold tracking-[0.2em] text-[#A76535]">
              BREWB​ITES ADMIN
            </p>

            <h1 className="mt-2 text-2xl font-bold text-[#2B1B14] sm:text-3xl">
              Category Management
            </h1>

            <p className="mt-2 text-sm text-[#80695B]">
              Organize and manage the categories displayed in your menu.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchCategories}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#EADED4] bg-white px-4 py-3 text-sm font-semibold text-[#754426] transition hover:bg-[#F4EAE0] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </header>

        {/* Notifications */}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <AlertCircle size={19} className="mt-0.5 shrink-0" />
            <p>{error}</p>
            <button
              type="button"
              onClick={() => setError("")}
              className="ml-auto"
              aria-label="Dismiss error"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {success && (
          <div
            role="status"
            className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700"
          >
            <CheckCircle2 size={19} />
            <p>{success}</p>
            <button
              type="button"
              onClick={() => setSuccess("")}
              className="ml-auto"
              aria-label="Dismiss success"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {/* Statistics */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Total Categories",
              value: categories.length,
              icon: FolderOpen,
            },
            {
              label: "Active Categories",
              value: activeCount,
              icon: ToggleRight,
            },
            {
              label: "Inactive Categories",
              value: inactiveCount,
              icon: ToggleLeft,
            },
            {
              label: "Products Assigned",
              value: totalProducts,
              icon: ImageIcon,
            },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.label}
                className="rounded-2xl border border-[#EADED4] bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-[#80695B]">
                    {item.label}
                  </p>

                  <div className="rounded-xl bg-[#F8F3ED] p-2.5 text-[#754426]">
                    <Icon size={19} />
                  </div>
                </div>

                <p className="mt-4 text-3xl font-bold text-[#2B1B14]">
                  {item.value}
                </p>
              </div>
            );
          })}
        </section>

        {/* Create / Edit Form */}
        <section className="rounded-2xl border border-[#EADED4] bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-xl bg-[#F8F3ED] p-3 text-[#754426]">
              {editingId ? <Pencil size={21} /> : <FolderPlus size={21} />}
            </div>

            <div>
              <h2 className="text-lg font-bold text-[#2B1B14]">
                {editingId ? "Edit Category" : "Create New Category"}
              </h2>

              <p className="mt-1 text-sm text-[#80695B]">
                {editingId
                  ? "Update the selected category information."
                  : "Add a new category to your BrewBites menu."}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
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
                  disabled={saving}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="image" className={labelClass}>
                  Image Path / URL
                </label>

                <input
                  id="image"
                  name="image"
                  value={form.image}
                  onChange={handleChange}
                  placeholder="/images/cold-coffee.jpg"
                  disabled={saving}
                  className={inputClass}
                />
              </div>
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
                maxLength={500}
                placeholder="Describe this category..."
                disabled={saving}
                className={inputClass}
              />

              <p className="mt-1 text-right text-xs text-[#A99486]">
                {form.description.length}/500
              </p>
            </div>

            <div className="flex flex-wrap gap-3 border-t border-[#F0E8E0] pt-5">
              <button
                type="submit"
                disabled={saving || !form.name.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#754426] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#2B1B14] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <Plus size={17} />
                )}

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
                  disabled={saving}
                  className="rounded-xl border border-[#EADED4] px-6 py-3 text-sm font-semibold text-[#754426] transition hover:bg-[#F8F3ED] disabled:opacity-50"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        {/* Category List */}
        <section className="overflow-hidden rounded-2xl border border-[#EADED4] bg-white shadow-sm">
          <div className="border-b border-[#EADED4] p-5 sm:p-6">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
              <div>
                <h2 className="text-lg font-bold text-[#2B1B14]">
                  All Categories
                </h2>

                <p className="mt-1 text-sm text-[#80695B]">
                  {filteredCategories.length} categories displayed
                </p>
              </div>

              <div className="relative w-full lg:max-w-sm">
                <Search
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A99486]"
                />

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search name, slug or description..."
                  className={`${inputClass} pl-10`}
                />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 border-b border-[#EADED4] p-4">
            {(
              [
                ["ALL", "All Categories", categories.length],
                ["ACTIVE", "Active", activeCount],
                ["INACTIVE", "Inactive", inactiveCount],
              ] as const
            ).map(([value, label, count]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  filter === value
                    ? "bg-[#754426] text-white"
                    : "bg-[#F8F3ED] text-[#754426] hover:bg-[#EADED4]"
                }`}
              >
                {label} ({count})
              </button>
            ))}
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 p-14 text-[#80695B]">
              <Loader2 size={27} className="animate-spin" />
              <p className="text-sm">Loading categories...</p>
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-14 text-center">
              <FolderOpen size={35} className="text-[#A99486]" />

              <h3 className="mt-4 font-semibold text-[#2B1B14]">
                No categories found
              </h3>

              <p className="mt-1 text-sm text-[#80695B]">
                Try changing your search or filter.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
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
                    <tr
                      key={category.id}
                      className="transition hover:bg-[#F8F3ED]/60"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#F8F3ED]">
                            {category.image ? (
                              <img
                                src={category.image}
                                alt={category.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <ImageIcon
                                size={20}
                                className="text-[#A99486]"
                              />
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="font-semibold text-[#2B1B14]">
                              {category.name}
                            </p>

                            <p className="mt-1 max-w-xs truncate text-xs text-[#80695B]">
                              {category.description || "No description"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm text-[#80695B]">
                        {category.slug}
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-lg bg-[#F8F3ED] px-3 py-1.5 text-sm font-semibold text-[#754426]">
                          {category._count?.products ?? 0}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                            category.isActive
                              ? "bg-green-50 text-green-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {category.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => startEdit(category)}
                            disabled={!!actionId || saving}
                            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#754426] hover:underline disabled:opacity-40"
                          >
                            <Pencil size={14} />
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleCategory(category)}
                            disabled={!!actionId || saving}
                            className={`inline-flex items-center gap-1.5 text-sm font-semibold hover:underline disabled:opacity-40 ${
                              category.isActive
                                ? "text-red-600"
                                : "text-green-700"
                            }`}
                          >
                            {actionId === category.id ? (
                              <Loader2
                                size={14}
                                className="animate-spin"
                              />
                            ) : category.isActive ? (
                              <ToggleLeft size={16} />
                            ) : (
                              <ToggleRight size={16} />
                            )}

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
