"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Coffee,
  Contact,
  ClipboardList,
  ShoppingCart,
  Search,
  X,
  LogIn,
} from "lucide-react";

export default function Navbar() {
  const [showSearch, setShowSearch] = useState(false);
const pathname = usePathname();

if (pathname === "/login") {
  return null;
}
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-[#eadbc9] bg-[#fffaf3] shadow-sm">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-10">

        {/* Logo */}
        <Link href="/" className="flex items-center">
          <img
            src="/logo.png"
            alt="Coffee Shop"
            className="h-12 w-auto object-contain"
          />
        </Link>

        {/* Navigation */}
        <div className="flex items-center gap-3">

          <NavItem
            href="/"
            icon={<Home size={18} />}
            text="Home"
          />

          <NavItem
            href="/menu"
            icon={<Coffee size={18} />}
            text="Menu"
          />

          <NavItem
            href="/contact"
            icon={<Contact size={18} />}
            text="Contact"
          />

          <NavItem
            href="/orders"
            icon={<ClipboardList size={18} />}
            text="Orders"
          />

          {/* Search Button */}
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="ml-2 rounded-xl p-3 text-[#4b2e1f] transition hover:bg-[#f3e5d3]"
            title="Search"
          >
            {showSearch ? <X size={20} /> : <Search size={20} />}
          </button>

          {/* Cart */}
          <Link
            href="/cart"
            className="relative rounded-xl p-3 text-[#4b2e1f] transition hover:bg-[#f3e5d3]"
          >
            <ShoppingCart size={21} />

            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#a85d25] text-xs font-bold text-white">
              0
            </span>
          </Link>

          {/* Login */}
<Link
  href="/login"
  className="ml-2 flex items-center gap-2 rounded-xl bg-[#8b4a24] px-5 py-2.5 font-medium text-white transition hover:bg-[#6f381b]"
>
  <LogIn size={18} />
  Login
</Link>
         
        </div>
      </div>

      {/* Search Box */}
      {showSearch && (
        <div className="border-t border-[#eadbc9] bg-[#fffaf3] px-10 py-4">
          <div className="mx-auto flex max-w-3xl items-center rounded-xl border border-[#d9c4ad] bg-white px-4 py-3 shadow-sm">
            <Search
              size={20}
              className="mr-3 text-[#8b4a24]"
            />

            <input
              type="text"
              placeholder="Search coffee..."
              className="w-full bg-transparent text-[#4b2e1f] outline-none placeholder:text-[#a8907a]"
            />
          </div>
        </div>
      )}
    </nav>
  );
}

function NavItem({
  href,
  icon,
  text,
}: {
  href: string;
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-xl px-4 py-2.5 font-medium text-[#4b2e1f] transition hover:bg-[#f3e5d3] hover:text-[#8b4a24]"
    >
      {icon}
      <span>{text}</span>
    </Link>
  );
}