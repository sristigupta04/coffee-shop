"use client";

import { useRouter } from "next/dist/client/components/navigation";
import { useState } from "react";

type Item ={
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
  item:Item[];
}

export default function Checkout({address,phone,paymentWay,order,placeBtn,item}:pro){
  const [load ,setload] =useState(false);
  const router = useRouter();

  const total = item.reduce((acc,item)=>{
    acc += item.price * item.quantity;
    return acc;
  }, 0);
  const tax = total * 0.1;
  const grandTotal = total + tax;
 const handles = async()=>{
  if(!address || !phone || !paymentWay){
    alert("Please fill all the fields");
    return;
  }
  if(item.length === 0){
    alert("Cart is empty");
    return;
  }

  try{
          setload(true);
if(paymentWay === "ONLINE"){
    const res =  await fetch("/api/payment/create-order",{
      method:'POST',
      headers:{
        'Content-Type':'application/json'
      },
      credentials:'include',
      body:JSON.stringify({
        amount:grandTotal
      })
    });
   
    
    const data = await res.json();
    if(!res.ok){
      throw new Error(`Request failed: ${res.status}`);

    }
    console.log(data.data);
    const options ={
      key:process.env.RAZORPAY_KEY_ID as string,
      amount:data.data.amount,
      currency:data.data.currency,
      name:"Coffee Shop",
      description:"Test Transaction",
      order_id:data.data.id,
    
    handler:async function(response:any){
      try{
        const verifyRes = await fetch("/api/payment/verify",{
          method:'POST',
          headers:{
            'Content-Type':'application/json'
          },
          credentials:'include',
          body:JSON.stringify({
            razorpay_order_id:response.razorpay_order_id,
            razorpay_payment_id:response.razorpay_payment_id,
            razorpay_signature:response.razorpay_signature,
          })
        });
        const verifyData = await verifyRes.json();
        if(!verifyRes.ok){
          throw new Error(`Request failed: ${verifyRes.status}`);
        }
        alert(verifyData.message);
      }catch(err){
        console.error(err);
        alert(err instanceof Error ? err.message : "An error occurred");
      
      }
      console.log(response);
      alert("Payment successful");
    },

    prefill:{
      name:"",
      contact:phone,
    },
    theme:{
      color:"#6f4e37",
    },

  };
  const razorpay = new (window as any).Razorpay(options);
  razorpay.open();

    
    return;
  }
  const res = await fetch("/api/orders",{
    method:'POST',
    headers:{
      'Content-Type':'application/json'
    },
    credentials:'include',
    body:JSON.stringify({
      address, phone, paymentWay, item,total
    })
  });
  const data = await res.json();
  if(!res.ok){
    throw new Error(`Request failed: ${res.status}`);
  }
  console.log(data);
  alert("Order placed successfully");
  router.push(`/order/${data.data.id}`);

  }catch(err){
    console.error(err);
    alert(err instanceof Error ? err.message : "An error occurred");

   
    }finally{
      setload(false)
    }
  }
      return(

<div>
{order}
<p className="text-lg font-semibold">Total: ${total.toFixed(2)}</p>
<button onClick={handles} disabled={load} className="bg-[#6f4e37] text-white px-4 py-2 rounded-md hover:bg-[#5a3e2b] disabled:opacity-50">{load ? "Placing Order..." : "Place Order"}</button>
  Place Order

{placeBtn}
</div>
      )
  
    }