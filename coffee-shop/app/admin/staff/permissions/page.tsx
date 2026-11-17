
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type StaffRole =
  | "STAFF"
  | "BARISTA"
  | "CASHIER"
  | "KITCHEN"
  | "MANAGER"
  | "HR"
  | "DELIVERY";

type PermissionAction = "view" | "create" | "update" | "delete";

type Permission = {
  key: string;
  label: string;
  description: string;
  actions: PermissionAction[];
};

type PermissionCategory = {
  key: string;
  label: string;
  permissions: Permission[];
};

type PermissionMatrix = Record<
  StaffRole,
  Record<string, Record<PermissionAction, boolean>>
>;

const roles: { value: StaffRole; label: string }[] = [
  { value: "STAFF", label: "Staff" },
  { value: "BARISTA", label: "Barista" },
  { value: "CASHIER", label: "Cashier" },
  { value: "KITCHEN", label: "Kitchen" },
  { value: "MANAGER", label: "Manager" },
  { value: "HR", label: "HR" },
  { value: "DELIVERY", label: "Delivery" },
];

const categories: PermissionCategory[] = [
  {
    key: "orders",
    label: "Orders Management",
    permissions: [
      {
        key: "orders",
        label: "Orders",
        description: "Access and manage customer orders.",
        actions: ["view", "create", "update", "delete"],
      },
    ],
  },
  {
    key: "products",
    label: "Products Management",
    permissions: [
      {
        key: "products",
        label: "Products",
        description: "Access and manage product information.",
        actions: ["view", "create", "update", "delete"],
      },
      {
        key: "inventory",
        label: "Inventory",
        description: "View and update inventory records.",
        actions: ["view", "create", "update", "delete"],
      },
    ],
  },
  {
    key: "customers",
    label: "Customer Management",
    permissions: [
      {
        key: "customers",
        label: "Customers",
        description: "Access customer information.",
        actions: ["view", "create", "update", "delete"],
      },
    ],
  },
  {
    key: "payments",
    label: "Payments Management",
    permissions: [
      {
        key: "payments",
        label: "Payments",
        description: "Access payment and transaction records.",
        actions: ["view", "create", "update", "delete"],
      },
      {
        key: "refunds",
        label: "Refunds",
        description: "View and process customer refunds.",
        actions: ["view", "create", "update", "delete"],
      },
    ],
  },
  {
    key: "staff",
    label: "Staff Management",
    permissions: [
      {
        key: "staff",
        label: "Staff",
        description: "Access staff management records.",
        actions: ["view", "create", "update", "delete"],
      },
      {
        key: "attendance",
        label: "Attendance",
        description: "View and manage attendance records.",
        actions: ["view", "create", "update", "delete"],
      },
      {
        key: "leaves",
        label: "Leaves",
        description: "View and process staff leave requests.",
        actions: ["view", "create", "update", "delete"],
      },
      {
        key: "payroll",
        label: "Payroll",
        description: "Access payroll and salary information.",
        actions: ["view", "create", "update", "delete"],
      },
      {
        key: "performance",
        label: "Performance",
        description: "Access staff performance reviews.",
        actions: ["view", "create", "update", "delete"],
      },
    ],
  },
  {
    key: "reports",
    label: "Reports & Analytics",
    permissions: [
      {
        key: "reports",
        label: "Reports",
        description: "Access business and staff reports.",
        actions: ["view"],
      },
      {
        key: "analytics",
        label: "Analytics",
        description: "View business analytics and statistics.",
        actions: ["view"],
      },
    ],
  },
];

const actions: PermissionAction[] = [
  "view",
  "create",
  "update",
  "delete",
];

const createDefaultMatrix = (): PermissionMatrix => {
  const matrix = {} as PermissionMatrix;

  roles.forEach(({ value }) => {
    matrix[value] = {};

    categories.forEach((category) => {
      category.permissions.forEach((permission) => {
        matrix[value][permission.key] = {
          view: false,
          create: false,
          update: false,
          delete: false,
        };
      });
    });
  });

  // Default permissions for selected operational roles.
  const defaults: Record<StaffRole, string[]> = {
    STAFF: ["orders"],
    BARISTA: ["orders"],
    CASHIER: ["orders", "payments"],
    KITCHEN: ["orders"],
    MANAGER: [
      "orders",
      "products",
      "inventory",
      "customers",
      "payments",
      "refunds",
      "staff",
      "attendance",
      "leaves",
      "reports",
      "analytics",
    ],
    HR: [
      "staff",
      "attendance",
      "leaves",
      "payroll",
      "performance",
      "reports",
    ],
    DELIVERY: ["orders"],
  };

  roles.forEach(({ value }) => {
    defaults[value].forEach((permissionKey) => {
      const permission = matrix[value][permissionKey];

      if (permission) {
        permission.view = true;
      }
    });
  });

  return matrix;
};

const actionLabels: Record<PermissionAction, string> = {
  view: "View",
  create: "Create",
  update: "Update",
  delete: "Delete",
};

