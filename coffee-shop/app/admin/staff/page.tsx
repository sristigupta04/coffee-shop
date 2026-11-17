
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Users,
  UserPlus,
  Search,
  RefreshCw,
  Eye,
  Pencil,
  Mail,
  Phone,
  MapPin,
  BriefcaseBusiness,
  Filter,
  X,
  AlertCircle,
  CheckCircle2,
  UserCheck,
  UserX,
} from "lucide-react";

type Staff = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  image?: string | null;
  designation?: string | null;
  department?: string | null;
  role: string;
  employmentType: string;
  isActive: boolean;
  loginEnabled: boolean;
  joiningDate: string;
  branch?: {
    id: string;
    name: string;
  } | null;
};

const ROLE_LABELS: Record<string, string> = {
  STAFF: "Staff",
  BARISTA: "Barista",
  CASHIER: "Cashier",
  KITCHEN: "Kitchen",
  MANAGER: "Manager",
  HR: "HR",
  DELIVERY: "Delivery",
};

const EMPLOYMENT_LABELS: Record<string, string> = {
  FULL_TIME: "Full Time",
  PART_TIME: "Part Time",
  CONTRACT: "Contract",
  TEMPORARY: "Temporary",
};

function formatDate(date: string) {
  if (!date) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(date));
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
        active
          ? "bg-green-50 text-green-700"
          : "bg-slate-100 text-slate-600"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          active ? "bg-green-500" : "bg-slate-400"
        }`}
      />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

export default function StaffDirectoryPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [employmentFilter, setEmploymentFilter] = useState("ALL");

  const fetchStaff = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

const response = await fetch("/api/admin/staff?limit=100");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load staff.");
      }

      const records = Array.isArray(data)
        ? data
        : data.staff ?? data.data ?? [];

      setStaff(records);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const filteredStaff = useMemo(() => {
    const searchTerm = search.toLowerCase().trim();

    return staff.filter((person) => {
      const matchesSearch =
        !searchTerm ||
        person.name.toLowerCase().includes(searchTerm) ||
        person.email.toLowerCase().includes(searchTerm) ||
        person.phone?.toLowerCase().includes(searchTerm) ||
        person.designation?.toLowerCase().includes(searchTerm) ||
        person.department?.toLowerCase().includes(searchTerm);

      const matchesRole =
        roleFilter === "ALL" || person.role === roleFilter;

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && person.isActive) ||
        (statusFilter === "INACTIVE" && !person.isActive);

      const matchesEmployment =
        employmentFilter === "ALL" ||
        person.employmentType === employmentFilter;

      return (
        matchesSearch &&
        matchesRole &&
        matchesStatus &&
        matchesEmployment
      );
    });
  }, [staff, search, roleFilter, statusFilter, employmentFilter]);

  const activeCount = staff.filter((person) => person.isActive).length;
  const inactiveCount = staff.length - activeCount;
  const loginEnabledCount = staff.filter(
    (person) => person.loginEnabled
  ).length;

  function clearFilters() {
    setSearch("");
    setRoleFilter("ALL");
    setStatusFilter("ALL");
    setEmploymentFilter("ALL");
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-7">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 text-sm font-medium text-blue-700">
              Staff Management / Directory
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
              Staff Directory
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Manage your employees, roles and employment information.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={fetchStaff}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>

            <Link
              href="/admin/staff/create"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-800"
            >
              <UserPlus className="h-4 w-4" />
              Add Staff
            </Link>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="flex-1">{error}</div>
            <button onClick={() => setError("")} aria-label="Close error">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Staff"
            value={staff.length}
            icon={<Users className="h-5 w-5" />}
            iconClass="bg-blue-50 text-blue-700"
          />

          <StatCard
            title="Active Staff"
            value={activeCount}
            icon={<UserCheck className="h-5 w-5" />}
            iconClass="bg-green-50 text-green-700"
          />

          <StatCard
            title="Inactive Staff"
            value={inactiveCount}
            icon={<UserX className="h-5 w-5" />}
            iconClass="bg-orange-50 text-orange-700"
          />

          <StatCard
            title="Login Enabled"
            value={loginEnabledCount}
            icon={<CheckCircle2 className="h-5 w-5" />}
            iconClass="bg-indigo-50 text-indigo-700"
          />
        </div>

        {/* Filters */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
          <div className="mb-4 flex items-center gap-2">
            <Filter className="h-4 w-4 text-blue-700" />
            <h2 className="font-semibold text-slate-900">
              Search & Filters
            </h2>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, email, phone..."
                className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
            >
              <option value="ALL">All Roles</option>
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>

            <select
              value={employmentFilter}
              onChange={(e) => setEmploymentFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
            >
              <option value="ALL">All Employment Types</option>
              {Object.entries(EMPLOYMENT_LABELS).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                )
              )}
            </select>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-500">
              Showing {filteredStaff.length} of {staff.length} employees
            </p>

            <button
              onClick={clearFilters}
              className="text-xs font-semibold text-blue-700 hover:text-blue-900"
            >
              Clear filters
            </button>
          </div>
        </section>

        {/* Staff Table */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="font-semibold text-slate-900">
                All Employees
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Staff details and employment status
              </p>
            </div>

            <span className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
              {filteredStaff.length} Records
            </span>
          </div>

          {loading ? (
            <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-slate-500">
              <RefreshCw className="h-5 w-5 animate-spin" />
              Loading staff...
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center">
              <Users className="mb-3 h-10 w-10 text-slate-300" />
              <h3 className="font-semibold text-slate-800">
                No staff found
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Try changing your search or filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Employee</th>
                    <th className="px-5 py-4 font-semibold">Role</th>
                    <th className="px-5 py-4 font-semibold">Employment</th>
                    <th className="px-5 py-4 font-semibold">Branch</th>
                    <th className="px-5 py-4 font-semibold">Joining Date</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                    <th className="px-5 py-4 text-right font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredStaff.map((person) => (
                    <tr
                      key={person.id}
                      className="transition hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {person.image ? (
                            <img
                              src={person.image}
                              alt={person.name}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                              {getInitials(person.name)}
                            </div>
                          )}

                          <div>
                            <p className="font-semibold text-slate-900">
                              {person.name}
                            </p>
                            <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                              <Mail className="h-3 w-3" />
                              {person.email}
                            </p>
                            {person.phone && (
                              <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                                <Phone className="h-3 w-3" />
                                {person.phone}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-slate-800">
                          {ROLE_LABELS[person.role] ?? person.role}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {person.designation || person.department || "—"}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {EMPLOYMENT_LABELS[person.employmentType] ??
                          person.employmentType}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 text-sm text-slate-600">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          {person.branch?.name || "Unassigned"}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {formatDate(person.joiningDate)}
                      </td>

                      <td className="px-5 py-4">
                        <div className="space-y-2">
                          <StatusBadge active={person.isActive} />
                          <p className="text-xs text-slate-500">
                            Login: {person.loginEnabled ? "Enabled" : "Disabled"}
                          </p>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/admin/staff/${person.id}`}
                            title="View staff"
                            className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>

                          <Link
                            href={`/admin/staff/${person.id}/edit`}
                            title="Edit staff"
                            className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 p-4 text-xs text-blue-800">
          <BriefcaseBusiness className="h-4 w-4 shrink-0" />
          Staff records are managed centrally. Branch assignment and login
          permissions depend on the staff API and backend authorization rules.
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  iconClass,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  iconClass: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <div className={`rounded-xl p-3 ${iconClass}`}>{icon}</div>
      </div>
      <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
        {value}
      </p>
    </div>
  );
}
