"use client";

import { useState , useEffect } from "react";

import {useParams} from "next/navigation";

type Order ={
    id:string;
    totalPrice:number;
    status:string;
    createdAt:string;
    items:{
        id:string;
        quantity:number;
        price:number;
        product:{
            name:string;
            image:string;
        }
    }[];

};

export default function OrderPage(){
    const params = useParams();
    const [order,setOrder] = useState<Order | null>(null);
    const [loading,setLoading] = useState(true);
    const [error,setError] = useState<string | null>(null);


    useEffect(()=>{
        const getorder = async() =>{
            try{
                const res = await fetch(`/api/orders/${params.id}`);
                const data = await res.json();
                if(!res.ok){
                    throw new Error(`Request failed with status ${res.status}`);
                }
               
                setOrder(data.data);
            }catch(err:any){
                setError(err.message);
            }finally{
                setLoading(false);
            }
        };
        if(params.id){
            getorder();
        }
    },[params.id]);

    if(loading){
        return (
            <main className="flex min-h-screen flex-col items-center justify-between p-24">
                <h1>Loading...</h1>
            </main>
        );
    }
    if(!order){
        return(
            <main className="flex min-h-screen flex-col items-center justify-between p-24">
                <h1>Order not found</h1>
            </main>
        );
    }
     
    
    return(
        <main className="min-h-screen  bg-[#f5f07e7] p-6">
 <div className="mx-auto max-w-4xl">

        <h1 className="text-4xl font-bold text-[#3b2115]">
          Order Details
        </h1>

        <p className="mt-2 text-[#80695b]">
          Order ID: {order.id}
        </p>

        <div className="mt-8 rounded-2xl bg-white p-6 shadow">

          <div className="flex justify-between">
            <span>Status</span>

            <span className="font-semibold">
              {order.status}
            </span>
          </div>

          <div className="mt-3 flex justify-between">
            <span>Date</span>

            <span>
              {new Date(
                order.createdAt
              ).toLocaleDateString()}
            </span>
          </div>

          <div className="mt-6 border-t pt-5">

            {order.items.map(
              (item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 border-b py-4"
                >
                  <img
                    src={
                      item.product.image
                    }
                    alt={
                      item.product.name
                    }
                    className="h-20 w-20 rounded-xl object-cover"
                  />

                  <div className="flex-1">
                    <h3 className="font-semibold">
                      {
                        item.product
                          .name
                      }
                    </h3>

                    <p className="text-sm text-gray-500">
                      Quantity:{" "}
                      {item.quantity}
                    </p>
                  </div>

                  <p className="font-semibold">
                    ₹
                    {(
                      item.price *
                      item.quantity
                    ).toFixed(0)}
                  </p>
                </div>
              )
            )}

          </div>

          <div className="mt-6 flex justify-between text-xl font-bold">
            <span>Total</span>

            <span>
              ₹
              {order.totalPrice.toFixed(
                0
              )}
            </span>
          </div>

        </div>

      </div>

        </main>
    )
    
    }

        