"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

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

const initialForm: ShiftForm = {
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

export default function EditShiftPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [form, setForm] = useState<ShiftForm>(initialForm);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchData = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError("");

      const [shiftResponse, branchResponse] = await Promise.all([
        fetch(`/api/admin/staff/shifts/${id}`),
        fetch("/api/admin/branches"),
      ]);

      const [shiftData, branchData] = await Promise.all([
        shiftResponse.json(),
        branchResponse.json(),
      ]);

      if (!shiftResponse.ok) {
        throw new Error(
          shiftData.message || "Unable to load shift details."
        );
      }

      if (!branchResponse.ok) {
        throw new Error(
          branchData.message || "Unable to load branches."
        );
      }

      const shift = shiftData.shift ?? shiftData;

      setForm({
        name: shift.name ?? "",
        description: shift.description ?? "",
        startTime: shift.startTime ?? "09:00",
        endTime: shift.endTime ?? "17:00",
        breakDurationMinutes: shift.breakDurationMinutes ?? 30,
        gracePeriodMinutes: shift.gracePeriodMinutes ?? 10,
        isOvernight: shift.isOvernight ?? false,
        isActive: shift.isActive ?? true,
        branchId: shift.branchId ?? shift.branch?.id ?? "",
      });

      setBranches(branchData.branches ?? branchData.data ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateField = <K extends keyof ShiftForm>(
    field: K,
    value: ShiftForm[K]
  ) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const calculateDuration = () => {
    const [startHour, startMinute] = form.startTime.split(":").map(Number);
    const [endHour, endMinute] = form.endTime.split(":").map(Number);

    if (
      !Number.isFinite(startHour) ||
      !Number.isFinite(startMinute) ||
      !Number.isFinite(endHour) ||
      !Number.isFinite(endMinute)
    ) {
      return null;
    }

    const start = startHour * 60 + startMinute;
    let end = endHour * 60 + endMinute;

    if (form.isOvernight || end <= start) {
      end += 24 * 60;
    }

    const duration = end - start - form.breakDurationMinutes;

    if (duration <= 0) return null;

    return {
      hours: Math.floor(duration / 60),
      minutes: duration % 60,
    };
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!form.name.trim()) {
      setError("Shift name is required.");
      return;
    }

    if (!form.startTime || !form.endTime) {
      setError("Start time and end time are required.");
      return;
    }

    if (
      !Number.isInteger(form.breakDurationMinutes) ||
      form.breakDurationMinutes < 0
    ) {
      setError("Enter a valid break duration.");
      return;
    }

    if (
      !Number.isInteger(form.gracePeriodMinutes) ||
      form.gracePeriodMinutes < 0
    ) {
      setError("Enter a valid grace period.");
      return;
    }

    if (!calculateDuration()) {
      setError(
        "Invalid shift duration. Check the timings and break duration."
      );
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(`/api/admin/staff/shifts/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || null,
          startTime: form.startTime,
          endTime: form.endTime,
          breakDurationMinutes: form.breakDurationMinutes,
          gracePeriodMinutes: form.gracePeriodMinutes,
          isOvernight: form.isOvernight,
          isActive: form.isActive,
          branchId: form.branchId || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to update shift.");
      }

      setSuccess("Shift updated successfully.");

      router.push(`/admin/staff/shifts/${id}`);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update shift."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="mt-3 text-sm text-gray-500">
            Loading shift...
          </p>
        </div>
      </div>
    );
  }

  if (error && !form.name) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <p className="font-semibold text-red-700">
          Unable to load shift
        </p>
        <p className="mt-1 text-sm text-red-600">{error}</p>

        <div className="mt-4 flex gap-3">
          <button
            onClick={fetchData}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white"
          >
            Retry
          </button>
          <Link
            href={`/admin/staff/shifts/${id}`}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
          >
            Back
          </Link>
        </div>
      </div>
    );
  }

  const duration = calculateDuration();

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-10">
      {/* Header */}
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-gray-500">
          <Link href="/admin/staff" className="hover:text-blue-600">
            Staff
          </Link>
          <span>/</span>
          <Link
            href="/admin/staff/shifts"
            className="hover:text-blue-600"
          >
            Shifts
          </Link>
          <span>/</span>
          <Link
            href={`/admin/staff/shifts/${id}`}
            className="hover:text-blue-600"
          >
            Details
          </Link>
          <span>/</span>
          <span className="text-gray-800">Edit</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-900">
          Edit Shift
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Update shift timings, branch and configuration.
        </p>
      </div>

      {/* Error / success */}
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

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic details */}
        <section className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Basic Information
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            General information about this shift.
          </p>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Shift Name *
              </label>
              <input
                required
                value={form.name}
                onChange={(event) =>
                  updateField("name", event.target.value)
                }
                placeholder="e.g. Morning Shift"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(event) =>
                  updateField("description", event.target.value)
                }
                placeholder="Describe this shift..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Branch
              </label>
              <select
                value={form.branchId}
                onChange={(event) =>
                  updateField("branchId", event.target.value)
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              >
                <option value="">All branches</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Timing */}
        <section className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Shift Timing
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Configure start time, end time and break duration.
          </p>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Start Time *
              </label>
              <input
                type="time"
                required
                value={form.startTime}
                onChange={(event) =>
                  updateField("startTime", event.target.value)
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                End Time *
              </label>
              <input
                type="time"
                required
                value={form.endTime}
                onChange={(event) =>
                  updateField("endTime", event.target.value)
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Break Duration (minutes)
              </label>
              <input
                type="number"
                min="0"
                value={form.breakDurationMinutes}
                onChange={(event) =>
                  updateField(
                    "breakDurationMinutes",
                    Number(event.target.value)
                  )
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Grace Period (minutes)
              </label>
              <input
                type="number"
                min="0"
                value={form.gracePeriodMinutes}
                onChange={(event) =>
                  updateField(
                    "gracePeriodMinutes",
                    Number(event.target.value)
                  )
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
              />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-blue-50 p-4">
            <div>
              <p className="text-sm font-semibold text-blue-900">
                Estimated Working Duration
              </p>
              <p className="mt-1 text-xs text-blue-700">
                Total duration minus break time
              </p>
            </div>
            <p className="text-xl font-bold text-blue-900">
              {duration
                ? `${duration.hours}h ${duration.minutes}m`
                : "Invalid timing"}
            </p>
          </div>

          <label className="mt-5 flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={form.isOvernight}
              onChange={(event) =>
                updateField("isOvernight", event.target.checked)
              }
              className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600"
            />
            <span>
              <span className="block text-sm font-medium text-gray-800">
                Overnight Shift
              </span>
              <span className="mt-1 block text-xs text-gray-500">
                Enable when the shift continues past midnight.
              </span>
            </span>
          </label>
        </section>

        {/* Status */}
        <section className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Shift Status
          </h2>

          <label className="mt-4 flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) =>
                updateField("isActive", event.target.checked)
              }
              className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600"
            />
            <span>
              <span className="block text-sm font-medium text-gray-800">
                Active Shift
              </span>
              <span className="mt-1 block text-xs text-gray-500">
                Inactive shifts should not be available for new assignments.
              </span>
            </span>
          </label>
        </section>

        {/* Actions */}
        <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
          <Link
            href={`/admin/staff/shifts/${id}`}
            className="rounded-lg border border-gray-300 px-5 py-2.5 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving Changes..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}