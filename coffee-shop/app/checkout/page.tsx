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
  const [couponCode, setCouponCode] = useState("");
const [discountAmount, setDiscountAmount] = useState(0);
const [couponMessage, setCouponMessage] = useState("");
  const router = useRouter();

  const total = item.reduce((acc,item)=>{
    acc += item.price * item.quantity;
    return acc;
  }, 0);
  const tax = total * 0.1;
  const grandTotal = total + tax - discountAmount;
  const apply = async()=>{
    if(!couponCode.trim()){
      setCouponMessage("Please enter a coupon code");
      return;
    }
    try{
      const res = await fetch("/api/coupon/validate",{
        method:'POST',
        headers:{
          'Content-Type':'application/json'
        },
        body:JSON.stringify({
          coupon: couponCode,
          totalAmount: grandTotal,
        })
      });
      const data = await res.json();
       if(!res.ok){
        setCouponMessage(data.error || "Failed to apply coupon");
        setDiscountAmount(0);
        return;
      }
      setDiscountAmount(data.discountAmount);
      setCouponMessage(`Coupon applied! You saved ₹${data.discountAmount}`);
    }catch(err){
      console.error(err);
      setCouponMessage("An error occurred while applying the coupon");
      setDiscountAmount(0);
    }
  }
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
      address, phone, paymentWay, couponCode, item, total
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
      setload(false);
    }
  }
      return(

<div>
<div className="my-4 flex gap-2">
  <input
    type="text"
    value={couponCode}
    onChange={(e) => setCouponCode(e.target.value)}
    placeholder="Enter coupon"
    className="border px-3 py-2 rounded-md"
  />

  <button
    type="button"
    onClick={apply}
    className="bg-[#6f4e37] text-white px-4 py-2 rounded-md"
  >
    Apply
  </button>
</div>

{couponMessage && (
  <p className="text-sm mb-2">
    {couponMessage}
  </p>
)}
</div>

      )
  
    }