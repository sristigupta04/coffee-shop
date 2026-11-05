
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import ProductForm, {
  type ProductFormData,
} from "@/components/ProductForm";

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [prod, setProd] = useState<ProductFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const productId = params.id;

  const fetchProduct = useCallback(async () => {
    try {
      setLoading(true);

      const res = await fetch(`/api/products/${productId}`, {
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Product not found.");
      }

      const product = data.product ?? data.data;

      if (!product) {
        throw new Error("Product not found.");
      }

      setProd({
        name: product.name,
        description: product.description,
        price: product.price,
        categoryId: product.categoryId,
        image: product.image,
        stock: product.stock,
        isAvailable: product.isAvailable,
      });
    } catch (error) {
      console.error("Fetch product error:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Something went wrong."
      );

      router.push("/admin/products");
    } finally {
      setLoading(false);
    }
  }, [productId, router]);

  useEffect(() => {
    if (productId) {
      fetchProduct();
    }
  }, [productId, fetchProduct]);

  const update = async (form: ProductFormData) => {
    try {
      setUpdating(true);

      const res = await fetch(`/api/products/${productId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim(),
          price: form.price,
          categoryId: form.categoryId,
          image: form.image.trim(),
          stock: form.stock,
          isAvailable: form.isAvailable,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to update product.");
      }

      alert("Product updated successfully!");

      router.push("/admin/products");
      router.refresh();
    } catch (error) {
      console.error("Update product error:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Something went wrong."
      );
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F3ED]">
        <p className="text-sm font-medium text-[#754426]">
          Loading product...
        </p>
      </div>
    );
  }

  if (!prod) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F3ED]">
        <p className="text-[#754426]">Product not found.</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8F3ED] px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <ProductForm
          onSubmit={update}
          initialval={prod}
          btntext={updating ? "Updating..." : "Update Product"}
        />
      </div>
    </main>
  );
}
