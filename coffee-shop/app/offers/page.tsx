
"use client";

import { useState } from "react";

import Offer from "../../components/offers/card";

type Offer ={
    id:number;
    name:string;
    description:string;
    discount:number;
    applied:boolean;
    code:string;
}
type OfferProp ={
    offerProps:Offer[];
}

export default function Offers(){
    const [card , setcard] = useState<Offer[]>([
         {
        id: 1,
        name: "20% OFF",
        description: "Get 20% off on your next order",
        discount: 20,
        applied: false,
        code: "COFFEE20",
    },
    {
        id: 2,
        name: "₹100 OFF",
        description: "Get ₹100 off on orders above ₹500",
        discount: 100,
        applied: false,
        code: "BREW100",
    },
    ])
    
    const Apply = (id:number)=>{
      setcard((prevcard)=>
        prevcard.map((offer)=>({
          ...offer,
          applied:offer.id === id,
        }))
      )
    }
    
    const copy = async(code:string)=>{
      await navigator.clipboard.writeText(code);
    }
    return (
        <main
        className="min-h-screen w-full  bg-[#f7f1e8] px-4 py-8 text-[#3e2416]"
        >

<div className="mx-auto w-full max-w-2xl">
<div className="mb-8">
  <h1 className="text-3xl font-bold">
    Offers
  </h1>

  <p className="mt-2 text-sm text-[#7b6252]">
    Special offers just for you
  </p>
</div>

  <div className="mt-8 space-y-4">

    {card.map((offer) => (
        <Offer key={offer.id} offer={offer} onApply={Apply} onCopyCode={copy} 
        className="rounded-2xl bg-white p-5 shadow-sm"/>
    ))}
    </div>
</div>

        </main>
    )
}

