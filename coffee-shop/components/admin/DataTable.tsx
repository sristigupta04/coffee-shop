
"use client";

import {
  useMemo,
  useState,
  type ReactNode,
  type Key,
} from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Search,
  Table2,
} from "lucide-react";

export type DataTableColumn<T> = {
  key: keyof T;
  header: string;
  sortable?: boolean;
  className?: string;
  render?: (row: T) => ReactNode;
};

type DataTableProps<T> = {
  data: T[];
  columns: DataTableColumn<T>[];
  rowKey: (row: T) => Key;
  searchable?: boolean;
  searchPlaceholder?: string;
  pageSize?: number;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  rowActions?: (row: T) => ReactNode;
};

export default function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  rowKey,
  searchable = true,
  searchPlaceholder = "Search records...",
  pageSize = 10,
  loading = false,
  emptyTitle = "No records found",
  emptyDescription = "There are no records to display right now.",
  rowActions,
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<keyof T | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const filteredData = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    let result = data.filter((row) => {
      if (!normalizedQuery) return true;

      return columns.some((column) => {
        const value = row[column.key];

        if (value === null || value === undefined) return false;

        return String(value).toLowerCase().includes(normalizedQuery);
      });
    });

    if (sortKey) {
      result = [...result].sort((a, b) => {
        const first = a[sortKey];
        const second = b[sortKey];

        if (first === null || first === undefined) return 1;
        if (second === null || second === undefined) return -1;

        let comparison = 0;

        if (typeof first === "number" && typeof second === "number") {
          comparison = first - second;
        } else {
          comparison = String(first).localeCompare(String(second), undefined, {
            numeric: true,
            sensitivity: "base",
          });
        }

        return sortDirection === "asc" ? comparison : -comparison;
      });
    }

    return result;
  }, [data, columns, query, sortKey, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));

  const currentPage = Math.min(page, totalPages);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const handleSort = (key: keyof T) => {
    if (sortKey === key) {
      setSortDirection((previous) =>
        previous === "asc" ? "desc" : "asc"
      );
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }

    setPage(1);
  };

  const handleSearch = (value: string) => {
    setQuery(value);
    setPage(1);
  };

  const renderCell = (row: T, column: DataTableColumn<T>) => {
    if (column.render) return column.render(row);

    const value = row[column.key];

    if (value === null || value === undefined || value === "") {
      return <span className="text-[#A18B7C]">—</span>;
    }

    return String(value);
  };

  return (
    <section className="w-full overflow-hidden rounded-2xl border border-[#EADED4] bg-white shadow-sm">
      {/* Search */}
      {searchable && (
        <div className="border-b border-[#EADED4] p-4">
          <div className="relative max-w-md">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A18B7C]"
            />

            <input
              type="search"
              value={query}
              onChange={(event) => handleSearch(event.target.value)}
              placeholder={searchPlaceholder}
              aria-label="Search table records"
              className="w-full rounded-xl border border-[#EADED4] bg-[#F8F3ED] py-2.5 pl-10 pr-4 text-sm text-[#2B1B14] outline-none transition placeholder:text-[#A18B7C] focus:border-[#754426] focus:ring-2 focus:ring-[#754426]/10"
            />
          </div>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="space-y-4 p-5" aria-label="Loading records">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="h-12 animate-pulse rounded-lg bg-[#F8F3ED]"
            />
          ))}
        </div>
      ) : filteredData.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
          <div className="mb-4 rounded-2xl bg-[#F8F3ED] p-4">
            <Table2 size={28} className="text-[#754426]" />
          </div>

          <h3 className="text-base font-semibold text-[#2B1B14]">
            {emptyTitle}
          </h3>

          <p className="mt-1 max-w-sm text-sm text-[#80695B]">
            {query ? "Try another search term." : emptyDescription}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead className="bg-[#F8F3ED] text-xs uppercase tracking-wider text-[#80695B]">
                <tr>
                  {columns.map((column) => (
                    <th
                      key={String(column.key)}
                      className={`whitespace-nowrap px-5 py-4 font-semibold ${column.className ?? ""}`}
                    >
                      {column.sortable ? (
                        <button
                          type="button"
                          onClick={() => handleSort(column.key)}
                          className="inline-flex items-center gap-2 transition hover:text-[#2B1B14]"
                        >
                          {column.header}
                          {sortKey === column.key ? (
                            sortDirection === "asc" ? (
                              <ChevronUp size={14} />
                            ) : (
                              <ChevronDown size={14} />
                            )
                          ) : (
                            <ChevronDown size={14} className="opacity-30" />
                          )}
                        </button>
                      ) : (
                        column.header
                      )}
                    </th>
                  ))}

                  {rowActions && (
                    <th className="px-5 py-4 text-right font-semibold">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-[#EADED4]">
                {paginatedData.map((row) => (
                  <tr
                    key={rowKey(row)}
                    className="transition hover:bg-[#F8F3ED]/70"
                  >
                    {columns.map((column) => (
                      <td
                        key={String(column.key)}
                        className={`px-5 py-4 text-[#2B1B14] ${column.className ?? ""}`}
                      >
                        {renderCell(row, column)}
                      </td>
                    ))}

                    {rowActions && (
                      <td className="px-5 py-4 text-right">
                        {rowActions(row)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 p-3 md:hidden">
            {paginatedData.map((row) => (
              <article
                key={rowKey(row)}
                className="rounded-xl border border-[#EADED4] bg-white p-4"
              >
                <div className="space-y-3">
                  {columns.map((column, index) => (
                    <div
                      key={String(column.key)}
                      className={`flex items-start justify-between gap-4 ${
                        index === 0
                          ? "border-b border-[#EADED4] pb-3"
                          : ""
                      }`}
                    >
                      <span className="text-xs font-medium text-[#80695B]">
                        {column.header}
                      </span>

                      <span className="max-w-[65%] break-words text-right text-sm font-medium text-[#2B1B14]">
                        {renderCell(row, column)}
                      </span>
                    </div>
                  ))}

                  {rowActions && (
                    <div className="flex justify-end border-t border-[#EADED4] pt-3">
                      {rowActions(row)}
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {/* Pagination */}
      {!loading && filteredData.length > 0 && (
        <div className="flex flex-col gap-3 border-t border-[#EADED4] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[#80695B]">
            Showing{" "}
            <span className="font-semibold text-[#2B1B14]">
              {(currentPage - 1) * pageSize + 1}
            </span>
            {" "}to{" "}
            <span className="font-semibold text-[#2B1B14]">
              {Math.min(currentPage * pageSize, filteredData.length)}
            </span>
            {" "}of{" "}
            <span className="font-semibold text-[#2B1B14]">
              {filteredData.length}
            </span>
            {" "}records
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((previous) => Math.max(1, previous - 1))}
              disabled={currentPage === 1}
              aria-label="Previous page"
              className="rounded-lg border border-[#EADED4] p-2 text-[#754426] transition hover:bg-[#F8F3ED] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={18} />
            </button>

            <span className="min-w-20 text-center text-sm font-medium text-[#2B1B14]">
              Page {currentPage} of {totalPages}
            </span>

            <button
              type="button"
              onClick={() =>
                setPage((previous) => Math.min(totalPages, previous + 1))
              }
              disabled={currentPage === totalPages}
              aria-label="Next page"
              className="rounded-lg border border-[#EADED4] p-2 text-[#754426] transition hover:bg-[#F8F3ED] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
