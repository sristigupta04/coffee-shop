"use client";

import { useEffect, useState } from "react";
import MenuCard from "@/components/Menu/MenuCard";
import  Store from "@/components/Menu/StoreBar";
import Categoryhead from "@/components/Menu/categoryNav";
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
  const [category, setCategory] = useState("All");
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

 const allsearch= prod.filter((product)=> {
  const filter = category === "All"|| product.categoryId === category;

  return  filter;
  });
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

<section className="mx-auto mt-10 max-w-6xl">
  <Store
    location="location"
    DineIn="Dine In"
    Takeway="Takeaway"
  />
</section>


  {/* categoriessss */}



<Categoryhead
 categoryChecked={category}
 onCategory={(category:string)=>setCategory(category)}
/>

{/* product loading */}
<section className="mx-auto mt-12 max-w-6xl">
  {load ? (
<div className="py-20 text-center text-[#80695b]">Loading products...</div>
  ): prod.length === 0? (
    <div className="py-20 text-center text-[#80695b]">No products available.</div>
  ):(
   <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
  {allsearch.map((product) => (
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


 