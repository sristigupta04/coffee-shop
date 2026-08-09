"use client";

import { useEffect, useState } from "react";
import MenuCard from "@/components/MenuCard";

type Product = {
  id: string;
  name: string;
  price: number;
  description: string;
  imageUrl: string;
  categoryId: string;
};

export default function MenuPage() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const getProducts = async () => {
      const res = await fetch("/api/products");
      const data = await res.json();

      const formattedProducts = data.data.map((product: any) => ({
        id: product.id,
        name: product.name,
        price: product.price,
        description: product.description,
        imageUrl: product.image,
        categoryId: product.category,
      }));

      setProducts(formattedProducts);
    };

    getProducts();
  }, []);

  return (
    <main className="min-h-screen bg-[#f8f3ed] px-6 py-12">

      {/* Heading */}
      <h1 className="text-center text-4xl font-bold text-[#3b2115] md:text-5xl">
        Our Menu
      </h1>

      <p className="mt-4 text-center text-xl text-[#4b2e20]">
        Discover our delicious selection of coffee and pastries
      </p>

      <p className="mx-auto mt-3 max-w-2xl text-center text-[#80695b]">
        Explore our menu and find your favorite coffee and pastry combinations.
        From classic espresso to specialty drinks, we have something for
        everyone.
      </p>

      {/* Category Navigation */}
      <div className="mx-auto mt-10 max-w-6xl rounded-2xl bg-white p-5 shadow-sm border border-[#eaded4]">

        <h2 className="mb-4 text-center text-lg font-semibold text-[#3b2115]">
          Categories
        </h2>

        <div className="flex flex-wrap justify-center gap-3">

          <button className="rounded-full bg-[#3b2115] px-6 py-3 text-sm font-semibold text-white">
            All
          </button>

          <button className="rounded-full border border-[#d6c4b5] bg-white px-6 py-3 text-sm font-medium text-[#4b2e20] transition hover:bg-[#3b2115] hover:text-white">
            Coffee
          </button>

          <button className="rounded-full border border-[#d6c4b5] bg-white px-6 py-3 text-sm font-medium text-[#4b2e20] transition hover:bg-[#3b2115] hover:text-white">
            Pastries
          </button>

          <button className="rounded-full border border-[#d6c4b5] bg-white px-6 py-3 text-sm font-medium text-[#4b2e20] transition hover:bg-[#3b2115] hover:text-white">
            Specialty Drinks
          </button>

        </div>
      </div>

      {/* Product Grid */}
      <div className="mx-auto mt-12 grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">

        {products.map((product) => (
          <MenuCard
            key={product.id}
            product={{
              ...product,
              onAddToCart: () => {
                console.log(`Added ${product.name} to cart!`);
              },
            }}
          />
        ))}

      </div>

    </main>
  );
}