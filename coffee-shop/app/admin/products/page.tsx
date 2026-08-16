"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Product = {
  id: string;
  name: string;
  price: number;
  description: string;
  image: string;
  category: string;
  stock: number;
  isAvailable: boolean;
};

export default function ProductsPage() {
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Get all products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch("/api/products");
        const data = await res.json();

        if (!res.ok) {
          alert(data.message || "Failed to fetch products");
          return;
        }

        setProducts(data.products);
      } catch (error) {
        console.error(error);
        alert("Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Delete product
  const deleteProduct = async (id: string) => {
    const confirmDelete = confirm(
      "Are you sure you want to delete this product?"
    );

    if (!confirmDelete) {
      return;
    }

    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Failed to delete product");
        return;
      }

      setProducts((prev) =>
        prev.filter((product) => product.id !== id)
      );

      alert("Product deleted successfully");
    } catch (error) {
      console.error(error);
      alert("Something went wrong");
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f8f3ed]">
        <p className="text-[#6f4e37]">Loading products...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f3ed] px-4 py-10 sm:px-6 lg:px-8">
      
      {/* Header */}
      <section className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          
          <div>
            <h1 className="text-3xl font-bold text-[#3b2115] sm:text-4xl">
              Products
            </h1>

            <p className="mt-2 text-[#80695b]">
              Manage your coffee shop products
            </p>
          </div>

          {/* Add Product */}
          <button
            onClick={() => router.push("/admin/products/create")}
            className="rounded-lg bg-[#8b4a24] px-5 py-3 font-semibold text-white transition hover:bg-[#6f351c]"
          >
            + Add Product
          </button>
        </div>

        {/* Empty */}
        {products.length === 0 ? (
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
            <p className="text-[#80695b]">
              No products available.
            </p>
          </div>
        ) : (
          /* Product Grid */
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <div
                key={product.id}
                className="overflow-hidden rounded-2xl border border-[#eaded4] bg-white shadow-sm"
              >
                {/* Image */}
                <div className="h-52 overflow-hidden">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="h-full w-full object-cover"
                  />
                </div>

                {/* Product Details */}
                <div className="p-5">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <h2 className="text-xl font-bold text-[#3b2115]">
                      {product.name}
                    </h2>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        product.isAvailable
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {product.isAvailable
                        ? "Available"
                        : "Unavailable"}
                    </span>
                  </div>

                  <p className="mb-3 text-sm leading-6 text-[#80695b]">
                    {product.description}
                  </p>

                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-xl font-bold text-[#9a4f24]">
                      ₹{product.price}
                    </span>

                    <span className="text-sm text-[#80695b]">
                      Stock: {product.stock}
                    </span>
                  </div>

                  <p className="mb-4 text-sm text-[#6f4e37]">
                    Category: {product.category}
                  </p>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={() =>
                        router.push(
                          `/admin/products/edit/${product.id}`
                        )
                      }
                      className="flex-1 rounded-lg bg-[#6f4e37] px-4 py-2 font-medium text-white transition hover:bg-[#523727]"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => deleteProduct(product.id)}
                      className="flex-1 rounded-lg border border-red-300 px-4 py-2 font-medium text-red-600 transition hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}