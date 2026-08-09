"use client";

import { useEffect, useState } from "react";
import MenuCard from "@/components/MenuCard";

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
    <main className="min-h-screen bg-[[#fffaf4] px-8 py-12">
      <h1 className="text-4xl font-bold text-center text-[#4b2e20]">
        Our Menu
      </h1>

      <p className="text-xl text-center text-[#4b2e20]">
        Discover our delicious selection of coffee and pastries
      </p>


      <p className="text-center text-gray-600 mt-3">
        Explore our menu and find your favorite coffee and pastry combinations. From classic espresso to specialty drinks, we have something for everyone.
      </p>
      <div className= "grid grid-cols-1 md:grid-cols-1 lg:grid-cols-3 gap-8 mt-12">

      </div>
   
    <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2 lg:grid-cols-3">
 {products.map((product)=>(
<MenuCard 
key={product.id}
     product={product}/>

 ))}
    </div>
    </main>
  );
}