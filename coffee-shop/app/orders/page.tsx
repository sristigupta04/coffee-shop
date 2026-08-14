"use client";

import Store from "@/components/Order/StoreBar";
import Btn from "@/components/Button";
import { useEffect, useState } from "react";

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  stock: number;
  isAvailable: boolean;
};

export default function Order() {
  const [prod, setProd] = useState<Product[]>([]);
  const [load, setLoad] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [active, setActive] = useState("ALL");

  const [categories, setCategories] = useState<string[]>(["ALL"]);

  // =========================
  // FETCH PRODUCTS
  // =========================
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoad(true);
        setErr(null);

        const res = await fetch("/api/products");

        if (!res.ok) {
          throw new Error(`Request failed: ${res.status}`);
        }

        const result = await res.json();

        console.log("API RESULT:", result);

        const products: Product[] = result.data ?? [];

        console.log("PRODUCTS:", products);

        setProd(products);

        // =========================
        // CATEGORIES
        // =========================
        const uniqueCategories = [
          "ALL",
          ...new Set(
            products
              .map((product) => product.category)
              .filter(Boolean)
          ),
        ];

        setCategories(uniqueCategories);
      } catch (error) {
        setErr(
          error instanceof Error
            ? error.message
            : "Something went wrong"
        );
      } finally {
        setLoad(false);
      }
    };

    fetchProducts();
  }, []);

  // =========================
  // FILTER PRODUCTS
  // =========================
  const filter =
    active === "ALL"
      ? prod
      : prod.filter(
          (product) => product.category === active
        );

  return (
    <div className="min-h-screen bg-[#f8f3ee] px-4 py-6 sm:px-6 lg:px-10">

      <div className="mx-auto max-w-7xl">

        {/* ================= HEADER ================= */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Order Coffee
          </h1>

          <p className="mt-2 text-lg text-gray-600">
            Choose your favorite coffee and place your order.
          </p>
        </div>

        {/* ================= STORE ================= */}
        <div className="mb-6">
          <Store
            location="Select your store"
            DineIn="Dine In"
            Takeway="Takeaway"
          />
        </div>

        {/* ================= CATEGORIES ================= */}
        <div className="mb-7 flex flex-wrap gap-3 border-b border-[#e4d8c2] pb-3">

          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActive(category)}
              className={`shrink-0 rounded-full px-5 py-2 transition ${
                active === category
                  ? "bg-[#6F4E37] text-white"
                  : "bg-white text-gray-700 hover:bg-[#e4d8c2]"
              }`}
            >
              {category}
            </button>
          ))}

        </div>

        {/* ================= LOADING ================= */}
        {load && (
          <div className="py-10 text-center text-gray-500">
            Loading products...
          </div>
        )}

        {/* ================= ERROR ================= */}
        {err && (
          <div className="py-10 text-center text-red-500">
            {err}
          </div>
        )}

        {/* ================= NO PRODUCT ================= */}
        {!load && !err && filter.length === 0 && (
          <div className="py-10 text-center text-gray-500">
            No products found.
          </div>
        )}

        {/* ================= PRODUCTS ================= */}
        {!load && !err && filter.length > 0 && (
          <div className="grid grid-cols-1 gap-5 pb-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">

            {filter.map((product) => (

              <div
                key={product.id}
                className={`overflow-hidden rounded-lg bg-white shadow-md transition-transform duration-300 hover:scale-105 ${
                  !product.isAvailable || product.stock === 0
                    ? "opacity-50"
                    : ""
                }`}
              >

                {/* ================= IMAGE ================= */}
                <div className="h-52 w-full bg-[#e8ddd3]">

                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-gray-400">
                      No Image
                    </div>
                  )}

                </div>

                {/* ================= DETAILS ================= */}
                <div className="p-4">

                  <h3 className="text-lg font-semibold text-[#4b2e1f]">
                    {product.name}
                  </h3>

                  <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                    {product.description}
                  </p>

                  {/* PRICE */}
                  <p className="mt-3 text-lg font-bold text-[#6F4E37]">
                    ₹{product.price}
                  </p>

                  {/* STOCK */}
                  {!product.isAvailable ||
                  product.stock === 0 ? (
                    <p className="mt-3 text-sm font-medium text-red-500">
                      Out of stock
                    </p>
                  ) : (
                    <div className="mt-4">
                      <Btn
                        text="Add to order"
                        onClick={() => {
                          console.log(
                            "Selected Product:",
                            product
                          );
                        }}
                      />
                    </div>
                  )}

                </div>

              </div>

            ))}

          </div>
        )}

      </div>

    </div>
  );
}