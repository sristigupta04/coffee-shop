"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type AuditLog = {
  id: string;
  staffId?: string | null;
  actorUserId?: string | null;
  actorStaffId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  description?: string | null;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  staff?: { name: string } | null;
  actorStaff?: { name: string } | null;
  actorUser?: { name: string; email?: string | null } | null;
};

const dateTime = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));

const actionStyle = (action: string) => {
  const value = action.toUpperCase();

  if (value.includes("DELETE"))
    return "bg-red-50 text-red-700";
  if (value.includes("CREATE"))
    return "bg-green-50 text-green-700";
  if (value.includes("UPDATE"))
    return "bg-blue-50 text-blue-700";

  return "bg-gray-100 text-gray-700";
};

export default function StaffAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("ALL");
  const [entity, setEntity] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (action !== "ALL") params.set("action", action);
      if (entity !== "ALL") params.set("entity", entity);

      const response = await fetch(
        `/api/admin/staff/audit-logs?${params.toString()}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load audit logs.");
      }

      setLogs(data.logs ?? data.data ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, action, entity]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = logs.filter((log) => {
    const query = search.toLowerCase();

    const actor =
      log.actorStaff?.name ||
      log.actorUser?.name ||
      log.actorUser?.email ||
      log.actorUserId ||
      "System";

    return (
      log.action.toLowerCase().includes(query) ||
      log.entity.toLowerCase().includes(query) ||
      (log.description || "").toLowerCase().includes(query) ||
      actor.toLowerCase().includes(query) ||
      (log.staff?.name || "").toLowerCase().includes(query)
    );
  });

  const exportCSV = () => {
    const headers = [
      "Date",
      "Action",
      "Entity",
      "Entity ID",
      "Performed By",
      "Affected Staff",
      "Description",
      "IP Address",
    ];

    const rows = filteredLogs.map((log) => [
      dateTime(log.createdAt),
      log.action,
      log.entity,
      log.entityId || "",
      log.actorStaff?.name ||
        log.actorUser?.name ||
        log.actorUser?.email ||
        log.actorUserId ||
        "System",
      log.staff?.name || "",
      log.description || "",
      log.ipAddress || "",
    ]);

    const escapeCSV = (value: unknown) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCSV).join(","))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "staff-audit-logs.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const actorName = (log: AuditLog) =>
    log.actorStaff?.name ||
    log.actorUser?.name ||
    log.actorUser?.email ||
    log.actorUserId ||
    "System";

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <Link
            href="/admin/staff/reports"
            className="text-sm text-gray-500 hover:text-blue-600"
          >
            Staff Reports
          </Link>

          <h1 className="mt-2 text-2xl font-bold text-gray-900">
            Staff Audit Logs
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Track staff management activities and record changes.
          </p>
        </div>

        <button
          onClick={exportCSV}
          disabled={!filteredLogs.length}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Export CSV
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="grid gap-4 rounded-xl border border-gray-200 bg-white p-5 md:grid-cols-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            From Date
          </label>
          <input
            type="date"
            value={startDate}
            max={endDate || undefined}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            To Date
          </label>
          <input
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Action
          </label>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
          >
            <option value="ALL">All Actions</option>
            <option value="CREATE">Create</option>
            <option value="UPDATE">Update</option>
            <option value="DELETE">Delete</option>
            <option value="APPROVE">Approve</option>
            <option value="REJECT">Reject</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Entity
          </label>
          <select
            value={entity}
            onChange={(e) => setEntity(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
          >
            <option value="ALL">All Entities</option>
            <option value="STAFF">Staff</option>
            <option value="ATTENDANCE">Attendance</option>
            <option value="SHIFT">Shift</option>
            <option value="LEAVE">Leave</option>
            <option value="PAYROLL">Payroll</option>
            <option value="DOCUMENT">Document</option>
            <option value="PERFORMANCE">Performance</option>
          </select>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 p-4">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search action, staff, entity or description..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
          />
          <p className="mt-2 text-xs text-gray-500">
            {filteredLogs.length} audit records
          </p>
        </div>

        {loading ? (
          <p className="p-10 text-center text-sm text-gray-500">
            Loading audit logs...
          </p>
        ) : filteredLogs.length === 0 ? (
          <p className="p-10 text-center text-sm text-gray-500">
            No audit records found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-5 py-3">Date & Time</th>
                  <th className="px-5 py-3">Action</th>
                  <th className="px-5 py-3">Entity</th>
                  <th className="px-5 py-3">Performed By</th>
                  <th className="px-5 py-3">Affected Staff</th>
                  <th className="px-5 py-3">Description</th>
                  <th className="px-5 py-3">Details</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-5 py-4 text-gray-600">
                      {dateTime(log.createdAt)}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${actionStyle(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>

                    <td className="px-5 py-4 font-medium text-gray-700">
                      {log.entity}
                    </td>

                    <td className="px-5 py-4 text-gray-700">
                      {actorName(log)}
                    </td>

                    <td className="px-5 py-4 text-gray-700">
                      {log.staff?.name || "—"}
                    </td>

                    <td className="max-w-xs px-5 py-4 text-gray-600">
                      <p className="line-clamp-2">
                        {log.description || "—"}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="font-medium text-blue-600 hover:text-blue-800"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedLog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-bold text-gray-900">
                Audit Record Details
              </h2>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-xl text-gray-500 hover:text-gray-900"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-gray-500">Action</p>
                <p className="mt-1 font-medium">{selectedLog.action}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Entity</p>
                <p className="mt-1 font-medium">{selectedLog.entity}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Performed By</p>
                <p className="mt-1 font-medium">{actorName(selectedLog)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Affected Staff</p>
                <p className="mt-1 font-medium">
                  {selectedLog.staff?.name || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Date & Time (IST)</p>
                <p className="mt-1 font-medium">
                  {dateTime(selectedLog.createdAt)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">IP Address</p>
                <p className="mt-1 font-medium">
                  {selectedLog.ipAddress || "—"}
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-gray-500">Description</p>
                <p className="mt-1 text-sm text-gray-800">
                  {selectedLog.description || "—"}
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <h3 className="mb-2 font-semibold text-gray-900">
                  Previous Values
                </h3>
                <pre className="overflow-x-auto rounded-lg bg-gray-50 p-4 text-xs text-gray-700">
                  {selectedLog.oldValues
                    ? JSON.stringify(selectedLog.oldValues, null, 2)
                    : "No previous values"}
                </pre>
              </div>

              <div>
                <h3 className="mb-2 font-semibold text-gray-900">
                  New Values
                </h3>
                <pre className="overflow-x-auto rounded-lg bg-gray-50 p-4 text-xs text-gray-700">
                  {selectedLog.newValues
                    ? JSON.stringify(selectedLog.newValues, null, 2)
                    : "No new values"}
                </pre>
              </div>

              <div>
                <h3 className="mb-2 font-semibold text-gray-900">
                  User Agent
                </h3>
                <p className="break-all text-xs text-gray-600">
                  {selectedLog.userAgent || "—"}
                </p>
              </div>
            </div>

            <button
              onClick={() => setSelectedLog(null)}
              className="mt-6 w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}