export default function StaffPermissionsPage() {
  const [matrix, setMatrix] = useState<PermissionMatrix>(
    createDefaultMatrix
  );
  const [selectedRole, setSelectedRole] =
    useState<StaffRole>("STAFF");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  const fetchPermissions = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/admin/staff/permissions");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to load permissions."
        );
      }

      if (data.permissions) {
        setMatrix((previous) => ({
          ...previous,
          ...data.permissions,
        }));
      }

      setHasChanges(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const updatePermission = (
    permissionKey: string,
    action: PermissionAction,
    checked: boolean
  ) => {
    setMatrix((previous) => ({
      ...previous,
      [selectedRole]: {
        ...previous[selectedRole],
        [permissionKey]: {
          ...previous[selectedRole][permissionKey],
          [action]: checked,
        },
      },
    }));

    setHasChanges(true);
    setSuccess("");
  };

  const toggleAll = (checked: boolean) => {
    setMatrix((previous) => {
      const updatedRole = { ...previous[selectedRole] };

      categories.forEach((category) => {
        category.permissions.forEach((permission) => {
          updatedRole[permission.key] = {
            view: checked && permission.actions.includes("view"),
            create: checked && permission.actions.includes("create"),
            update: checked && permission.actions.includes("update"),
            delete: checked && permission.actions.includes("delete"),
          };
        });
      });

      return {
        ...previous,
        [selectedRole]: updatedRole,
      };
    });

    setHasChanges(true);
    setSuccess("");
  };

  const savePermissions = async () => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await fetch(
        "/api/admin/staff/permissions",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            role: selectedRole,
            permissions: matrix[selectedRole],
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to save permissions."
        );
      }

      setHasChanges(false);
      setSuccess(
        data.message || "Permissions saved successfully."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  };

  const selectedRoleLabel =
    roles.find((role) => role.value === selectedRole)?.label ||
    selectedRole;

  const totalPermissions = categories.reduce(
    (total, category) => total + category.permissions.length,
    0
  );

  const enabledPermissions = Object.values(
    matrix[selectedRole] || {}
  ).reduce(
    (total, permission) =>
      total +
      Object.values(permission).filter(Boolean).length,
    0
  );

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
            <Link
              href="/admin/staff"
              className="hover:text-blue-600"
            >
              Staff
            </Link>
            <span>/</span>
            <span className="text-gray-800">Permissions</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900">
            Staff Permissions
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Configure access permissions for different staff roles.
          </p>
        </div>

        <button
          onClick={fetchPermissions}
          disabled={loading || saving}
          className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Available Roles</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {roles.length}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">
            Permission Modules
          </p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {totalPermissions}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">
            Enabled Permissions
          </p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {enabledPermissions}
          </p>
        </div>
      </div>

      {/* Role Selection */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Select Staff Role
            </label>

            <select
              value={selectedRole}
              disabled={loading || saving}
              onChange={(event) => {
                setSelectedRole(event.target.value as StaffRole);
                setError("");
                setSuccess("");
                setHasChanges(false);
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm sm:max-w-sm"
            >
              {roles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={loading || saving}
              onClick={() => toggleAll(true)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Select All
            </button>

            <button
              type="button"
              disabled={loading || saving}
              onClick={() => toggleAll(false)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Clear All
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
          Editing permissions for{" "}
          <strong>{selectedRoleLabel}</strong>.
          Changes will apply to this role only.
        </div>
      </section>

      {/* Permission Matrix */}
      <section className="space-y-5">
        {loading ? (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-sm text-gray-500">
            Loading permissions...
          </div>
        ) : (
          categories.map((category) => (
            <div
              key={category.key}
              className="overflow-hidden rounded-xl border border-gray-200 bg-white"
            >
              <div className="border-b border-gray-100 bg-gray-50 px-5 py-4">
                <h2 className="font-semibold text-gray-900">
                  {category.label}
                </h2>
              </div>

              <div className="divide-y divide-gray-100">
                {category.permissions.map((permission) => {
                  const current =
                    matrix[selectedRole]?.[permission.key];

                  return (
                    <div
                      key={permission.key}
                      className="flex flex-col justify-between gap-4 px-5 py-4 lg:flex-row lg:items-center"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900">
                          {permission.label}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {permission.description}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-x-6 gap-y-3">
                        {actions.map((action) => {
                          if (
                            !permission.actions.includes(action)
                          ) {
                            return null;
                          }

                          return (
                            <label
                              key={action}
                              className="flex cursor-pointer items-center gap-2 text-sm text-gray-700"
                            >
                              <input
                                type="checkbox"
                                checked={Boolean(current?.[action])}
                                disabled={saving}
                                onChange={(event) =>
                                  updatePermission(
                                    permission.key,
                                    action,
                                    event.target.checked
                                  )
                                }
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              {actionLabels[action]}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </section>

      {/* Footer Actions */}
      <div className="sticky bottom-0 z-10 flex flex-col justify-between gap-3 border-t border-gray-200 bg-white/95 py-4 backdrop-blur sm:flex-row sm:items-center">
        <p className="text-sm text-gray-500">
          {hasChanges
            ? "You have unsaved permission changes."
            : "All changes are saved."}
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            disabled={!hasChanges || saving}
            onClick={fetchPermissions}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Discard Changes
          </button>

          <button
            type="button"
            disabled={!hasChanges || saving || loading}
            onClick={savePermissions}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Permissions"}
          </button>
        </div>
      </div>
    </div>
  );
}
