"use client";

import { useState } from "react";

export default function getProduct() {
  const [form, setform] = useState({
    name: "",
    price: 0,
    description: "",
    categoryId: 0,
    imageUrl: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setform({
      ...form,
      [name]:
        name === "price" || name === "categoryId"
          ? Number(value)
          : value,
    });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (res.ok) {
        alert("product added successfully");
        setform({
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
        onSubmit={save}
        className="mx-auto flex w-full max-w-lg flex-col gap-5 rounded-2xl bg-white p-8 shadow-lg"
      >
        <h1 className="text-3xl font-bold text-gray-800">
          Add Product
        </h1>

        {/* Name */}
        <div>
          <label className="mb-2 block font-medium text-gray-700">
            product name
          </label>


          <input
            type="text"
            name="name"
            placeholder=" enter product name"
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
            placeholder="enter price"
            value={form.price}
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
          />
        </div>

        {/* Description */}
        <div>
          <label className="mb-2 block font-medium text-gray-700">
            description
          </label>

          <input
            type="text"
            name="description"
            placeholder="enter description"
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
          Add product
        </button>
      </form>
    </div>
  );
}