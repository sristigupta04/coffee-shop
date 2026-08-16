"use client";

import Link from "next/link";
import  Search from "@/components/searchBar";
import { usePathname } from "next/navigation";
import {
  Home,
  Coffee,
  Contact,
  ClipboardList,
  ShoppingCart,


  LogIn,
} from "lucide-react";

export default function Navbar() {
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
<Search/>

       

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