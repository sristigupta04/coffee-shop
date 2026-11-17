
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  Upload,
  Search,
  RefreshCw,
  Eye,
  Trash2,
  X,
  Download,
  Calendar,
  User,
  AlertCircle,
} from "lucide-react";

type Staff = {
  id: string;
  name: string;
  email?: string | null;
  designation?: string | null;
  department?: string | null;
};

type StaffDocument = {
  id: string;
  staffId: string;
  name: string;
  type: string;
  fileUrl: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
  expiryDate?: string | null;
  description?: string | null;
  uploadedAt: string;
  staff?: Staff | null;
};

const DOCUMENT_TYPES = [
  "IDENTITY",
  "ADDRESS",
  "EDUCATION",
  "EXPERIENCE",
  "CONTRACT",
  "CERTIFICATE",
  "OTHER",
];

const formatDate = (value?: string | null) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(date);
};

const formatFileSize = (bytes?: number | null) => {
  if (!bytes || bytes <= 0) return "—";

  if (bytes < 1024) return `${bytes} B`;

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const getDocumentTypeLabel = (type: string) =>
  type
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function StaffDocumentsPage() {
  const [documents, setDocuments] = useState<StaffDocument[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [staffFilter, setStaffFilter] = useState("ALL");

  const [showUploadModal, setShowUploadModal] = useState(false);

  const [form, setForm] = useState({
    staffId: "",
    name: "",
    type: "IDENTITY",
    description: "",
    expiryDate: "",
    file: null as File | null,
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [documentsResponse, staffResponse] = await Promise.all([
        fetch("/api/admin/staff/documents", {
          cache: "no-store",
        }),
        fetch("/api/admin/staff?status=active", {
          cache: "no-store",
        }),
      ]);

      const [documentsData, staffData] = await Promise.all([
        documentsResponse.json(),
        staffResponse.json(),
      ]);

      if (!documentsResponse.ok) {
        throw new Error(
          documentsData.message || "Unable to load staff documents."
        );
      }

      if (!staffResponse.ok) {
        throw new Error(staffData.message || "Unable to load staff.");
      }

      const documentList =
        documentsData.documents ??
        documentsData.data ??
        [];

      const staffList =
        staffData.staff ??
        staffData.data ??
        [];

      setDocuments(
        Array.isArray(documentList) ? documentList : []
      );

      setStaff(
        Array.isArray(staffList) ? staffList : []
      );
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
    fetchData();
  }, [fetchData]);

  const filteredDocuments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return documents.filter((document) => {
      const staffName = document.staff?.name || "";

      const matchesSearch =
        !query ||
        document.name.toLowerCase().includes(query) ||
        staffName.toLowerCase().includes(query) ||
        (document.description || "").toLowerCase().includes(query);

      const matchesType =
        typeFilter === "ALL" || document.type === typeFilter;

      const matchesStaff =
        staffFilter === "ALL" || document.staffId === staffFilter;

      return matchesSearch && matchesType && matchesStaff;
    });
  }, [documents, search, typeFilter, staffFilter]);

  const stats = useMemo(() => {
    const now = new Date();

    return {
      total: documents.length,
      staffCount: new Set(documents.map((item) => item.staffId)).size,
      expiring: documents.filter((item) => {
        if (!item.expiryDate) return false;

        const expiry = new Date(item.expiryDate);
        const difference =
          expiry.getTime() - now.getTime();

        return (
          !Number.isNaN(expiry.getTime()) &&
          difference >= 0 &&
          difference <= 30 * 24 * 60 * 60 * 1000
        );
      }).length,
      expired: documents.filter((item) => {
        if (!item.expiryDate) return false;

        const expiry = new Date(item.expiryDate);

        return (
          !Number.isNaN(expiry.getTime()) &&
          expiry.getTime() < now.getTime()
        );
      }).length,
    };
  }, [documents]);

  const resetForm = () => {
    setForm({
      staffId: "",
      name: "",
      type: "IDENTITY",
      description: "",
      expiryDate: "",
      file: null,
    });
  };

  const uploadDocument = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!form.staffId) {
      setError("Please select a staff member.");
      return;
    }

    if (!form.name.trim()) {
      setError("Please enter a document name.");
      return;
    }

    if (!form.file) {
      setError("Please select a file.");
      return;
    }

    try {
      setUploading(true);
      setError("");
      setSuccess("");

      const formData = new FormData();

      formData.append("staffId", form.staffId);
      formData.append("name", form.name.trim());
      formData.append("type", form.type);
      formData.append("description", form.description.trim());

      if (form.expiryDate) {
        formData.append("expiryDate", form.expiryDate);
      }

      formData.append("file", form.file);

      const response = await fetch(
        "/api/admin/staff/documents",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to upload document."
        );
      }

      setShowUploadModal(false);
      resetForm();

      setSuccess("Document uploaded successfully.");

      await fetchData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to upload document."
      );
    } finally {
      setUploading(false);
    }
  };

  const deleteDocument = async (document: StaffDocument) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${document.name}"?`
    );

    if (!confirmed) return;

    try {
      setDeletingId(document.id);
      setError("");
      setSuccess("");

      const response = await fetch(
        `/api/admin/staff/documents/${document.id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to delete document."
        );
      }

      setDocuments((previous) =>
        previous.filter((item) => item.id !== document.id)
      );

      setSuccess("Document deleted successfully.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete document."
      );
    } finally {
      setDeletingId(null);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setTypeFilter("ALL");
    setStaffFilter("ALL");
  };

  return (
    <div className="min-h-screen space-y-6 bg-[#fffaf3] p-4 pb-10 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
            <Link
              href="/admin/staff"
              className="hover:text-[#754426]"
            >
              Staff
            </Link>
            <span>/</span>
            <span className="text-[#2B1B14]">Documents</span>
          </div>

          <h1 className="text-2xl font-bold text-[#2B1B14] sm:text-3xl">
            Staff Documents
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Manage staff identity, education, contracts and other documents.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-[#d8c9b9] bg-white px-4 py-2.5 text-sm font-medium text-[#754426] hover:bg-[#f8f3ed] disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => {
              setError("");
              setSuccess("");
              setShowUploadModal(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-[#754426] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#5f351c]"
          >
            <Upload size={17} />
            Upload Document
          </button>
        </div>
      </div>

      {/* Feedback */}
      {error && (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <div className="flex items-center gap-2">
            <AlertCircle size={17} />
            {error}
          </div>

          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          <span>{success}</span>
          <button
            type="button"
            onClick={() => setSuccess("")}
            aria-label="Dismiss success"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[
          {
            label: "Total Documents",
            value: stats.total,
            icon: FileText,
          },
          {
            label: "Staff Members",
            value: stats.staffCount,
            icon: User,
          },
          {
            label: "Expiring in 30 Days",
            value: stats.expiring,
            icon: Calendar,
          },
          {
            label: "Expired Documents",
            value: stats.expired,
            icon: AlertCircle,
          },
        ].map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.label}
              className="rounded-xl border border-[#eadfd2] bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-gray-500">
                    {item.label}
                  </p>
                  <p className="mt-2 text-2xl font-bold text-[#2B1B14]">
                    {item.value}
                  </p>
                </div>

                <div className="rounded-xl bg-[#f8f3ed] p-3 text-[#754426]">
                  <Icon size={21} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <section className="rounded-xl border border-[#eadfd2] bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-2 font-semibold text-[#2B1B14]">
          <Search size={17} />
          Search and filters
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search document or staff..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#754426]"
          />

          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#754426]"
          >
            <option value="ALL">All document types</option>
            {DOCUMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {getDocumentTypeLabel(type)}
              </option>
            ))}
          </select>

          <select
            value={staffFilter}
            onChange={(event) => setStaffFilter(event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#754426]"
          >
            <option value="ALL">All staff members</option>
            {staff.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </div>

        {(search || typeFilter !== "ALL" || staffFilter !== "ALL") && (
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs text-gray-500">
              {filteredDocuments.length} matching document(s)
            </p>

            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-semibold text-[#754426] hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}
      </section>

      {/* Documents Table */}
      <section className="overflow-hidden rounded-xl border border-[#eadfd2] bg-white shadow-sm">
        <div className="border-b border-gray-100 p-5">
          <h2 className="font-semibold text-[#2B1B14]">
            Document Records
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {filteredDocuments.length} document(s) found
          </p>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-gray-500">
            Loading documents...
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="p-12 text-center">
            <FileText
              size={40}
              className="mx-auto text-gray-300"
            />
            <h3 className="mt-3 font-semibold text-[#2B1B14]">
              No documents found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Upload a document or change your filters.
            </p>
            <button
              type="button"
              onClick={() => setShowUploadModal(true)}
              className="mt-4 rounded-lg bg-[#754426] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5f351c]"
            >
              Upload Document
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-[#f8f3ed] text-xs uppercase text-gray-600">
                <tr>
                  <th className="px-5 py-3 font-semibold">Document</th>
                  <th className="px-5 py-3 font-semibold">Staff Member</th>
                  <th className="px-5 py-3 font-semibold">Type</th>
                  <th className="px-5 py-3 font-semibold">Expiry Date</th>
                  <th className="px-5 py-3 font-semibold">Uploaded</th>
                  <th className="px-5 py-3 font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredDocuments.map((document) => {
                  const expired =
                    Boolean(document.expiryDate) &&
                    new Date(document.expiryDate!).getTime() < Date.now();

                  return (
                    <tr
                      key={document.id}
                      className="hover:bg-[#fffaf3]"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-[#f8f3ed] p-2 text-[#754426]">
                            <FileText size={19} />
                          </div>

                          <div>
                            <p className="font-semibold text-gray-900">
                              {document.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatFileSize(document.sizeBytes)}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-800">
                          {document.staff?.name || "Unknown staff"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {document.staff?.designation ||
                            document.staff?.department ||
                            ""}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-gray-700">
                        {getDocumentTypeLabel(document.type)}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={
                            expired
                              ? "font-medium text-red-600"
                              : "text-gray-700"
                          }
                        >
                          {formatDate(document.expiryDate)}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        {formatDate(document.uploadedAt)}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <a
                            href={document.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="View document"
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Eye size={17} />
                          </a>

                          <a
                            href={document.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            title="Download document"
                            className="text-[#754426] hover:text-[#5f351c]"
                          >
                            <Download size={17} />
                          </a>

                          <button
                            type="button"
                            onClick={() => deleteDocument(document)}
                            disabled={deletingId === document.id}
                            title="Delete document"
                            className="text-red-600 hover:text-red-800 disabled:opacity-50"
                          >
                            {deletingId === document.id ? (
                              <RefreshCw
                                size={17}
                                className="animate-spin"
                              />
                            ) : (
                              <Trash2 size={17} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <form
            onSubmit={uploadDocument}
            className="my-8 w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#2B1B14]">
                  Upload Staff Document
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Add a document to a staff member's record.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (uploading) return;
                  setShowUploadModal(false);
                  resetForm();
                }}
                disabled={uploading}
                className="text-gray-400 hover:text-gray-700 disabled:opacity-40"
                aria-label="Close modal"
              >
                <X size={22} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Staff Member *
                </label>
                <select
                  required
                  value={form.staffId}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      staffId: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                >
                  <option value="">Select staff member</option>
                  {staff.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Document Name *
                </label>
                <input
                  required
                  value={form.name}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      name: event.target.value,
                    }))
                  }
                  placeholder="e.g. Aadhaar Card"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Document Type *
                </label>
                <select
                  required
                  value={form.type}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      type: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                >
                  {DOCUMENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {getDocumentTypeLabel(type)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Document File *
                </label>
                <input
                  type="file"
                  required
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      file: event.target.files?.[0] || null,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Supported: PDF, JPG, PNG, DOC and DOCX.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Expiry Date
                </label>
                <input
                  type="date"
                  value={form.expiryDate}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      expiryDate: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Optional notes about this document..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={uploading}
                onClick={() => {
                  setShowUploadModal(false);
                  resetForm();
                }}
                className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={uploading}
                className="inline-flex items-center gap-2 rounded-lg bg-[#754426] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#5f351c] disabled:opacity-50"
              >
                <Upload size={16} />
                {uploading ? "Uploading..." : "Upload Document"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
