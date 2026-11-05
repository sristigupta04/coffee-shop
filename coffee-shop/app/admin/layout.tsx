
import Link from "next/link";
import { redirect } from "next/navigation";
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
  LogOut,
  Coffee as CoffeeIcon,
} from "lucide-react";

import { getcurrentuser } from "@/app/lib/auth";

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

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getcurrentuser();

  // Protect all admin pages
  if (!user) {
    redirect("/login");
  }

  if (user.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-[#f8f3ed] lg:flex">

      {/* SIDEBAR */}
      <aside className="w-full shrink-0 bg-[#2b1b14] text-white lg:sticky lg:top-0 lg:h-screen lg:w-[270px] lg:overflow-y-auto">

        {/* Brand */}
        <div className="flex items-center gap-3 border-b border-white/10 px-6 py-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#a76535]">
            <CoffeeIcon size={24} />
          </div>

          <div>
            <h1 className="text-xl font-bold tracking-wide">
              BrewBites
            </h1>
            <p className="text-xs text-[#d0ad91]">
              ADMINISTRATION
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-7 px-4 py-6">
          {navigation.map((group) => (
            <div key={group.title}>
              <p className="mb-3 px-3 text-[10px] font-bold tracking-[2px] text-[#a88b77]">
                {group.title}
              </p>

              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-[#e4d5ca] transition hover:bg-[#513729] hover:text-white"
                    >
                      <Icon size={18} />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Admin Profile */}
        <div className="border-t border-white/10 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#a76535] font-bold">
              {user.name?.charAt(0).toUpperCase() || "A"}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {user.name}
              </p>
              <p className="text-xs text-[#c3a895]">
                Administrator
              </p>
            </div>
          </div>

          <Link
            href="/"
            className="mt-4 flex items-center gap-2 text-xs text-[#c3a895] hover:text-white"
          >
            <LogOut size={15} />
            Back to Store
          </Link>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="min-w-0 flex-1">

        {/* HEADER */}
        <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-[#eaded4] bg-white/95 px-5 backdrop-blur sm:px-8">
          <div>
            <p className="text-xs font-medium text-[#a76535]">
              BREWBites MANAGEMENT
            </p>
            <p className="text-sm font-semibold text-[#3b2115]">
              Control Center
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-[#80695b] sm:block">
              {user.name}
            </span>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f0e2d5] font-bold text-[#754426]">
              {user.name?.charAt(0).toUpperCase() || "A"}
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="min-h-[calc(100vh-76px)] p-5 sm:p-8">
          {children}
        </main>

      </div>
    </div>
  );
}
