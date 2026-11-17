
"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import MenuCard from "@/components/Menu/MenuCard";
import Store from "@/components/Menu/StoreBar";
import Categoryhead from "@/components/Menu/CategoryNav";

type Product = {
  id: string;
  name: string;
  price: number;
  description: string;
  imageUrl: string;
  categoryId: string;
  onAddToCart: (quant: number) => void;
  quantity?: number;
  stock?: number;
  isAvailable?: boolean;
};

function MenuContent() {
  const [prod, setprod] = useState<Product[]>([]);
  const [load, setload] = useState(true);
  const [category, setCategory] = useState("All");
  const searchParams = useSearchParams();
  const searchTerm = searchParams.get("search") || "";
  const [sort, setSort] = useState("default");
  const [availableOnly, setAvailableOnly] = useState(false);

  const { status, data: session } = useSession();

  // ==========================================
  // FETCH PRODUCTS
  // ==========================================

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch("/api/products");

        if (!res.ok) {
          throw new Error("Failed to fetch products.");
        }

        const data = await res.json();

        const products = Array.isArray(data.data)
          ? data.data
          : [];

        const newProducts: Product[] = products.map(
          (product: any) => ({
            id: product.id,
            name: product.name ?? "",
            price: Number(product.price ?? 0),
            description: product.description ?? "",
            imageUrl: product.image ?? "",
            categoryId:
              typeof product.category === "string"
                ? product.category
                : product.category?.name ??
                  product.category?.id ??
                  product.categoryId ??
                  "",
            stock: product.stock ?? 0,
            isAvailable: product.isAvailable ?? true,
            onAddToCart: () => {},
          })
        );

        setprod(newProducts);
      } catch (err) {
        console.error("Error fetching products:", err);
        setprod([]);
      } finally {
        setload(false);
      }
    };

    fetchProducts();
  }, []);

  // ==========================================
  // ADD TO CART
  // ==========================================

  const addToCart = async (product: Product, quant: number) => {
    try {
      if (status === "loading") {
        return;
      }

      if (status !== "authenticated" || !session?.user?.id) {
        alert("Please log in to add items to your cart.");
        return;
      }

      const userId = session.user.id;

      const res = await fetch(`/api/cart/${userId}`, {
        method: "PUT",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          userId,
          productId: product.id,
          quantity: quant,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        alert(data.message || "Failed to add item to cart.");
        return;
      }

      window.dispatchEvent(new Event("cartUpdated"));
    } catch (err) {
      console.error("Error adding item to cart:", err);
    }
  };

  // ==========================================
  // SEARCH AND CATEGORY FILTER
  // ==========================================

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const allsearch = prod.filter((product) => {
    const productCategory = String(product.categoryId ?? "");
    const productName = String(product.name ?? "");
    const productDescription = String(product.description ?? "");

    const matchesCategory =
      category === "All" || productCategory === category;

    const matchesSearch =
      normalizedSearch === "" ||
      productDescription.toLowerCase().includes(normalizedSearch) ||
      productCategory.toLowerCase().includes(normalizedSearch) ||
      productName.toLowerCase().includes(normalizedSearch);

    const matchesAvailability =
      !availableOnly ||
      (product.isAvailable !== false &&
        (product.stock === undefined || product.stock > 0));

    return (
      matchesCategory &&
      matchesSearch &&
      matchesAvailability
    );
  });

  // ==========================================
  // SORT PRODUCTS
  // ==========================================

  const sortedProducts = [...allsearch].sort((a, b) => {
    switch (sort) {
      case "price-low":
        return a.price - b.price;

      case "price-high":
        return b.price - a.price;

      case "name-az":
        return a.name.localeCompare(b.name);

      case "name-za":
        return b.name.localeCompare(a.name);

      default:
        return 0;
    }
  });

  // ==========================================
  // RELATED PRODUCTS
  // ==========================================

  const itemrelated = searchTerm
    ? prod
        .filter((product) => {
          const term = normalizedSearch;

          const productCategory = String(
            product.categoryId ?? ""
          ).toLowerCase();

          const productName = String(
            product.name ?? ""
          ).toLowerCase();

          return (
            !allsearch.some(
              (item) => item.id === product.id
            ) &&
            (
              productCategory.includes(term) ||
              productName.includes(term)
            )
          );
        })
        .slice(0, 6)
    : [];

  // ==========================================
  // UI
  // ==========================================

  return (
    <main className="min-h-screen bg-[#f8f3ed] px-6 py-10 sm:px-4 md:px-8">

      {/* MENU HEADER */}

      <section className="mx-auto max-w-5xl text-center">
        <h1 className="font-(family-name:--font-playfair) text-5xl font-medium text-[#3b2115] md:text-6xl">
          Our Menu
        </h1>

        <p className="mt-4 text-lg font-medium text-[#4b2e20] sm:text-xl">
          choose your favorite coffee and pastries from our menu
        </p>

        <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[#80695b] sm:text-base">
          Freshly brewed coffee, delicious pastries, and specialty drinks await you. Explore our menu and find your perfect combination.
        </p>
      </section>

      {/* STORE BAR */}

      <section className="mx-auto mt-10 max-w-6xl">
        <Store
          location="location"
          DineIn="Dine In"
          Takeway="Takeaway"
        />
      </section>

      {/* CATEGORIES */}

      <Categoryhead
        categoryChecked={category}
        onCategory={(category: string) =>
          setCategory(category)
        }
      />

      {/* FILTERS AND SORT */}

      <div className="mx-auto mt-6 flex max-w-6xl flex-wrap items-center justify-between gap-4">

        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-[#3b2115]">
          <input
            type="checkbox"
            checked={availableOnly}
            onChange={(e) =>
              setAvailableOnly(e.target.checked)
            }
            className="h-4 w-4 accent-[#6f4e37]"
          />
          Available only
        </label>

        <div className="relative">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="
              min-w-[190px]
              cursor-pointer
              appearance-none
              border
              border-[#d8cbbf]
              bg-[#fcfaf6]
              px-5
              py-3
              pr-10
              text-sm
              font-medium
              text-[#3b2115]
              outline-none
              transition-all
              duration-200
              hover:border-[#8b6248]
              focus:border-[#6f4e37]
            "
          >
            <option value="default">Recommended</option>

            <option value="price-low">
              Price: Low to High
            </option>

            <option value="price-high">
              Price: High to Low
            </option>

            <option value="name-az">
              Name: A — Z
            </option>

            <option value="name-za">
              Name: Z — A
            </option>
          </select>

          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#6f4e37]">
            ↓
          </span>
        </div>
      </div>

      {/* PRODUCT SECTION */}

      <section className="mx-auto mt-10 max-w-6xl">

        {load ? (
          <div className="py-20 text-center text-[#80695b]">
            Loading products...
          </div>
        ) : prod.length === 0 ? (
          <div className="py-20 text-center text-[#80695b]">
            No products available
          </div>
        ) : (
          <>
            {/* SEARCH RESULT HEADING */}

            {searchTerm && (
              <div className="mb-8">
                <h2 className="text-2xl font-semibold text-[#3b2115]">
                  {searchTerm}
                </h2>

                <p className="mt-1 text-sm text-[#80695b]">
                  Search results for "{searchTerm}"
                </p>
              </div>
            )}

            {/* PRODUCT GRID */}

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">

              {sortedProducts.length > 0 ? (
                sortedProducts.map((product) => (
                  <MenuCard
                    key={product.id}
                    product={{
                      ...product,
                      onAddToCart: (quant: number) => {
                        addToCart(product, quant);
                      },
                    }}
                  />
                ))
              ) : (
                <p className="col-span-full py-10 text-center text-[#80695b]">
                  No products found
                  {searchTerm ? ` for "${searchTerm}"` : ""}.
                </p>
              )}

            </div>

            {/* RELATED PRODUCTS */}

            {searchTerm && itemrelated.length > 0 && (
              <div className="mt-10">

                <h2 className="text-2xl font-semibold text-[#3b2115]">
                  Related Products
                </h2>

                <p className="mt-1 text-sm text-[#80695b]">
                  You may also like
                </p>

                <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">

                  {itemrelated.map((product) => (
                    <MenuCard
                      key={product.id}
                      product={{
                        ...product,
                        onAddToCart: (quant: number) => {
                          addToCart(product, quant);
                        },
                      }}
                    />
                  ))}

                </div>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}

// ==========================================
// MENU PAGE
// ==========================================

export default function Menu() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MenuContent />
    </Suspense>
  );
}
