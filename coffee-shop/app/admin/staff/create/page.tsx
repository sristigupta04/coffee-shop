
"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Branch = {
  id: string;
  name: string;
};

type StaffForm = {
  name: string;
  email: string;
  phone: string;
  designation: string;
  department: string;
  role: string;
  employmentType: string;
  joiningDate: string;
  baseSalary: string;
  branchId: string;
  address: string;
  notes: string;
  image: string;
};

const initialForm: StaffForm = {
  name: "",
  email: "",
  phone: "",
  designation: "",
  department: "",
  role: "",
  employmentType: "FULL_TIME",
  joiningDate: "",
  baseSalary: "",
  branchId: "",
  address: "",
  notes: "",
  image: "",
};

const inputClass =
  "w-full rounded-xl border border-[#e8ded3] bg-white px-4 py-3 text-sm text-[#2b1b14] outline-none transition focus:border-[#754426] focus:ring-2 focus:ring-[#754426]/10";

const labelClass = "mb-2 block text-sm font-medium text-[#4b382e]";

export default function CreateStaffPage() {
  const router = useRouter();

  const [form, setForm] = useState<StaffForm>(initialForm);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const response = await fetch("/api/admin/branches");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to load branches");
        }

        const branchList = Array.isArray(data.branches)
          ? data.branches
          : Array.isArray(data.data)
            ? data.data
            : [];

        setBranches(branchList);
      } catch (err) {
        console.error("Branch fetch error:", err);
      } finally {
        setLoadingBranches(false);
      }
    };

    fetchBranches();
  }, []);

  const updateField = (field: keyof StaffForm, value: string) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!form.name.trim()) {
      setError("Staff name is required.");
      return;
    }

    if (!form.phone.trim()) {
      setError("Phone number is required.");
      return;
    }

    if (!form.designation.trim()) {
      setError("Designation is required.");
      return;
    }

    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (
      form.baseSalary.trim() &&
      (!Number.isFinite(Number(form.baseSalary)) ||
        Number(form.baseSalary) < 0)
    ) {
      setError("Please enter a valid base salary.");
      return;
    }

    if (!form.joiningDate) {
      setError("Joining date is required.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim(),
      designation: form.designation.trim(),
      department: form.department.trim() || null,
      role: form.role.trim() || null,
      employmentType: form.employmentType,
      joiningDate: form.joiningDate,
      baseSalary: form.baseSalary.trim()
        ? Number(form.baseSalary)
        : null,
      branchId: form.branchId || null,
      address: form.address.trim() || null,
      notes: form.notes.trim() || null,
      image: form.image.trim() || null,
      loginEnabled: false,
    };

    try {
      setSubmitting(true);

      const response = await fetch("/api/admin/staff", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Unable to create staff member.");
      }

      setSuccess("Staff member created successfully.");

      setTimeout(() => {
        router.push("/admin/staff");
        router.refresh();
      }, 900);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while creating staff.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fffaf3] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <Link
            href="/admin/staff"
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-[#754426] hover:text-[#2b1b14]"
          >
            <span aria-hidden="true">←</span>
            Back to Staff
          </Link>

          <p className="mb-2 text-xs font-semibold tracking-[0.2em] text-[#a76535]">
            BREWB​ITES ADMIN
          </p>

          <h1 className="font-serif text-3xl font-bold text-[#2b1b14] sm:text-4xl">
            Create Staff Member
          </h1>

          <p className="mt-2 text-sm text-[#806d60]">
            Add a new staff record to your BrewBites administration system.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
          >
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="rounded-2xl border border-[#eee3d8] bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-[#2b1b14]">
                Personal Information
              </h2>
              <p className="mt-1 text-sm text-[#8b786b]">
                Basic contact and identity details.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className={labelClass}>
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  className={inputClass}
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="Enter full name"
                  required
                />
              </div>

              <div>
                <label className={labelClass}>Email Address</label>
                <input
                  type="email"
                  className={inputClass}
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="example@email.com"
                />
              </div>

              <div>
                <label className={labelClass}>
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  className={inputClass}
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="Enter phone number"
                  required
                />
              </div>

              <div>
                <label className={labelClass}>Profile Image URL</label>
                <input
                  type="url"
                  className={inputClass}
                  value={form.image}
                  onChange={(e) => updateField("image", e.target.value)}
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div className="sm:col-span-2">
                <label className={labelClass}>Address</label>
                <textarea
                  className={inputClass}
                  rows={3}
                  value={form.address}
                  onChange={(e) => updateField("address", e.target.value)}
                  placeholder="Enter complete address"
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[#eee3d8] bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-[#2b1b14]">
                Employment Details
              </h2>
              <p className="mt-1 text-sm text-[#8b786b]">
                Staff position, department and branch assignment.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className={labelClass}>
                  Designation <span className="text-red-500">*</span>
                </label>
                <input
                  className={inputClass}
                  value={form.designation}
                  onChange={(e) =>
                    updateField("designation", e.target.value)
                  }
                  placeholder="e.g. Barista, Manager"
                  required
                />
              </div>

              <div>
                <label className={labelClass}>Department</label>
                <input
                  className={inputClass}
                  value={form.department}
                  onChange={(e) =>
                    updateField("department", e.target.value)
                  }
                  placeholder="e.g. Operations, Kitchen"
                />
              </div>

              <div>
                <label className={labelClass}>Role</label>
                <input
                  className={inputClass}
                  value={form.role}
                  onChange={(e) => updateField("role", e.target.value)}
                  placeholder="Enter staff role"
                />
              </div>

              <div>
                <label className={labelClass}>Employment Type</label>
                <select
                  className={inputClass}
                  value={form.employmentType}
                  onChange={(e) =>
                    updateField("employmentType", e.target.value)
                  }
                >
                  <option value="FULL_TIME">Full Time</option>
                  <option value="PART_TIME">Part Time</option>
                  <option value="CONTRACT">Contract</option>
                  <option value="TEMPORARY">Temporary</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>
                  Joining Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  className={inputClass}
                  value={form.joiningDate}
                  onChange={(e) =>
                    updateField("joiningDate", e.target.value)
                  }
                  required
                />
              </div>

              <div>
                <label className={labelClass}>Base Salary (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputClass}
                  value={form.baseSalary}
                  onChange={(e) =>
                    updateField("baseSalary", e.target.value)
                  }
                  placeholder="Enter base salary"
                />
              </div>

              <div className="sm:col-span-2">
                <label className={labelClass}>Branch</label>
                <select
                  className={inputClass}
                  value={form.branchId}
                  onChange={(e) => updateField("branchId", e.target.value)}
                  disabled={loadingBranches}
                >
                  <option value="">
                    {loadingBranches
                      ? "Loading branches..."
                      : "No branch assigned"}
                  </option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[#eee3d8] bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-[#2b1b14]">
                Additional Notes
              </h2>
              <p className="mt-1 text-sm text-[#8b786b]">
                Optional internal information for administrators.
              </p>
            </div>

            <textarea
              className={inputClass}
              rows={4}
              value={form.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              placeholder="Add any relevant notes..."
            />
          </section>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/admin/staff"
              className="rounded-xl border border-[#e8ded3] px-6 py-3 text-center text-sm font-semibold text-[#604b3d] transition hover:bg-[#f8f3ed]"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-[#754426] px-7 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#5d351e] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Creating Staff..." : "Create Staff Member"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
