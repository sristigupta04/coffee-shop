"use client";

import { useState } from "react";

type item ={
  id:string;
  name:string;
  price:number;
  quantity:number;
}

type pro={
  address:string;
  phone:number;
  paymentWay:string;
  order:React.ReactNode;
  placeBtn:React.ReactNode;
  item:item[];
}

export default function Checkout({address,phone,paymentWay,order,placeBtn,item}:pro){
  const [load ,setload] =useState(false);
  const total = item.reduce((acc,item)=>{
    acc += item.price * item.quantity;
    return acc;
  }, 0);
 const handles = async()=>{
      setload(true);
  try{
    const res =  await fetch("/api/orders",{
      method:'POST',
      headers:{
        'Content-Type':'application/json'
      },
      body:JSON.stringify({
        address, phone, paymentWay, item,total
      })
    });
   
    
    const data = await res.json();
    if(!res.ok){
      throw new Error(`Request failed: ${res.status}`);

    }
    console.log(data);
  }catch(err){
    console.error(err);
   
    }finally{
      setload(false)
    }
  }
      return(
<div>
{order}
<button onClick={handles} disabled={load} className="bg-[#6f4e37] text-white px-4 py-2 rounded-md hover:bg-[#5a3e2b] disabled:opacity-50">{load ? "Placing Order..." : "Place Order"}</button>
  Place Order

{placeBtn}
</div>
      )
  
    }