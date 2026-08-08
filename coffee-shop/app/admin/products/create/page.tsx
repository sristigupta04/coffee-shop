"use client";

import { useState } from "react";

export default function GetProducts() {
  const [form, setForm] = useState({
    name: "",
    price: 0,
    description: "",
    categoryId: 0,
    imageUrl: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setForm({
      ...form,
      [name]:
        name === "price" || name === "categoryId"
          ? Number(value)
          : value,
    });
  };

  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (response.ok) {
        alert("Product added successfully");
        setForm({
          name: "",
          price: 0,
          description: "",
          categoryId: 0,
          imageUrl: "",
        });
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error(error);
      alert("Something went wrong");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-10">
      <form
        onSubmit={saveProduct}
        className="mx-auto flex w-full max-w-lg flex-col gap-5 rounded-2xl bg-white p-8 shadow-lg"
      >
        <h1 className="text-3xl font-bold text-gray-800">
          Add Product
        </h1>

        {/* Name */}
        <div>
          <label className="mb-2 block font-medium text-gray-700">
            Product Name
          </label>

          <input
            type="text"
            name="name"
            placeholder="Enter product name"
            value={form.name}
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
          />
        </div>

        {/* Price */}
        <div>
          <label className="mb-2 block font-medium text-gray-700">
            Price
          </label>

          <input
            type="number"
            name="price"
            placeholder="Enter price"
            value={form.price}
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
          />
        </div>

        {/* Description */}
        <div>
          <label className="mb-2 block font-medium text-gray-700">
            Description
          </label>

          <input
            type="text"
            name="description"
            placeholder="Enter description"
            value={form.description}
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
          />
        </div>

        {/* Category */}
        <div>
          <label className="mb-2 block font-medium text-gray-700">
            Category ID
          </label>

          <input
            type="number"
            name="categoryId"
            placeholder="Enter category ID"
            value={form.categoryId}
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
          />
        </div>

        {/* Image */}
        <div>
          <label className="mb-2 block font-medium text-gray-700">
            Image URL
          </label>

          <input
            type="text"
            name="imageUrl"
            placeholder="Enter image URL"
            value={form.imageUrl}
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="mt-2 rounded-lg bg-orange-600 px-5 py-3 font-semibold text-white transition hover:bg-orange-700"
        >
          Add Product
        </button>
      </form>
    </div>
  );
}