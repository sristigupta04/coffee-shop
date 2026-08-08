"use client";

import { useEffect, useState } from "react";

export default function Product() {
  const [prod, setProd] = useState({
    name: "",
    price: 0,
    description: "",
    categoryId: 0,
    imageUrl: "",
  });

  useEffect(() => {
    const fetchProduct = async () => {
      const res = await fetch("/api/products/1");
      const data = await res.json();

      setProd(data.data);
    };

    fetchProduct();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;

    setProd((prev) => ({
      ...prev,
      [name]:
        name === "price" || name === "categoryId"
          ? Number(value)
          : value,
    }));
  };

  const handleUpdate = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    const res = await fetch("/api/products/1", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(prod),
    });

    const data = await res.json();

    if (res.ok) {
      alert("Product updated");
    } else {
      alert(data.message);
    }
  };

  return (
    <form onSubmit={handleUpdate}>
      <input
        name="name"
        value={prod.name}
        onChange={handleChange}
      />

      <input
        name="price"
        type="number"
        value={prod.price}
        onChange={handleChange}
      />

      <input
        name="description"
        value={prod.description}
        onChange={handleChange}
      />

      <input
        name="categoryId"
        type="number"
        value={prod.categoryId}
        onChange={handleChange}
      />

      <input
        name="imageUrl"
        value={prod.imageUrl}
        onChange={handleChange}
      />

      <button type="submit">Update Product</button>
    </form>
  );
}