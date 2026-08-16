"use client"


import { useParams } from "next/navigation";
import { useState ,useEffect} from "react";

type Product ={
    id:string;
    name:string;  
    price:number;
    description:string;
   image:string;
   category:string;
   stock:number;
   isAvailable:boolean;
}


export default function  Details(){
  const params = useParams();
  const [prod,setprod] = useState<Product | null>(null);
  useEffect(()=>{
    const fetching = async()=>{
      const res = await fetch(`/api/products/${params.id}`);
      const data = await res.json();
      if(res.ok){
        setprod(data.data);
      }
    }
    if(params.id){
      fetching();
    }
  },[params.id]);
  if(!prod){
    return <div>Loading...</div>
  }
  return(
<main className="min-h-screen bg-{#f8f3ed] p-10">
  <div className="mx-auto max-w-5xl rounded-2xl bg-white p-6 shadow">
    <img src={prod.image} alt={prod.name} className="h-96 w-full rounded-xl object-cover" />

    <h1 className="mt-6 text-4xl font-bold text-[#3b2115]">{prod.name}</h1>

    <p className="mt-3 text-[#80695b]">{prod.description}</p>

    <p className="mt-4 text-2xl font-bold text-[#4b2e20]">${prod.price.toFixed(2)}</p>

    <p className="mt-2 text-[#80695b]">Category: {prod.category}</p>

  </div>
</main>
  )
    }
