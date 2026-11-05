
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Search,
  Bell,
  ChevronDown,
  Settings,
  Store,
  UserRound,
  LogOut,
  Menu,
  Coffee,
} from "lucide-react";

type AdminHeaderProps = {
  userName?: string;
  userEmail?: string;
  onMenuClick?: () => void;
};

const pageNames: Record<string, string> = {
  admin: "Dashboard",
  analytics: "Analytics",
  orders: "Orders",
  products: "Products",
  categories: "Categories",
  inventory: "Inventory Management",
  ingredients: "Ingredients",
  suppliers: "Suppliers",
  customers: "Customers",
  coupons: "Coupons & Offers",
  reviews: "Reviews & Ratings",
  rewards: "Rewards & Loyalty",
  reservations: "Reservations",
  branches: "Branches",
  payments: "Payments & Refunds",
  notifications: "Notifications",
  staff: "Staff & Roles",
  "audit-logs": "Audit Logs",
  settings: "Settings",
};

export default function AdminHeader({
  userName = "Administrator",
  userEmail = "",
  onMenuClick,
}: AdminHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [profileOpen, setProfileOpen] = useState(false);
  const [search, setSearch] = useState("");

  const segments = pathname.split("/").filter(Boolean);
  const currentPage =
    pageNames[segments[segments.length - 1]] || "Admin";

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const query = search.trim();

    if (!query) return;

    // Search existing products through the admin products page.
    router.push(`/admin/products?search=${encodeURIComponent(query)}`);
    setSearch("");
  };

  return (
    <header className="sticky top-0 z-30 border-b border-[#eaded4] bg-white/95 backdrop-blur-md">
      <div className="flex h-[76px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">

        {/* LEFT SECTION */}
        <div className="flex min-w-0 items-center gap-3">

          <button
            onClick={onMenuClick}
            className="rounded-lg p-2 text-[#754426] hover:bg-[#f8f3ed] lg:hidden"
            aria-label="Open sidebar"
          >
            <Menu size={22} />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-[#a18b7c]">
              <Link href="/admin" className="hover:text-[#9a4f24]">
                Admin
              </Link>

              <span>/</span>

              <span className="truncate text-[#9a4f24]">
                {currentPage}
              </span>
            </div>

            <h1 className="mt-1 truncate text-lg font-bold text-[#3b2115] sm:text-xl">
              {currentPage}
            </h1>
          </div>
        </div>

        {/* SEARCH */}
        <form
          onSubmit={handleSearch}
          className="hidden w-full max-w-[300px] items-center gap-2 rounded-xl border border-[#eaded4] bg-[#faf7f3] px-3 py-2.5 md:flex"
        >
          <Search size={18} className="shrink-0 text-[#a18b7c]" />

          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            aria-label="Search products"
            className="w-full bg-transparent text-sm text-[#3b2115] outline-none placeholder:text-[#a18b7c]"
          />

          <kbd className="rounded bg-white px-2 py-1 text-[10px] text-gray-400">
            Enter
          </kbd>
        </form>

        {/* RIGHT SECTION */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-4">

          {/* Notifications */}
          <Link
            href="/admin/notifications"
            className="relative rounded-xl p-2.5 text-[#754426] transition hover:bg-[#f8f3ed]"
            aria-label="Notifications"
          >
            <Bell size={21} />
          </Link>

          <div className="h-8 w-px bg-[#eaded4]" />

          {/* Profile */}
          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 rounded-xl p-1.5 transition hover:bg-[#f8f3ed]"
              aria-expanded={profileOpen}
              aria-label="Open profile menu"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f0e2d5] font-bold text-[#754426]">
                {userName.charAt(0).toUpperCase()}
              </div>

              <div className="hidden text-left sm:block">
                <p className="max-w-[130px] truncate text-sm font-semibold text-[#3b2115]">
                  {userName}
                </p>

                <p className="text-xs text-[#a18b7c]">
                  Administrator
                </p>
              </div>

              <ChevronDown
                size={16}
                className="hidden text-[#80695b] sm:block"
              />
            </button>

            {profileOpen && (
              <>
                <button
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() => setProfileOpen(false)}
                  aria-label="Close profile menu"
                />

                <div className="absolute right-0 top-14 z-50 w-64 overflow-hidden rounded-2xl border border-[#eaded4] bg-white shadow-xl">

                  <div className="border-b border-[#f0e7df] p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f0e2d5] font-bold text-[#754426]">
                        {userName.charAt(0).toUpperCase()}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-[#3b2115]">
                          {userName}
                        </p>

                        <p className="truncate text-xs text-[#a18b7c]">
                          {userEmail || "Administrator"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 p-2">
                    <Link
                      href="/profile"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#513729] hover:bg-[#f8f3ed]"
                    >
                      <UserRound size={17} />
                      My Profile
                    </Link>

                    <Link
                      href="/admin/settings"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#513729] hover:bg-[#f8f3ed]"
                    >
                      <Settings size={17} />
                      Admin Settings
                    </Link>

                    <Link
                      href="/"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#513729] hover:bg-[#f8f3ed]"
                    >
                      <Store size={17} />
                      Visit Store
                    </Link>
                  </div>

                  <div className="border-t border-[#f0e7df] p-2">
                    <Link
                      href="/api/auth/logout"
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut size={17} />
                      Logout
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
