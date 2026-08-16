"use client";

import { useEffect, useState } from "react";
import MenuCard from "@/components/Menu/MenuCard";

type Product = {
  id: string;
  name: string;
  price: number;
  description: string;
  imageUrl: string;
  categoryId: string;
};

export default function Menu(){
  const [prod,setprod]  = useState<Product[]>([]);
  const [load,setload] = useState(true);
  useEffect(()=>{
    const prod = async()=>{
      try{
      const res= await fetch("/api/products");
      const data = await res.json();
      const newprod = data.data.map((product:any)=>({
        id:product.id,
        name:product.name,
        price:product.price,  
      description:product.description,
      imageUrl:product.image,
      categoryId:product.category,
      }) );
      setprod(newprod);
      
    }
  catch(err){
      console.error("Error fetching products:", err);
    }finally{
      setload(false);
    }
    };
    prod();
  },[]);

  return(
 <main className="min-h-screen bg-[#f8f3ed] px-6 py-10 sm:px-4 md:px-8">
  {/* menu ka uper wala part */}

  <section className="mx-auto max-w-5xl text-center">

    <h1  className="font-[family-name:var(--font-playfair)] text-5xl font-medium text-[#3b2115] md:text-6xl">
      Our Menu
    </h1>

    <p className="mt-4 text-lg font-medium text-[#4b2e20] sm:text-xl">
      choose your favorite coffee and pastries from our menu
    </p>



    <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[#80695b] sm:text-base">
      Fresly brewed coffee, delicious pastries, and specialty drinks await you. Explore our menu and find your perfect combination.
    </p>



  </section>


  {/* categoriessss */}
  <section className="mx-auto mt-10 max-w-6xl rounded-2xl bg-white p-5 shadow-sm border border-[#eaded4]">
    <h2 className="mb-5 text-center text-lg font-semibold text-[#3b2115]">
      Categories
    </h2>

    <div className="flex flex-wrap justify-center gap-3">
      <button className="rounded-full bg-[#3b2115] px-6  py-3 text-sm font-semibold text-white">
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
  </section>

{/* product loading */}
<section className="mx-auto mt-12 max-w-6xl">
  {load ? (
<div className="py-20 text-center text-[#80695b]">Loading products...</div>
  ): prod.length === 0? (
    <div className="py-20 text-center text-[#80695b]">No products available.</div>
  ):(
   <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
  {prod.map((product) => (
    <MenuCard
      key={product.id}
      product={{
        ...product,
        onAddToCart: (quantity: number) => {
          console.log(
            `Added ${quantity} of ${product.name} to cart.`
          );
        },
      }}
    />
  ))}
</div>
  )}
  </section>
      </main>
  )
}


 