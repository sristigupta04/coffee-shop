"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

const navigation = [
  {
    label: "Dashboard",
    href: "/staff/dashboard",
    icon: "⌂",
  },
  {
    label: "Attendance",
    href: "/staff/attendance",
    icon: "◷",
  },
  {
    label: "My Shifts",
    href: "/staff/shifts",
    icon: "▦",
  },
  {
    label: "My Leaves",
    href: "/staff/leaves",
    icon: "▤",
  },
  {
    label: "Payroll",
    href: "/staff/payroll",
    icon: "₹",
  },
  {
    label: "Documents",
    href: "/staff/documents",
    icon: "▧",
  },
  {
    label: "Notifications",
    href: "/staff/notifications",
    icon: "♧",
  },
  {
    label: "My Profile",
    href: "/staff/profile",
    icon: "◎",
  },
];

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [staffName, setStaffName] = useState("Staff Member");
  const [staffRole, setStaffRole] = useState("STAFF");
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    let active = true;

    const checkStaffSession = async () => {
      try {
        const response = await fetch("/api/staff/me", {
          cache: "no-store",
        });

        if (!response.ok) {
          router.replace("/staff/login");
          return;
        }

        const data = await response.json();

        if (!active) return;

        const staff = data.staff ?? data.user;

        if (!staff) {
          router.replace("/staff/login");
          return;
        }

        setStaffName(staff.name || "Staff Member");
        setStaffRole(staff.role || "STAFF");
      } catch {
        router.replace("/staff/login");
      } finally {
        if (active) setCheckingAuth(false);
      }
    };

    checkStaffSession();

    return () => {
      active = false;
    };
  }, [router]);

  const logout = async () => {
    try {
      await fetch("/api/staff/logout", {
        method: "POST",
      });
    } finally {
      router.replace("/staff/login");
      router.refresh();
    }
  };

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">Loading staff portal...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {sidebarOpen && (
        <button
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-gray-200 bg-white transition-transform lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-gray-200 px-5">
          <Link
            href="/staff/dashboard"
            className="text-xl font-bold text-blue-800"
          >
            BrewBites
          </Link>

          <button
            onClick={() => setSidebarOpen(false)}
            className="text-xl text-gray-500 lg:hidden"
            aria-label="Close navigation"
          >
            ×
          </button>
        </div>

        <div className="border-b border-gray-100 px-5 py-5">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
            Staff Portal
          </p>
          <p className="mt-2 truncate font-semibold text-gray-900">
            {staffName}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {staffRole.replaceAll("_", " ")}
          </p>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navigation.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/staff/dashboard" &&
                pathname.startsWith(`${item.href}/`));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${
                  active
                    ? "bg-blue-50 text-blue-800"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <span className="w-5 text-center text-lg">
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-gray-200 p-3">
          <button
            onClick={logout}
            className="w-full rounded-lg px-4 py-3 text-left text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Sign Out
          </button>
        </div>
      </aside>

      <div className="min-h-screen lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 lg:hidden"
              aria-label="Open navigation"
            >
              ☰
            </button>

            <div>
              <p className="text-sm font-semibold text-gray-900">
                Welcome, {staffName}
              </p>
              <p className="text-xs text-gray-500">
                BrewBites Staff Workspace
              </p>
            </div>
          </div>

          <Link
            href="/staff/notifications"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            Notifications
          </Link>
        </header>

        <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}