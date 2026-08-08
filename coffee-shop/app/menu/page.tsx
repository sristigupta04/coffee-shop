"use client";

import { useEffect, useState } from "react";

type Product = {
  id: number;
  name: string;
  price: number;
  description: string;
  imageUrl: string;
  categoryId: number;
};

export default function MenuPage() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const getProducts = async () => {
      const res = await fetch("/api/products");
      const data = await res.json();

      setProducts(data.data);
    };

    getProducts();
  }, []);

  return (
    <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <Menu
          key={product.id}
          image={product.imageUrl}
          title={product.name}
          price={product.price}
          category={String(product.categoryId)}
          description={product.description}
        />
      ))}
    </div>
  );
}