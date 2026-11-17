
"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Clock3,
  Save,
  RefreshCw,
  Building2,
  CalendarClock,
  AlertCircle,
  CheckCircle2,
  Coffee,
} from "lucide-react";

type Branch = {
  id: string;
  name: string;
};

type ShiftForm = {
  name: string;
  description: string;
  startTime: string;
  endTime: string;
  breakDurationMinutes: number;
  gracePeriodMinutes: number;
  isOvernight: boolean;
  isActive: boolean;
  branchId: string;
};

const INITIAL_FORM: ShiftForm = {
  name: "",
  description: "",
  startTime: "09:00",
  endTime: "17:00",
  breakDurationMinutes: 30,
  gracePeriodMinutes: 10,
  isOvernight: false,
  isActive: true,
  branchId: "",
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

const labelClass = "mb-2 block text-sm font-medium text-slate-700";

function getShiftDuration(form: ShiftForm) {
  const [startHour, startMinute] = form.startTime.split(":").map(Number);
  const [endHour, endMinute] = form.endTime.split(":").map(Number);

  let start = startHour * 60 + startMinute;
  let end = endHour * 60 + endMinute;

  if (form.isOvernight && end <= start) {
    end += 24 * 60;
  }

  if (!form.isOvernight && end <= start) {
    return "Invalid timing";
  }

  const totalMinutes = Math.max(
    0,
    end - start - form.breakDurationMinutes
  );

  return `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
}

export default function CreateShiftPage() {
  const router = useRouter();

  const [form, setForm] = useState<ShiftForm>(INITIAL_FORM);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchBranches() {
      try {
        const response = await fetch("/api/admin/branches");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to load branches.");
        }

        setBranches(
          Array.isArray(data)
            ? data
            : data.branches ?? data.data ?? []
        );
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unable to load branches."
        );
      } finally {
        setLoadingBranches(false);
      }
    }

    fetchBranches();
  }, []);

  function updateField<K extends keyof ShiftForm>(
    key: K,
    value: ShiftForm[K]
  ) {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  function validateForm() {
    if (!form.name.trim()) {
      return "Shift name is required.";
    }

    if (!form.startTime || !form.endTime) {
      return "Start time and end time are required.";
    }

    if (
      !form.isOvernight &&
      form.endTime <= form.startTime
    ) {
      return "End time must be later than start time. Enable overnight for night shifts.";
    }

    if (
      form.breakDurationMinutes < 0 ||
      form.breakDurationMinutes > 480
    ) {
      return "Break duration must be between 0 and 480 minutes.";
    }

    if (
      form.gracePeriodMinutes < 0 ||
      form.gracePeriodMinutes > 180
    ) {
      return "Grace period must be between 0 and 180 minutes.";
    }

    const [startHour, startMinute] = form.startTime.split(":").map(Number);
    const [endHour, endMinute] = form.endTime.split(":").map(Number);

    let start = startHour * 60 + startMinute;
    let end = endHour * 60 + endMinute;

    if (form.isOvernight && end <= start) {
      end += 24 * 60;
    }

    if (end - start <= form.breakDurationMinutes) {
      return "Break duration must be shorter than the total shift duration.";
    }

    return "";
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);

      const payload = {
        ...form,
        name: form.name.trim(),
        description: form.description.trim() || null,
        branchId: form.branchId || null,
      };

      const response = await fetch("/api/admin/staff/shifts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create shift.");
      }

      const createdShift = data.shift ?? data;

      if (createdShift.id) {
        router.push(`/admin/staff/shifts/${createdShift.id}`);
      } else {
        router.push("/admin/staff/shifts");
      }

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setForm(INITIAL_FORM);
    setError("");
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-7">
      <div className="mx-auto max-w-4xl space-y-6">
        <Link
          href="/admin/staff/shifts"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Shift Management
        </Link>

        <div>
          <p className="mb-2 text-sm font-medium text-blue-700">
            Staff Management / Shifts / Create
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            Create New Shift
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Configure a reusable work shift for your employees.
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="h-5 w-5 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Details */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
                <CalendarClock className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">
                  Basic Shift Details
                </h2>
                <p className="text-sm text-slate-500">
                  Name and description of the shift
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className={labelClass}>
                  Shift Name <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="e.g. Morning Shift"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Description</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    updateField("description", e.target.value)
                  }
                  placeholder="Describe this shift..."
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          {/* Timing */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-xl bg-indigo-50 p-3 text-indigo-700">
                <Clock3 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">
                  Shift Timing
                </h2>
                <p className="text-sm text-slate-500">
                  Set start and end time
                </p>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Start Time *</label>
                <input
                  required
                  type="time"
                  value={form.startTime}
                  onChange={(e) =>
                    updateField("startTime", e.target.value)
                  }
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>End Time *</label>
                <input
                  required
                  type="time"
                  value={form.endTime}
                  onChange={(e) =>
                    updateField("endTime", e.target.value)
                  }
                  className={inputClass}
                />
              </div>
            </div>

            <label className="mt-5 flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200 p-4">
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Overnight Shift
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Enable when the shift continues past midnight.
                </p>
              </div>
              <input
                type="checkbox"
                checked={form.isOvernight}
                onChange={(e) =>
                  updateField("isOvernight", e.target.checked)
                }
                className="h-5 w-5 accent-blue-700"
              />
            </label>

            <div className="mt-5 rounded-xl bg-blue-50 p-4">
              <p className="text-xs font-medium text-blue-700">
                Estimated Working Duration
              </p>
              <p className="mt-1 text-2xl font-bold text-blue-900">
                {getShiftDuration(form)}
              </p>
              <p className="mt-1 text-xs text-blue-700">
                Break duration is deducted from total shift time.
              </p>
            </div>
          </section>

          {/* Rules */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-xl bg-amber-50 p-3 text-amber-700">
                <Coffee className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">
                  Shift Rules
                </h2>
                <p className="text-sm text-slate-500">
                  Configure break and late arrival allowance
                </p>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className={labelClass}>
                  Break Duration (minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  max="480"
                  value={form.breakDurationMinutes}
                  onChange={(e) =>
                    updateField(
                      "breakDurationMinutes",
                      Number(e.target.value)
                    )
                  }
                  className={inputClass}
                />
                <p className="mt-1 text-xs text-slate-400">
                  Default break allowance for this shift.
                </p>
              </div>

              <div>
                <label className={labelClass}>
                  Grace Period (minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  max="180"
                  value={form.gracePeriodMinutes}
                  onChange={(e) =>
                    updateField(
                      "gracePeriodMinutes",
                      Number(e.target.value)
                    )
                  }
                  className={inputClass}
                />
                <p className="mt-1 text-xs text-slate-400">
                  Late arrival allowance after shift start.
                </p>
              </div>
            </div>
          </section>

          {/* Branch & Status */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-xl bg-green-50 p-3 text-green-700">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">
                  Branch & Status
                </h2>
                <p className="text-sm text-slate-500">
                  Assign the shift to a branch
                </p>
              </div>
            </div>

            <div>
              <label className={labelClass}>Branch</label>
              <select
                value={form.branchId}
                onChange={(e) => updateField("branchId", e.target.value)}
                disabled={loadingBranches}
                className={inputClass}
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

            <label className="mt-5 flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200 p-4">
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Active Shift
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Active shifts can be assigned to employees.
                </p>
              </div>
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) =>
                  updateField("isActive", e.target.checked)
                }
                className="h-5 w-5 accent-blue-700"
              />
            </label>
          </section>

          {/* Actions */}
          <div className="flex flex-col-reverse justify-between gap-3 border-t border-slate-200 pt-5 sm:flex-row">
            <button
              type="button"
              onClick={resetForm}
              disabled={saving}
              className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Reset Form
            </button>

            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <Link
                href="/admin/staff/shifts"
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saving ? "Creating Shift..." : "Create Shift"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
