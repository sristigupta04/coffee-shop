
"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import Search from "@/components/SearchBar";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

import {
  Home,
  Coffee,
  LogIn,
  Settings,
  ShoppingCart,
} from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();

  const [wishlistcount, setWishlistcount] = useState(0);
  const [cartcount, setcartcount] = useState(0);

  const { status, data: session } = useSession();

  const isAdminRoute = pathname.startsWith("/admin");

  // ==========================================
  // CART AND WISHLIST COUNTS
  // ==========================================

  useEffect(() => {
    // Do not fetch customer cart/wishlist on admin pages.
    if (isAdminRoute) {
      return;
    }

    const update = async () => {
      if (
        status !== "authenticated" ||
        !session?.user?.id
      ) {
        setcartcount(0);
        return;
      }

      try {
        const userId = session.user.id;

        const res = await fetch(`/api/cart/${userId}`, {
          credentials: "include",
          cache: "no-store",
        });

        const data = await res.json();

        if (!res.ok) {
          return;
        }

        const items = data.data?.items || [];

        const count = items.reduce(
          (acc: number, item: any) =>
            acc + (item.quantity || 0),
          0
        );

        setcartcount(count);
      } catch (error) {
        console.error("Error fetching cart items:", error);
        setcartcount(0);
      }
    };

    const updateWishlistCount = async () => {
      if (
        status !== "authenticated" ||
        !session?.user?.id
      ) {
        setWishlistcount(0);
        return;
      }

      try {
        const res = await fetch("/api/wishlist", {
          cache: "no-store",
        });

        if (!res.ok) {
          return;
        }

        const data = await res.json();

        setWishlistcount(data.wishlist?.length || 0);
      } catch (error) {
        console.error("Error fetching wishlist count:", error);
        setWishlistcount(0);
      }
    };

    update();
    updateWishlistCount();

    const handlecartUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;

      if (typeof customEvent.detail === "number") {
        setcartcount(customEvent.detail);
      } else {
        update();
      }
    };

    window.addEventListener(
      "cartUpdated",
      handlecartUpdate
    );

    return () => {
      window.removeEventListener(
        "cartUpdated",
        handlecartUpdate
      );
    };
  }, [status, session?.user?.id, isAdminRoute]);

  // ==========================================
  // HIDE CUSTOMER NAVBAR
  // ==========================================

  if (isAdminRoute || pathname === "/login") {
    return null;
  }

  // ==========================================
  // CUSTOMER NAVBAR
  // ==========================================

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-[#eadbc9] bg-[#fffaf3] shadow-sm">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-10">

        {/* LOGO */}

        <Link href="/" className="flex items-center">
          <img
            src="/logo.jpg"
            alt="Coffee Shop"
            className="h-12 w-auto object-contain"
          />
        </Link>

        {/* NAVIGATION */}

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

          {/* SEARCH */}

          <Search />

          {/* SETTINGS */}

          <NavItem
            href="/settings"
            icon={<Settings size={18} />}
            text="Settings"
          />

          {/* CART */}

          <Link
            href="/cart"
            className="relative rounded-xl p-3 text-[#4b2e1f] transition hover:bg-[#f3e5d3]"
          >
            <ShoppingCart size={21} />

            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#a85d25] text-xs font-bold text-white">
              {cartcount}
            </span>
          </Link>

          {/* WISHLIST */}

          <Link
            href="/wishlist"
            className="relative rounded-xl p-3 text-[#4b2e1f] transition hover:bg-[#f3e5d3]"
          >
            <Heart size={22} className="h-5 w-5" />

            {wishlistcount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#a85d25] text-xs font-bold text-white">
                {wishlistcount}
              </span>
            )}
          </Link>

          {/* LOGIN */}

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

// ==========================================
// NAV ITEM
// ==========================================

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
