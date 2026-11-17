
"use client";

import { useEffect, useState } from "react";
import {
  Clock3,
  Globe2,
  Save,
  RefreshCw,
  CalendarCheck,
  Timer,
  ShieldCheck,
  Settings2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

type AttendanceSettings = {
  timezone: string;
  openingTime: string;
  closingTime: string;
  gracePeriodMinutes: number;
  halfDayHours: number;
  fullDayHours: number;
  overtimeEnabled: boolean;
  autoMarkAbsent: boolean;
};

const DEFAULT_SETTINGS: AttendanceSettings = {
  timezone: "Asia/Kolkata",
  openingTime: "09:00",
  closingTime: "21:00",
  gracePeriodMinutes: 10,
  halfDayHours: 4,
  fullDayHours: 8,
  overtimeEnabled: true,
  autoMarkAbsent: false,
};

export default function AttendanceSettingsPage() {
  const [settings, setSettings] =
    useState<AttendanceSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/admin/attendance/settings");

      if (!response.ok) {
        throw new Error("Unable to load attendance settings.");
      }

      const data = await response.json();

      setSettings({
        ...DEFAULT_SETTINGS,
        ...(data.settings ?? data),
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  function updateSetting<K extends keyof AttendanceSettings>(
    key: K,
    value: AttendanceSettings[K]
  ) {
    setSettings((previous) => ({
      ...previous,
      [key]: value,
    }));
    setSuccess("");
  }

  function validateSettings() {
    if (!settings.openingTime || !settings.closingTime) {
      return "Opening and closing times are required.";
    }

    if (settings.openingTime >= settings.closingTime) {
      return "Closing time must be later than opening time.";
    }

    if (
      settings.gracePeriodMinutes < 0 ||
      settings.gracePeriodMinutes > 180
    ) {
      return "Grace period must be between 0 and 180 minutes.";
    }

    if (
      settings.halfDayHours <= 0 ||
      settings.fullDayHours <= settings.halfDayHours
    ) {
      return "Full-day hours must be greater than half-day hours.";
    }

    return "";
  }

  async function saveSettings() {
    const validationError = validateSettings();

    if (validationError) {
      setError(validationError);
      setSuccess("");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await fetch("/api/admin/attendance/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to save settings.");
      }

      setSettings({
        ...DEFAULT_SETTINGS,
        ...(data.settings ?? data),
      });

      setSuccess("Attendance settings saved successfully.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  }

  function resetSettings() {
    setSettings(DEFAULT_SETTINGS);
    setError("");
    setSuccess("");
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <RefreshCw className="h-5 w-5 animate-spin" />
          Loading attendance settings...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-7">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-700">
              <Settings2 className="h-4 w-4" />
              Staff Management / Attendance
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
              Attendance Settings
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Configure working hours, attendance rules and overtime policies.
            </p>
          </div>

          <button
            onClick={fetchSettings}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {/* Feedback */}
        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            {error}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            {success}
          </div>
        )}

        {/* Timezone */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
              <Globe2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">
                Regional Settings
              </h2>
              <p className="text-sm text-slate-500">
                Set the timezone used for attendance calculations.
              </p>
            </div>
          </div>

          <div className="max-w-xl">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Timezone
            </label>
            <select
              value={settings.timezone}
              onChange={(e) => updateSetting("timezone", e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="Asia/Kolkata">
                India Standard Time (Asia/Kolkata)
              </option>
              <option value="UTC">UTC</option>
            </select>
            <p className="mt-2 text-xs text-slate-400">
              Recommended for Indian branches: Asia/Kolkata (IST).
            </p>
          </div>
        </section>

        {/* Working Hours */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-indigo-50 p-3 text-indigo-700">
              <Clock3 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">
                Working Hours
              </h2>
              <p className="text-sm text-slate-500">
                Define your branch's daily operating hours.
              </p>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Opening Time
              </label>
              <input
                type="time"
                value={settings.openingTime}
                onChange={(e) =>
                  updateSetting("openingTime", e.target.value)
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Closing Time
              </label>
              <input
                type="time"
                value={settings.closingTime}
                onChange={(e) =>
                  updateSetting("closingTime", e.target.value)
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
        </section>

        {/* Attendance Rules */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-amber-50 p-3 text-amber-700">
              <Timer className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">
                Attendance Rules
              </h2>
              <p className="text-sm text-slate-500">
                Configure late arrival and working-hour thresholds.
              </p>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Late Grace Period (minutes)
              </label>
              <input
                type="number"
                min="0"
                max="180"
                value={settings.gracePeriodMinutes}
                onChange={(e) =>
                  updateSetting(
                    "gracePeriodMinutes",
                    Number(e.target.value)
                  )
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <p className="mt-1 text-xs text-slate-400">
                Extra minutes allowed after opening time.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Half-Day Hours
              </label>
              <input
                type="number"
                min="1"
                step="0.5"
                value={settings.halfDayHours}
                onChange={(e) =>
                  updateSetting("halfDayHours", Number(e.target.value))
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Full-Day Hours
              </label>
              <input
                type="number"
                min="1"
                step="0.5"
                value={settings.fullDayHours}
                onChange={(e) =>
                  updateSetting("fullDayHours", Number(e.target.value))
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
        </section>

        {/* Automation */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-purple-50 p-3 text-purple-700">
              <CalendarCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">
                Attendance Automation
              </h2>
              <p className="text-sm text-slate-500">
                Enable or disable automatic attendance rules.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-slate-200 p-4">
              <div>
                <p className="font-medium text-slate-800">
                  Overtime Tracking
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Allow the system to calculate overtime from working hours.
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.overtimeEnabled}
                onChange={(e) =>
                  updateSetting("overtimeEnabled", e.target.checked)
                }
                className="mt-1 h-5 w-5 accent-blue-700"
              />
            </label>

            <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-slate-200 p-4">
              <div>
                <p className="font-medium text-slate-800">
                  Automatic Absent Marking
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Automatically mark staff absent when no attendance is recorded.
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.autoMarkAbsent}
                onChange={(e) =>
                  updateSetting("autoMarkAbsent", e.target.checked)
                }
                className="mt-1 h-5 w-5 accent-blue-700"
              />
            </label>
          </div>

          <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            Automatic absent marking should run through a scheduled backend
            process. Saving this setting alone does not create that schedule.
          </div>
        </section>

        {/* Footer Actions */}
        <div className="flex flex-col-reverse justify-between gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center">
          <button
            onClick={resetSettings}
            disabled={saving}
            className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Reset to Defaults
          </button>

          <button
            onClick={saveSettings}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
