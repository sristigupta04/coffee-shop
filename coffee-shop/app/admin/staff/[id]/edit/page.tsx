
"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  RefreshCw,
  UserRound,
  BriefcaseBusiness,
  AlertCircle,
  CheckCircle2,
  FileText,
} from "lucide-react";

type StaffForm = {
  name: string;
  email: string;
  phone: string;
  designation: string;
  department: string;
  employmentType: string;
  joiningDate: string;
  address: string;
  notes: string;
  isActive: boolean;
};

const EMPTY_FORM: StaffForm = {
  name: "",
  email: "",
  phone: "",
  designation: "",
  department: "",
  employmentType: "FULL_TIME",
  joiningDate: "",
  address: "",
  notes: "",
  isActive: true,
};

const inputClass =
  "w-full rounded-xl border border-[#e8ded3] bg-white px-4 py-3 text-sm text-[#2b1b14] outline-none placeholder:text-slate-400 focus:border-[#754426] focus:ring-2 focus:ring-[#754426]/10";

const labelClass = "mb-2 block text-sm font-medium text-[#4b382e]";

function dateInputValue(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export default function EditStaffPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const staffId = params.id;

  const [form, setForm] = useState<StaffForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const updateField = <K extends keyof StaffForm>(
    key: K,
    value: StaffForm[K]
  ) => {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const fetchStaff = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`/api/admin/staff/${staffId}`);
      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(
          data.message || "Unable to load employee details."
        );
      }

      const person = data.staff ?? data.data ?? data;

      setForm({
        name: person.name ?? "",
        email: person.email ?? "",
        phone: person.phone ?? "",
        designation: person.designation ?? "",
        department: person.department ?? "",
        employmentType: person.employmentType ?? "FULL_TIME",
        joiningDate: dateInputValue(person.joiningDate),
        address: person.address ?? "",
        notes: person.notes ?? "",
        isActive: Boolean(person.isActive),
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }, [staffId]);

  useEffect(() => {
    if (staffId) {
      fetchStaff();
    }
  }, [staffId, fetchStaff]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (
      !form.name.trim() ||
      !form.phone.trim() ||
      !form.designation.trim() ||
      !form.joiningDate
    ) {
      setError(
        "Name, phone, designation and joining date are required."
      );
      return;
    }

    const normalizedEmail = form.email.trim().toLowerCase();

    if (
      normalizedEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    ) {
      setError("Please enter a valid email address.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: form.name.trim(),
        email: normalizedEmail || null,
        phone: form.phone.trim(),
        designation: form.designation.trim(),
        department: form.department.trim() || null,
        employmentType: form.employmentType,
        joiningDate: form.joiningDate,
        address: form.address.trim() || null,
        notes: form.notes.trim() || null,
        isActive: form.isActive,
      };

      const response = await fetch(`/api/admin/staff/${staffId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(
          data.message || "Failed to update employee."
        );
      }

      setSuccess("Employee profile updated successfully.");

      router.push(`/admin/staff/${staffId}`);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-3 text-sm text-slate-500">
        <RefreshCw className="h-5 w-5 animate-spin" />
        Loading employee details...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fffaf3] p-4 md:p-7">
      <div className="mx-auto max-w-5xl space-y-6">

        <Link
          href={`/admin/staff/${staffId}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-[#754426] hover:text-[#2b1b14]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Staff Profile
        </Link>

        <div>
          <p className="mb-2 text-xs font-semibold tracking-[0.2em] text-[#a76535]">
            BREWB​ITES ADMIN
          </p>

          <h1 className="font-serif text-3xl font-bold text-[#2b1b14]">
            Edit Staff
          </h1>

          <p className="mt-2 text-sm text-[#806d60]">
            Update employee information and employment details.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <AlertCircle className="h-5 w-5 shrink-0" />
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700"
          >
            <CheckCircle2 className="h-5 w-5" />
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Personal Information */}
          <section className="rounded-2xl border border-[#eee3d8] bg-white p-5 shadow-sm md:p-7">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-xl bg-[#f8f3ed] p-3 text-[#754426]">
                <UserRound className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-semibold text-[#2b1b14]">
                  Personal Information
                </h2>
                <p className="text-sm text-slate-500">
                  Employee contact information
                </p>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className={labelClass}>
                  Full Name *
                </label>
                <input
                  required
                  value={form.name}
                  onChange={(e) =>
                    updateField("name", e.target.value)
                  }
                  className={inputClass}
                  placeholder="Enter full name"
                />
              </div>

              <div>
                <label className={labelClass}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    updateField("email", e.target.value)
                  }
                  className={inputClass}
                  placeholder="example@email.com"
                />
              </div>

              <div>
                <label className={labelClass}>
                  Phone Number *
                </label>
                <input
                  required
                  type="tel"
                  value={form.phone}
                  onChange={(e) =>
                    updateField("phone", e.target.value)
                  }
                  className={inputClass}
                  placeholder="Enter phone number"
                />
              </div>

              <div>
                <label className={labelClass}>
                  Address
                </label>
                <input
                  value={form.address}
                  onChange={(e) =>
                    updateField("address", e.target.value)
                  }
                  className={inputClass}
                  placeholder="Enter address"
                />
              </div>
            </div>
          </section>

          {/* Employment Details */}
          <section className="rounded-2xl border border-[#eee3d8] bg-white p-5 shadow-sm md:p-7">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-xl bg-[#f8f3ed] p-3 text-[#754426]">
                <BriefcaseBusiness className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-semibold text-[#2b1b14]">
                  Employment Details
                </h2>
                <p className="text-sm text-slate-500">
                  Designation, department and employment dates
                </p>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className={labelClass}>
                  Designation *
                </label>
                <input
                  required
                  value={form.designation}
                  onChange={(e) =>
                    updateField("designation", e.target.value)
                  }
                  className={inputClass}
                  placeholder="e.g. Senior Barista"
                />
              </div>

              <div>
                <label className={labelClass}>
                  Department
                </label>
                <input
                  value={form.department}
                  onChange={(e) =>
                    updateField("department", e.target.value)
                  }
                  className={inputClass}
                  placeholder="e.g. Operations"
                />
              </div>

              <div>
                <label className={labelClass}>
                  Employment Type
                </label>
                <select
                  value={form.employmentType}
                  onChange={(e) =>
                    updateField("employmentType", e.target.value)
                  }
                  className={inputClass}
                >
                  <option value="FULL_TIME">Full Time</option>
                  <option value="PART_TIME">Part Time</option>
                  <option value="CONTRACT">Contract</option>
                  <option value="TEMPORARY">Temporary</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>
                  Joining Date *
                </label>
                <input
                  required
                  type="date"
                  value={form.joiningDate}
                  onChange={(e) =>
                    updateField("joiningDate", e.target.value)
                  }
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          {/* Employment Status */}
          <section className="rounded-2xl border border-[#eee3d8] bg-white p-5 shadow-sm md:p-7">
            <div className="mb-5">
              <h2 className="font-semibold text-[#2b1b14]">
                Employment Status
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Manage the current employee status.
              </p>
            </div>

            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-[#eee3d8] p-4">
              <div>
                <p className="text-sm font-semibold text-[#2b1b14]">
                  Active Employee
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Mark this employee as active or inactive.
                </p>
              </div>

              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) =>
                  updateField("isActive", e.target.checked)
                }
                className="h-5 w-5 accent-[#754426]"
              />
            </label>
          </section>

          {/* Notes */}
          <section className="rounded-2xl border border-[#eee3d8] bg-white p-5 shadow-sm md:p-7">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl bg-[#f8f3ed] p-3 text-[#754426]">
                <FileText className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-semibold text-[#2b1b14]">
                  Additional Notes
                </h2>
                <p className="text-sm text-slate-500">
                  Internal information for administrators
                </p>
              </div>
            </div>

            <textarea
              rows={4}
              value={form.notes}
              onChange={(e) =>
                updateField("notes", e.target.value)
              }
              placeholder="Additional employee information..."
              className={inputClass}
            />
          </section>

          {/* Actions */}
          <div className="flex flex-col-reverse justify-between gap-3 border-t border-[#e8ded3] pt-5 sm:flex-row">
            <Link
              href={`/admin/staff/${staffId}`}
              className="rounded-xl border border-[#e8ded3] bg-white px-5 py-3 text-center text-sm font-semibold text-[#604b3d] hover:bg-[#f8f3ed]"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#754426] px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#5d351e] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}

              {saving ? "Saving Changes..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
