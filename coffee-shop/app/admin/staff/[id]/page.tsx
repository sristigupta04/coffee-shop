
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  UserRound,
  Mail,
  Phone,
  MapPin,
  BriefcaseBusiness,
  CalendarDays,
  Clock3,
  Pencil,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Building2,
  FileText,
} from "lucide-react";

type Staff = {
  id: string;
  name: string;
  email: string | null;
  phone?: string | null;
  image?: string | null;
  designation?: string | null;
  department?: string | null;
  role: string;
  employmentType: string;
  isActive: boolean;
  joiningDate: string;
  leavingDate?: string | null;
  address?: string | null;
  notes?: string | null;
  branch?: {
    id: string;
    name: string;
  } | null;
  attendance?: {
    id: string;
    date: string;
    status: string;
    checkIn?: string | null;
    checkOut?: string | null;
    workingMinutes?: number | null;
  }[];
  _count?: {
    attendance: number;
    leaveRequests: number;
    documents: number;
    payrolls: number;
  };
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

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

function formatTime(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).format(date);
}

function formatDuration(minutes?: number | null) {
  if (minutes == null || !Number.isFinite(minutes)) return "—";

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${hours}h ${remainingMinutes}m`;
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

function InfoItem({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="rounded-lg bg-[#f8f3ed] p-2 text-[#754426]">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="mt-1 break-words text-sm font-medium text-[#2b1b14]">
          {value || "—"}
        </p>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#eee3d8] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{title}</p>

        <div className="rounded-xl bg-[#f8f3ed] p-3 text-[#754426]">
          {icon}
        </div>
      </div>

      <p className="mt-3 text-2xl font-bold text-[#2b1b14]">{value}</p>
    </div>
  );
}

export default function StaffProfilePage() {
  const params = useParams<{ id: string }>();
  const staffId = params.id;

  const [staff, setStaff] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchStaff = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`/api/admin/staff/${staffId}`);
      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Unable to load staff profile.");
      }

      setStaff(data.staff ?? data.data ?? data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
      setStaff(null);
    } finally {
      setLoading(false);
    }
  }, [staffId]);

  useEffect(() => {
    if (staffId) {
      fetchStaff();
    }
  }, [staffId, fetchStaff]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-3 text-sm text-slate-500">
        <RefreshCw className="h-5 w-5 animate-spin" />
        Loading staff profile...
      </div>
    );
  }

  if (error || !staff) {
    return (
      <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
        <AlertCircle className="mx-auto mb-3 h-8 w-8 text-red-600" />

        <h2 className="font-semibold text-red-800">
          Unable to load staff profile
        </h2>

        <p className="mt-2 text-sm text-red-700">
          {error || "Staff record not found."}
        </p>

        <button
          type="button"
          onClick={fetchStaff}
          className="mt-4 rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
        >
          Try Again
        </button>

        <div>
          <Link
            href="/admin/staff"
            className="mt-4 inline-block text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Back to Staff Directory
          </Link>
        </div>
      </div>
    );
  }

  const attendance = staff.attendance ?? [];

  const presentCount = attendance.filter(
    (record) => record.status === "PRESENT"
  ).length;

  const absentCount = attendance.filter(
    (record) => record.status === "ABSENT"
  ).length;

  const lateCount = attendance.filter(
    (record) => record.status === "LATE"
  ).length;

  return (
    <div className="min-h-screen bg-[#fffaf3] p-4 md:p-7">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Breadcrumb */}
        <Link
          href="/admin/staff"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#754426] hover:text-[#2b1b14]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Staff Directory
        </Link>

        {/* Profile Header */}
        <section className="overflow-hidden rounded-2xl border border-[#eee3d8] bg-white shadow-sm">
          <div className="h-28 bg-gradient-to-r from-[#2b1b14] via-[#754426] to-[#a76535]" />

          <div className="flex flex-col justify-between gap-5 px-5 pb-6 sm:flex-row sm:items-end md:px-7">
            <div className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end">
              {staff.image ? (
                <img
                  src={staff.image}
                  alt={staff.name}
                  className="h-24 w-24 rounded-2xl border-4 border-white bg-white object-cover shadow-md"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-white bg-[#f8f3ed] text-2xl font-bold text-[#754426] shadow-md">
                  {getInitials(staff.name)}
                </div>
              )}

              <div className="pb-1">
                <h1 className="text-2xl font-bold text-[#2b1b14]">
                  {staff.name}
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  {staff.designation ||
                    ROLE_LABELS[staff.role] ||
                    staff.role}
                  {staff.department ? ` · ${staff.department}` : ""}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      staff.isActive
                        ? "bg-green-50 text-green-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {staff.isActive ? "Active Employee" : "Inactive Employee"}
                  </span>

                  <span className="rounded-full bg-[#f8f3ed] px-3 py-1 text-xs font-semibold text-[#754426]">
                    {ROLE_LABELS[staff.role] ?? staff.role}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={fetchStaff}
                className="inline-flex items-center gap-2 rounded-xl border border-[#e8ded3] px-4 py-2.5 text-sm font-semibold text-[#604b3d] hover:bg-[#f8f3ed]"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>

              <Link
                href={`/admin/staff/${staff.id}/edit`}
                className="inline-flex items-center gap-2 rounded-xl bg-[#754426] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#5d351e]"
              >
                <Pencil className="h-4 w-4" />
                Edit Profile
              </Link>
            </div>
          </div>
        </section>

        {/* Summary */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Attendance Records"
            value={staff._count?.attendance ?? attendance.length}
            icon={<CalendarDays className="h-5 w-5" />}
          />

          <SummaryCard
            title="Present Records"
            value={presentCount}
            icon={<CheckCircle2 className="h-5 w-5" />}
          />

          <SummaryCard
            title="Late Records"
            value={lateCount}
            icon={<Clock3 className="h-5 w-5" />}
          />

          <SummaryCard
            title="Absent Records"
            value={absentCount}
            icon={<XCircle className="h-5 w-5" />}
          />
        </div>

        {/* Personal and Employment Details */}
        <div className="grid gap-6 lg:grid-cols-3">
          <section className="rounded-2xl border border-[#eee3d8] bg-white p-5 shadow-sm lg:col-span-2 md:p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-xl bg-[#f8f3ed] p-3 text-[#754426]">
                <UserRound className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-semibold text-[#2b1b14]">
                  Personal Information
                </h2>
                <p className="text-sm text-slate-500">
                  Employee contact and personal details
                </p>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <InfoItem
                label="Full Name"
                value={staff.name}
                icon={<UserRound className="h-4 w-4" />}
              />

              <InfoItem
                label="Email Address"
                value={staff.email || "—"}
                icon={<Mail className="h-4 w-4" />}
              />

              <InfoItem
                label="Phone Number"
                value={staff.phone || "—"}
                icon={<Phone className="h-4 w-4" />}
              />

              <InfoItem
                label="Address"
                value={staff.address || "—"}
                icon={<MapPin className="h-4 w-4" />}
              />
            </div>

            {staff.notes && (
              <div className="mt-6 border-t border-slate-100 pt-5">
                <p className="mb-2 text-xs font-medium text-slate-500">
                  Additional Notes
                </p>

                <p className="whitespace-pre-wrap text-sm text-slate-700">
                  {staff.notes}
                </p>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-[#eee3d8] bg-white p-5 shadow-sm md:p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-xl bg-[#f8f3ed] p-3 text-[#754426]">
                <BriefcaseBusiness className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-semibold text-[#2b1b14]">
                  Employment Details
                </h2>
                <p className="text-sm text-slate-500">
                  Work and branch information
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <InfoItem
                label="Designation"
                value={staff.designation || "—"}
                icon={<BriefcaseBusiness className="h-4 w-4" />}
              />

              <InfoItem
                label="Role"
                value={ROLE_LABELS[staff.role] ?? staff.role}
                icon={<BriefcaseBusiness className="h-4 w-4" />}
              />

              <InfoItem
                label="Employment Type"
                value={
                  EMPLOYMENT_LABELS[staff.employmentType] ??
                  staff.employmentType
                }
                icon={<FileText className="h-4 w-4" />}
              />

              <InfoItem
                label="Branch"
                value={staff.branch?.name || "Unassigned"}
                icon={<Building2 className="h-4 w-4" />}
              />

              <InfoItem
                label="Joining Date"
                value={formatDate(staff.joiningDate)}
                icon={<CalendarDays className="h-4 w-4" />}
              />

              <InfoItem
                label="Leaving Date"
                value={formatDate(staff.leavingDate)}
                icon={<CalendarDays className="h-4 w-4" />}
              />
            </div>
          </section>
        </div>

        {/* Recent Attendance */}
        <section className="rounded-2xl border border-[#eee3d8] bg-white p-5 shadow-sm md:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-green-50 p-3 text-green-700">
              <CalendarDays className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-semibold text-[#2b1b14]">
                Recent Attendance
              </h2>
              <p className="text-sm text-slate-500">
                Latest attendance records
              </p>
            </div>
          </div>

          {attendance.length === 0 ? (
            <div className="rounded-xl bg-slate-50 p-6 text-center">
              <CalendarDays className="mx-auto mb-2 h-7 w-7 text-slate-300" />
              <p className="text-sm text-slate-500">
                No attendance records available.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {attendance.slice(0, 5).map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {formatDate(record.date)}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {formatTime(record.checkIn)} –{" "}
                      {formatTime(record.checkOut)}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="rounded-full bg-[#f8f3ed] px-2.5 py-1 text-xs font-semibold text-[#754426]">
                      {record.status.replaceAll("_", " ")}
                    </span>

                    <p className="mt-2 text-xs text-slate-500">
                      {formatDuration(record.workingMinutes)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Link
            href={`/admin/staff/attendance?staffId=${staff.id}`}
            className="mt-4 inline-flex text-sm font-semibold text-[#754426] hover:text-[#2b1b14]"
          >
            View attendance records →
          </Link>
        </section>
      </div>
    </div>
  );
}
