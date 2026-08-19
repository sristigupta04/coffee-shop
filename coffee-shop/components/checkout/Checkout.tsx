"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";


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
    const router = useRouter();
    const [address, setAddress] = useState("");
    const [phone, setPhone] = useState("");
    const [paymentWay, setPaymentWay] = useState("COD");
    const [load ,setload] =useState(false);

    const total = item.reduce((acc,item)=>{
        acc += item.price * item.quantity;
        return acc;
    }, 0);
    const tax = total * 0.1; // Assuming a 10% tax rate
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
            const res =  await fetch("/api/orders",{
                method:'POST',
                headers:{
                    'Content-Type':'application/json'
                },
                body:JSON.stringify({
                    address, phone, paymentWay, item,total, tax, grandTotal
                })
            });
            const data = await res.json();
            if(!res.ok){
                alert("Failed to place order");
                router.push("/");
            }
            alert("Order placed successfully");
            router.push(`/orders/${data.data.id}`);
        }catch(error){
            console.error("Error placing order:", error);
            
            alert(error instanceof Error ? error.message : "An unexpected error occurred");
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
                onChange={(e) =>
                  setAddress(e.target.value)
                }
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
                onChange={(e) =>
                  setPhone(e.target.value)
                }
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
                onChange={(e) =>
                  setPaymentWay(e.target.value)
                }
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

            {/* ITEMS */}

            <div className="mt-6 space-y-4">

              {item.map((product) => (
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
                    ₹
                    {(
                      product.price *
                      product.quantity
                    ).toFixed(0)}
                  </p>

                </div>
              ))}

            </div>

            {/* TOTALS */}

            <div className="mt-6 border-t border-[#c5cec0] pt-5 space-y-3">

              <div className="flex justify-between text-sm text-[#80695b]">
                <span>Subtotal</span>

                <span>
                  ₹{grandTotal.toFixed(0)}
                </span>
              </div>

              <div className="flex justify-between text-sm text-[#80695b]">
                <span>Tax</span>

                <span>
                  ₹{tax.toFixed(0)}
                </span>
              </div>

              <div className="flex justify-between border-t border-[#c5cec0] pt-4 text-lg font-bold text-[#3b2115]">
                <span>Total</span>

                <span>
                  ₹{grandTotal.toFixed(0)}
                </span>
              </div>

            </div>

            {/* PLACE ORDER */}

            <button
              type="button"
              onClick={handles}
              disabled={load || item.length === 0}
              className="mt-7 w-full rounded-full bg-[#6f4e37] py-4 font-semibold text-white transition hover:bg-[#5a3e2b] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {load
                ? "Placing Order..."
                : "Place Order"}
            </button>

          </aside>

        </div>

      </div>

    </main>
  );
}