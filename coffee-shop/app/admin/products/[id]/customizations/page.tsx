
"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type Option = {
  id: string;
  name: string;
  priceAdjustment: number | string;
  isAvailable: boolean;
  sortOrder: number;
};

type Group = {
  id: string;
  name: string;
  description: string | null;
  selectionType: "SINGLE" | "MULTIPLE";
  isRequired: boolean;
  minSelections: number;
  maxSelections: number;
  isActive: boolean;
  sortOrder: number;
  options: Option[];
};

type Product = {
  id: string;
  name: string;
};

const initialGroupForm = {
  name: "",
  description: "",
  selectionType: "SINGLE" as "SINGLE" | "MULTIPLE",
  isRequired: false,
  minSelections: 0,
  maxSelections: 1,
  isActive: true,
  sortOrder: 0,
};

const initialOptionForm = {
  name: "",
  priceAdjustment: "0",
};

async function readResponse(response: Response) {
  const result = await response.json().catch(() => null);

  if (!response.ok || !result?.success) {
    throw new Error(
      result?.message || `Request failed (${response.status})`
    );
  }

  return result;
}

export default function ProductCustomizationsPage() {
  const params = useParams<{ id: string }>();
  const productId = params.id;

  const [product, setProduct] = useState<Product | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showGroupForm, setShowGroupForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [groupForm, setGroupForm] = useState(initialGroupForm);

  const [optionGroupId, setOptionGroupId] = useState<string | null>(null);
  const [optionForm, setOptionForm] = useState(initialOptionForm);

  const [editingOption, setEditingOption] = useState<string | null>(null);
  const [editOptionForm, setEditOptionForm] = useState(initialOptionForm);

  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  const fetchData = useCallback(async () => {
    if (!productId) return;

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/admin/products/${productId}/customizations`,
        { cache: "no-store" }
      );

      const result = await readResponse(response);

      setProduct(result.data.product);
      setGroups(result.data.groups ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch customizations"
      );
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const showMessage = (message: string) => {
    setSuccess(message);
    setError("");
  };

  const showError = (message: string) => {
    setError(message);
    setSuccess("");
  };

  const resetGroupForm = () => {
    setGroupForm(initialGroupForm);
    setEditingGroup(null);
    setShowGroupForm(false);
  };

  const openCreateGroup = () => {
    setEditingGroup(null);
    setGroupForm(initialGroupForm);
    setShowGroupForm(true);
    setError("");
  };

  const openEditGroup = (group: Group) => {
    setEditingGroup(group.id);
    setGroupForm({
      name: group.name,
      description: group.description || "",
      selectionType: group.selectionType,
      isRequired: group.isRequired,
      minSelections: group.minSelections,
      maxSelections: group.maxSelections,
      isActive: group.isActive,
      sortOrder: group.sortOrder,
    });
    setShowGroupForm(true);
    setError("");
  };

  const saveGroup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!groupForm.name.trim()) {
      showError("Group name is required");
      return;
    }

    if (
      groupForm.minSelections < 0 ||
      groupForm.maxSelections < 1 ||
      groupForm.minSelections > groupForm.maxSelections
    ) {
      showError("Please enter valid minimum and maximum selections");
      return;
    }

    if (
      groupForm.selectionType === "SINGLE" &&
      groupForm.maxSelections !== 1
    ) {
      showError("Single selection groups must have maximum selections set to 1");
      return;
    }

    if (groupForm.isRequired && groupForm.minSelections < 1) {
      showError("Required groups must have at least one minimum selection");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const isEditing = Boolean(editingGroup);

      const url = isEditing
        ? `/api/admin/customization-groups/${editingGroup}`
        : `/api/admin/products/${productId}/customizations`;

      const response = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...groupForm,
          name: groupForm.name.trim(),
          description: groupForm.description.trim() || null,
        }),
      });

      await readResponse(response);

      resetGroupForm();
      await fetchData();

      showMessage(
        isEditing
          ? "Customization group updated successfully"
          : "Customization group created successfully"
      );
    } catch (err) {
      showError(
        err instanceof Error ? err.message : "Failed to save group"
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteGroup = async (groupId: string) => {
    if (!window.confirm("Delete this group and all its options?")) return;

    try {
      setSaving(true);
      setError("");

      const response = await fetch(
        `/api/admin/customization-groups/${groupId}`,
        { method: "DELETE" }
      );

      await readResponse(response);

      if (optionGroupId === groupId) {
        setOptionGroupId(null);
      }

      setExpandedGroups((current) =>
        current.filter((id) => id !== groupId)
      );

      await fetchData();
      showMessage("Customization group deleted successfully");
    } catch (err) {
      showError(
        err instanceof Error ? err.message : "Failed to delete group"
      );
    } finally {
      setSaving(false);
    }
  };

  const addOption = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!optionGroupId) return;

    const price = Number(optionForm.priceAdjustment);

    if (!optionForm.name.trim()) {
      showError("Option name is required");
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      showError("Enter a valid non-negative additional price");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const selectedGroup = groups.find(
        (group) => group.id === optionGroupId
      );

      // Correct endpoint according to the existing API route.
      const response = await fetch(
        `/api/admin/products/${productId}/${optionGroupId}/options`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: optionForm.name.trim(),
            priceAdjustment: price,
            isAvailable: true,
            sortOrder: selectedGroup?.options.length ?? 0,
          }),
        }
      );

      await readResponse(response);

      setOptionForm(initialOptionForm);
      setOptionGroupId(null);

      await fetchData();
      showMessage("Customization option added successfully");
    } catch (err) {
      showError(
        err instanceof Error ? err.message : "Failed to add option"
      );
    } finally {
      setSaving(false);
    }
  };

  const startEditOption = (option: Option) => {
    setEditingOption(option.id);
    setEditOptionForm({
      name: option.name,
      priceAdjustment: String(option.priceAdjustment),
    });
    setError("");
  };

  const saveOption = async (
    event: FormEvent<HTMLFormElement>,
    optionId: string
  ) => {
    event.preventDefault();

    const price = Number(editOptionForm.priceAdjustment);

    if (!editOptionForm.name.trim()) {
      showError("Option name is required");
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      showError("Enter a valid non-negative additional price");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const response = await fetch(
        `/api/admin/customization-options/${optionId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: editOptionForm.name.trim(),
            priceAdjustment: price,
          }),
        }
      );

      await readResponse(response);

      setEditingOption(null);
      await fetchData();
      showMessage("Option updated successfully");
    } catch (err) {
      showError(
        err instanceof Error ? err.message : "Failed to update option"
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleOption = async (option: Option) => {
    try {
      setSaving(true);
      setError("");

      const response = await fetch(
        `/api/admin/customization-options/${option.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            isAvailable: !option.isAvailable,
          }),
        }
      );

      await readResponse(response);

      await fetchData();
      showMessage("Option availability updated");
    } catch (err) {
      showError(
        err instanceof Error ? err.message : "Failed to update availability"
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteOption = async (optionId: string) => {
    if (!window.confirm("Delete this customization option?")) return;

    try {
      setSaving(true);
      setError("");

      const response = await fetch(
        `/api/admin/customization-options/${optionId}`,
        { method: "DELETE" }
      );

      await readResponse(response);

      if (editingOption === optionId) {
        setEditingOption(null);
      }

      await fetchData();
      showMessage("Option deleted successfully");
    } catch (err) {
      showError(
        err instanceof Error ? err.message : "Failed to delete option"
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleExpanded = (groupId: string) => {
    setExpandedGroups((current) =>
      current.includes(groupId)
        ? current.filter((id) => id !== groupId)
        : [...current, groupId]
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-[#80695B]">
        Loading customizations...
      </div>
    );
  }

  if (!product && error) {
    return (
      <div className="m-6 rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">
        <p>{error}</p>
        <button
          onClick={fetchData}
          className="mt-3 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="min-h-screen space-y-6 bg-[#FCFAF8] p-4 md:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/admin/products"
            className="text-sm text-[#80695B] hover:text-[#754426]"
          >
            ← Back to Products
          </Link>

          <h1 className="mt-3 text-2xl font-bold text-[#2B1B14] md:text-3xl">
            Product Customizations
          </h1>

          <p className="mt-1 text-sm text-[#80695B]">
            Manage options and additional pricing for {product.name}.
          </p>
        </div>

        <button
          onClick={openCreateGroup}
          className="rounded-xl bg-[#754426] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#5F351E]"
        >
          + Create Customization Group
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <span>{error}</span>
          <button
            onClick={() => setError("")}
            aria-label="Dismiss error"
            className="shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {success && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700"
        >
          <span>{success}</span>
          <button
            onClick={() => setSuccess("")}
            aria-label="Dismiss success message"
            className="shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-[#EADED4] bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#80695B]">
          Selected Product
        </p>
        <h2 className="mt-2 text-xl font-bold text-[#2B1B14]">
          {product.name}
        </h2>
        <p className="mt-1 text-sm text-[#80695B]">
          {groups.length} customization groups configured
        </p>
      </div>

      {showGroupForm && (
        <div className="rounded-2xl border border-[#EADED4] bg-white p-5 md:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-[#2B1B14]">
              {editingGroup
                ? "Edit Customization Group"
                : "Create Customization Group"}
            </h2>

            <button
              type="button"
              onClick={resetGroupForm}
              className="text-sm text-[#80695B]"
            >
              Close ✕
            </button>
          </div>

          <form onSubmit={saveGroup} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-[#2B1B14]">
                  Group Name *
                </label>
                <input
                  required
                  maxLength={100}
                  value={groupForm.name}
                  onChange={(e) =>
                    setGroupForm({
                      ...groupForm,
                      name: e.target.value,
                    })
                  }
                  placeholder="e.g. Choose Your Size"
                  className="w-full rounded-xl border border-[#EADED4] px-4 py-3 outline-none focus:border-[#754426]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#2B1B14]">
                  Selection Type
                </label>
                <select
                  value={groupForm.selectionType}
                  onChange={(e) => {
                    const type = e.target.value as "SINGLE" | "MULTIPLE";
                    const maxSelections =
                      type === "SINGLE"
                        ? 1
                        : Math.max(2, groupForm.maxSelections);

                    setGroupForm({
                      ...groupForm,
                      selectionType: type,
                      maxSelections,
                      minSelections: groupForm.isRequired
                        ? 1
                        : Math.min(groupForm.minSelections, maxSelections),
                    });
                  }}
                  className="w-full rounded-xl border border-[#EADED4] bg-white px-4 py-3"
                >
                  <option value="SINGLE">Single Selection</option>
                  <option value="MULTIPLE">Multiple Selection</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#2B1B14]">
                Description
              </label>
              <textarea
                rows={2}
                maxLength={500}
                value={groupForm.description}
                onChange={(e) =>
                  setGroupForm({
                    ...groupForm,
                    description: e.target.value,
                  })
                }
                placeholder="Describe this customization group..."
                className="w-full rounded-xl border border-[#EADED4] px-4 py-3 outline-none focus:border-[#754426]"
              />
            </div>

            <label className="flex items-center gap-3 text-sm text-[#2B1B14]">
              <input
                type="checkbox"
                checked={groupForm.isRequired}
                onChange={(e) =>
                  setGroupForm({
                    ...groupForm,
                    isRequired: e.target.checked,
                    minSelections: e.target.checked
                      ? Math.max(1, groupForm.minSelections)
                      : 0,
                  })
                }
                className="h-4 w-4 accent-[#754426]"
              />
              Customer must select from this group
            </label>

            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-[#2B1B14]">
                  Minimum Selections
                </label>
                <input
                  type="number"
                  min={groupForm.isRequired ? 1 : 0}
                  max={groupForm.maxSelections}
                  value={groupForm.minSelections}
                  onChange={(e) =>
                    setGroupForm({
                      ...groupForm,
                      minSelections: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-xl border border-[#EADED4] px-4 py-3"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#2B1B14]">
                  Maximum Selections
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  disabled={groupForm.selectionType === "SINGLE"}
                  value={groupForm.maxSelections}
                  onChange={(e) =>
                    setGroupForm({
                      ...groupForm,
                      maxSelections: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-xl border border-[#EADED4] px-4 py-3 disabled:bg-[#F8F3ED]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#2B1B14]">
                  Display Order
                </label>
                <input
                  type="number"
                  min={0}
                  value={groupForm.sortOrder}
                  onChange={(e) =>
                    setGroupForm({
                      ...groupForm,
                      sortOrder: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-xl border border-[#EADED4] px-4 py-3"
                />
              </div>
            </div>

            <label className="flex items-center gap-3 text-sm text-[#2B1B14]">
              <input
                type="checkbox"
                checked={groupForm.isActive}
                onChange={(e) =>
                  setGroupForm({
                    ...groupForm,
                    isActive: e.target.checked,
                  })
                }
                className="h-4 w-4 accent-[#754426]"
              />
              Group is active
            </label>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-[#754426] px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editingGroup
                    ? "Update Group"
                    : "Create Group"}
              </button>

              <button
                type="button"
                onClick={resetGroupForm}
                className="rounded-xl border border-[#EADED4] px-6 py-3 text-sm font-medium text-[#80695B]"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-[#2B1B14]">
            Customization Groups
          </h2>
          <span className="text-sm text-[#80695B]">
            {groups.length} groups
          </span>
        </div>

        {groups.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#D9C8B9] bg-white p-12 text-center">
            <div className="text-4xl">☕</div>
            <h3 className="mt-4 text-lg font-semibold text-[#2B1B14]">
              No customizations yet
            </h3>
            <p className="mt-2 text-sm text-[#80695B]">
              Create your first customization group for this product.
            </p>
            <button
              onClick={openCreateGroup}
              className="mt-5 rounded-xl bg-[#754426] px-5 py-3 text-sm font-semibold text-white"
            >
              Create First Group
            </button>
          </div>
        ) : (
          groups.map((group) => (
            <div
              key={group.id}
              className="overflow-hidden rounded-2xl border border-[#EADED4] bg-white"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 p-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-bold text-[#2B1B14]">
                      {group.name}
                    </h3>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        group.isActive
                          ? "bg-green-50 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {group.isActive ? "Active" : "Inactive"}
                    </span>

                    <span className="rounded-full bg-[#F8F3ED] px-3 py-1 text-xs text-[#754426]">
                      {group.selectionType}
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-[#80695B]">
                    {group.description || "No description"}
                  </p>

                  <p className="mt-2 text-xs text-[#80695B]">
                    {group.isRequired ? "Required" : "Optional"} · Min{" "}
                    {group.minSelections} · Max {group.maxSelections} ·{" "}
                    {group.options.length} options
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => openEditGroup(group)}
                    disabled={saving}
                    className="rounded-lg border border-[#EADED4] px-3 py-2 text-sm text-[#754426] disabled:opacity-50"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => deleteGroup(group.id)}
                    disabled={saving}
                    className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 disabled:opacity-50"
                  >
                    Delete
                  </button>

                  <button
                    onClick={() => toggleExpanded(group.id)}
                    className="rounded-lg bg-[#F8F3ED] px-3 py-2 text-sm text-[#754426]"
                  >
                    {expandedGroups.includes(group.id)
                      ? "Hide Options"
                      : "Manage Options"}
                  </button>
                </div>
              </div>

              {expandedGroups.includes(group.id) && (
                <div className="border-t border-[#EADED4] bg-[#FDFBF9] p-5">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h4 className="font-semibold text-[#2B1B14]">
                      Customization Options
                    </h4>

                    <button
                      onClick={() => {
                        setOptionGroupId(
                          optionGroupId === group.id ? null : group.id
                        );
                        setOptionForm(initialOptionForm);
                        setError("");
                      }}
                      className="rounded-lg bg-[#754426] px-4 py-2 text-sm font-medium text-white"
                    >
                      + Add Option
                    </button>
                  </div>

                  {optionGroupId === group.id && (
                    <form
                      onSubmit={addOption}
                      className="mb-5 grid gap-3 rounded-xl border border-[#EADED4] bg-white p-4 md:grid-cols-[1fr_180px_auto]"
                    >
                      <input
                        required
                        maxLength={100}
                        value={optionForm.name}
                        onChange={(e) =>
                          setOptionForm({
                            ...optionForm,
                            name: e.target.value,
                          })
                        }
                        placeholder="Option name e.g. Oat Milk"
                        className="rounded-lg border border-[#EADED4] px-3 py-2 text-sm"
                      />

                      <input
                        required
                        type="number"
                        min="0"
                        step="0.01"
                        value={optionForm.priceAdjustment}
                        onChange={(e) =>
                          setOptionForm({
                            ...optionForm,
                            priceAdjustment: e.target.value,
                          })
                        }
                        placeholder="Additional price"
                        className="rounded-lg border border-[#EADED4] px-3 py-2 text-sm"
                      />

                      <button
                        type="submit"
                        disabled={saving}
                        className="rounded-lg bg-[#754426] px-4 py-2 text-sm text-white disabled:opacity-50"
                      >
                        {saving ? "Saving..." : "Save Option"}
                      </button>
                    </form>
                  )}

                  {group.options.length === 0 ? (
                    <p className="rounded-xl bg-white p-5 text-center text-sm text-[#80695B]">
                      No options added to this group.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {group.options.map((option) => (
                        <div
                          key={option.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#EADED4] bg-white p-4"
                        >
                          {editingOption === option.id ? (
                            <form
                              onSubmit={(e) => saveOption(e, option.id)}
                              className="grid w-full gap-3 md:grid-cols-[1fr_180px_auto_auto]"
                            >
                              <input
                                required
                                maxLength={100}
                                value={editOptionForm.name}
                                onChange={(e) =>
                                  setEditOptionForm({
                                    ...editOptionForm,
                                    name: e.target.value,
                                  })
                                }
                                className="rounded-lg border border-[#EADED4] px-3 py-2 text-sm"
                              />

                              <input
                                required
                                type="number"
                                min="0"
                                step="0.01"
                                value={editOptionForm.priceAdjustment}
                                onChange={(e) =>
                                  setEditOptionForm({
                                    ...editOptionForm,
                                    priceAdjustment: e.target.value,
                                  })
                                }
                                className="rounded-lg border border-[#EADED4] px-3 py-2 text-sm"
                              />

                              <button
                                disabled={saving}
                                className="rounded-lg bg-[#754426] px-4 py-2 text-sm text-white disabled:opacity-50"
                              >
                                Save
                              </button>

                              <button
                                type="button"
                                onClick={() => setEditingOption(null)}
                                className="rounded-lg border border-[#EADED4] px-4 py-2 text-sm"
                              >
                                Cancel
                              </button>
                            </form>
                          ) : (
                            <>
                              <div>
                                <p className="font-medium text-[#2B1B14]">
                                  {option.name}
                                </p>
                                <p className="mt-1 text-sm font-semibold text-[#754426]">
                                  {Number(option.priceAdjustment) > 0
                                    ? `+₹${Number(option.priceAdjustment).toFixed(2)}`
                                    : "No additional charge"}
                                </p>
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`rounded-full px-3 py-1 text-xs ${
                                    option.isAvailable
                                      ? "bg-green-50 text-green-700"
                                      : "bg-gray-100 text-gray-600"
                                  }`}
                                >
                                  {option.isAvailable
                                    ? "Available"
                                    : "Unavailable"}
                                </span>

                                <button
                                  onClick={() => startEditOption(option)}
                                  disabled={saving}
                                  className="rounded-lg border border-[#EADED4] px-3 py-2 text-xs text-[#754426] disabled:opacity-50"
                                >
                                  Edit
                                </button>

                                <button
                                  onClick={() => toggleOption(option)}
                                  disabled={saving}
                                  className="rounded-lg border border-[#EADED4] px-3 py-2 text-xs text-[#754426] disabled:opacity-50"
                                >
                                  {option.isAvailable ? "Disable" : "Enable"}
                                </button>

                                <button
                                  onClick={() => deleteOption(option.id)}
                                  disabled={saving}
                                  className="rounded-lg border border-red-200 px-3 py-2 text-xs text-red-600 disabled:opacity-50"
                                >
                                  Delete
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
