"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {useSession} from "next-auth/react";
type Item ={
  id:string;
  name:string;
  price:number;
  quantity:number;
}

type pro={
  item:Item[];
}

export default function Checkout({item}:pro){
  const [load ,setload] =useState(false);
  const [couponCode, setCouponCode] = useState("");
const [discountAmount, setDiscountAmount] = useState(0);
const [couponMessage, setCouponMessage] = useState("");
const [address, setAddress] = useState("");
const [phone, setPhone] = useState("");
const [paymentWay, setPaymentWay] = useState("COD");
  const router = useRouter();
const { data: session } = useSession();

const [cartItems, setCartItems] = useState<Item[]>([]);


useEffect(() => {
  const getCart = async () => {
    if (!session?.user?.id) {
      return;
    }
    try{
      const res = await fetch(`/api/cart/${session.user.id}`);
      const data = await res.json();
      if(!res.ok){
        throw new Error(data.message || "Failed to fetch cart");
      }
      const items = data.data?.items || [];
      setCartItems(
items.map((item: any) => ({
        id: item.product.id,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
      }))
      );  

    }catch(err){
      console.error(err);
    }
  };
  getCart();
}, [session]);


const total = cartItems.reduce((acc, item) => {  
  acc += item.price * item.quantity;
    return acc;
  }, 0);

  const tax = total * 0.1;
  const subtotal = total + tax;
  const grandTotal = Math.max(0, subtotal - discountAmount);
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
        body: JSON.stringify({
  code: couponCode,
  totalAmount: subtotal,
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
  if(!address || !address.trim()){
    alert("Please fill all the fields");
    return;
  }
  if(!phone || !phone.toString().trim()){
    alert("Please fill all the fields");
    return;
  }

  if(phone.length <10){
    alert("Please enter a valid phone number");
    return;
  }
  if(cartItems.length === 0){
    alert("Cart is empty");
    return;
  }

  if(!paymentWay || !paymentWay.trim()){
    alert("Please select a payment method");
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
        amount:subtotal,
        couponCode,
        discountAmount,
        finalAmount:grandTotal,
      })
    });
   
    
    const data = await res.json();
    if(!res.ok){
      throw new Error(`Request failed: ${res.status}`);

    }
    console.log(data.data);
    const options ={
key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID as string,
      amount:data.data.amount,
      currency:data.data.currency,
      name:"Coffee Shop",
      description:"Test Transaction",
      order_id:data.data.id,
      prefill:{
        name:"",
        contact:phone,
      },
      theme:{
        color:"#6f4e37",
      },
    
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
            couponCode:couponCode,
            address,
            phone,
          })
        });
        const verifyData = await verifyRes.json();
        if(!verifyRes.ok){
          throw new Error(`Request failed: ${verifyRes.status}`);
        }
        alert(verifyData.message);
        if(verifyData.data?.id) {
router.push(`/orders/${verifyData.data.id}`);
        }else{
          router.push("/orders");
        }
      }catch(err){
        console.error(err);
        alert(err instanceof Error ? err.message : "An error occurred");
      
      }
      console.log(response);
    },


  };
  if(!(window as any).Razorpay){
    throw new Error("Razorpay SDK not loaded");
  }
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
      address, phone, paymentWay, couponCode,
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
  return (
  <main className="min-h-screen bg-[#f8f3ed] px-4 py-10 sm:px-6 lg:px-10">
    <div className="mx-auto max-w-6xl">

      <h1 className="text-4xl font-bold text-[#3b2115]">
        Checkout
      </h1>

      <p className="mt-2 text-[#80695b]">
        Complete your order
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">

        {/* LEFT SIDE */}
        <section className="rounded-3xl bg-white p-6 shadow-sm">

          {/* ADDRESS */}
          <div>
            <h2 className="text-xl font-semibold text-[#3b2115]">
              Delivery Address
            </h2>

            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter your delivery address"
              rows={4}
              className="mt-4 w-full rounded-xl border border-[#d8c8ba] bg-[#fffdfa] p-3 outline-none focus:border-[#6f4e37]"
            />
          </div>

          {/* PHONE */}
          <div className="mt-6">
            <h2 className="text-xl font-semibold text-[#3b2115]">
              Phone Number
            </h2>

            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Enter phone number"
              className="mt-4 w-full rounded-xl border border-[#d8c8ba] bg-[#fffdfa] p-3 outline-none focus:border-[#6f4e37]"
            />
          </div>

          {/* PAYMENT */}
          <div className="mt-6">
            <h2 className="text-xl font-semibold text-[#3b2115]">
              Payment Method
            </h2>

            <select
              value={paymentWay}
              onChange={(e) => setPaymentWay(e.target.value)}
              className="mt-4 w-full rounded-xl border border-[#d8c8ba] bg-[#fffdfa] p-3 outline-none focus:border-[#6f4e37]"
            >
              <option value="COD">
                Cash on Delivery
              </option>

              <option value="ONLINE">
                Online Payment
              </option>
            </select>
          </div>

        </section>

        {/* RIGHT SIDE */}
        <aside className="h-fit rounded-3xl bg-[#e1e6dc] p-6">

          <h2 className="text-2xl font-semibold text-[#3b2115]">
            Order Summary
          </h2>

          {/* CART ITEMS */}
          <div className="mt-6 space-y-4">
            {cartItems.map((product) => (
              <div
                key={product.id}
                className="flex justify-between gap-4"
              >
                <div>
                  <p className="font-medium text-[#3b2115]">
                    {product.name}
                  </p>

                  <p className="text-sm text-[#80695b]">
                    Qty: {product.quantity}
                  </p>
                </div>

                <p className="font-semibold text-[#3b2115]">
                  ₹{(product.price * product.quantity).toFixed(2)}
                </p>
              </div>
            ))}
          </div>

          {/* COUPON */}
          <div className="mt-6 flex gap-2">
            <input
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              placeholder="Enter coupon"
              className="min-w-0 flex-1 rounded-xl border border-[#c5cec0] bg-white px-3 py-2 outline-none focus:border-[#6f4e37]"
            />

            <button
              type="button"
              onClick={apply}
              className="rounded-xl bg-[#6f4e37] px-4 py-2 text-white"
            >
              Apply
            </button>
          </div>

          {couponMessage && (
            <p className="mt-2 text-sm text-[#80695b]">
              {couponMessage}
            </p>
          )}

          {/* TOTALS */}
          <div className="mt-6 space-y-3 border-t border-[#c5cec0] pt-5">

            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>₹{total.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-sm">
              <span>Tax</span>
              <span>₹{tax.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-sm">
              <span>Discount</span>
              <span>₹{discountAmount.toFixed(2)}</span>
            </div>

            <div className="flex justify-between border-t border-[#c5cec0] pt-4 text-lg font-bold text-[#3b2115]">
              <span>Final Total</span>
              <span>₹{grandTotal.toFixed(2)}</span>
            </div>

          </div>

          {/* PLACE ORDER */}
          <button
            type="button"
            onClick={handles}
            disabled={load || cartItems.length === 0}
            className="mt-7 w-full rounded-full bg-[#6f4e37] py-4 font-semibold text-white transition hover:bg-[#5a3e2b] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {load ? "Processing..." : "Place Order"}
          </button>

        </aside>

      </div>
    </div>
  </main>
);
}