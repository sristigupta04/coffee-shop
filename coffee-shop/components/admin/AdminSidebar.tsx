
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  ShoppingBag,
  Coffee,
  Layers,
  Package,
  Users,
  Ticket,
  Star,
  Gift,
  CalendarDays,
  Store,
  Wallet,
  ChartNoAxesCombined,
  Bell,
  ShieldCheck,
  ScrollText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Coffee as CoffeeIcon,
  LogOut,
} from "lucide-react";

const navigation = [
  {
    title: "OVERVIEW",
    items: [
      { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
      { name: "Analytics", href: "/admin/analytics", icon: ChartNoAxesCombined },
    ],
  },
  {
    title: "SHOP MANAGEMENT",
    items: [
      { name: "Orders", href: "/admin/orders", icon: ShoppingBag },
      { name: "Products", href: "/admin/products", icon: Coffee },
      { name: "Categories", href: "/admin/categories", icon: Layers },
      { name: "Inventory", href: "/admin/inventory", icon: Package },
      { name: "Customers", href: "/admin/customers", icon: Users },
      { name: "Coupons & Offers", href: "/admin/coupons", icon: Ticket },
      { name: "Reviews", href: "/admin/reviews", icon: Star },
    ],
  },
  {
    title: "BUSINESS MANAGEMENT",
    items: [
      { name: "Rewards", href: "/admin/rewards", icon: Gift },
      { name: "Reservations", href: "/admin/reservations", icon: CalendarDays },
      { name: "Branches", href: "/admin/branches", icon: Store },
      { name: "Payments & Refunds", href: "/admin/payments", icon: Wallet },
    ],
  },
  {
    title: "SYSTEM",
    items: [
      { name: "Notifications", href: "/admin/notifications", icon: Bell },
      { name: "Staff & Roles", href: "/admin/staff", icon: ShieldCheck },
      { name: "Audit Logs", href: "/admin/audit-logs", icon: ScrollText },
      { name: "Settings", href: "/admin/settings", icon: Settings },
    ],
  },
];

type Props = {
  userName?: string;
};

export default function AdminSidebar({ userName = "Admin" }: Props) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarContent = (
    <>
      <div className="flex h-[76px] items-center justify-between border-b border-white/10 px-5">
        <Link href="/admin" className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#a76535]">
            <CoffeeIcon size={23} />
          </div>

          {!collapsed && (
            <div>
              <h2 className="text-lg font-bold">BrewBites</h2>
              <p className="text-[10px] tracking-[2px] text-[#c3a895]">
                ADMIN PANEL
              </p>
            </div>
          )}
        </Link>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden rounded-lg p-2 text-[#c3a895] hover:bg-white/10 lg:block"
          aria-label="Toggle sidebar"
        >
          {collapsed ? <ChevronRight size={19} /> : <ChevronLeft size={19} />}
        </button>

        <button
          onClick={() => setMobileOpen(false)}
          className="rounded-lg p-2 text-white lg:hidden"
          aria-label="Close menu"
        >
          <X size={21} />
        </button>
      </div>

      <nav className="flex-1 space-y-7 overflow-y-auto px-3 py-6">
        {navigation.map((group) => (
          <div key={group.title}>
            {!collapsed && (
              <p className="mb-3 px-3 text-[10px] font-bold tracking-[2px] text-[#a88b77]">
                {group.title}
              </p>
            )}

            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active =
                  pathname === item.href ||
                  (item.href !== "/admin" &&
                    pathname.startsWith(item.href + "/"));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.name : undefined}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${
                      active
                        ? "bg-[#a76535] font-semibold text-white shadow-lg"
                        : "text-[#e4d5ca] hover:bg-[#513729] hover:text-white"
                    } ${collapsed ? "justify-center" : ""}`}
                  >
                    <Icon size={19} className="shrink-0" />

                    {!collapsed && <span>{item.name}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-4">
        {!collapsed && (
          <p className="mb-3 truncate text-sm font-semibold text-white">
            {userName}
          </p>
        )}

        <Link
          href="/"
          className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-[#c3a895] hover:bg-white/10 hover:text-white ${
            collapsed ? "justify-center" : ""
          }`}
        >
          <LogOut size={18} />
          {!collapsed && "Back to Store"}
        </Link>
      </div>
    </>
  );

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-40 rounded-xl bg-[#2b1b14] p-3 text-white shadow-lg lg:hidden"
        aria-label="Open admin menu"
      >
        <Menu size={21} />
      </button>

      {mobileOpen && (
        <button
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation overlay"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-[#2b1b14] text-white transition-all duration-300 lg:sticky lg:top-0 lg:z-30 lg:h-screen lg:translate-x-0 ${
          collapsed ? "lg:w-[88px]" : "lg:w-[270px]"
        } w-[270px] ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
