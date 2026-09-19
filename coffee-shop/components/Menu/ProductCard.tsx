"use client"

import {useEffect, useState} from "react";
import {useSession} from "next-auth/react";
import {Heart} from "lucide-react";

type product = {
    id:string;
    image:string;
    name:string;
    description:string;
    price:string;
}


type categoryProduct ={
    product:product
}

export default function Product({
    product
}:categoryProduct){
    const [quant,setquant] = useState(0);
    const [wishlist,setwishlist] = useState(false);
    const [wishlistLoading,setwishlistLoading] = useState(false);

 const {image,name, description,price} = product;

const {status,data:session} = useSession();
useEffect(()=>{
    if(status !== "authenticated" ||  !session?.user?.id){
        return;
    }
    const checkWishlist = async()=>{
        try{
            const res = await fetch(`/api/wishlist/${product.id}`);
            if(!res.ok){
                return;
            }
            const data = await res.json();
            const wishlistItem = data.data || [];
            const exist = wishlistItem.some((item:any)=> item.productId === product.id);
            setwishlist(exist);
        } catch(error){
            console.error("Error checking wishlist:", error);
        }
    };

    checkWishlist();
}, [status, session, product.id]);

 const increase = async ()=>{
    if(status !== "authenticated" || !session?.user?.id){
        alert("Please login to add items to cart");
        return;
    }

    try{
        const res = await fetch(`/api/cart/${session.user.id}`,{
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                productId: product.id,
                quantity: quant + 1,
            })
        });

        const data = await res.json();
        if(!res.ok){
            throw new Error("Failed to add item to cart");
        }
const newquant = quant + 1;
setquant(newquant);

window.dispatchEvent(new CustomEvent("cartUpdated"));  
    } catch(error){
        console.error("Error adding item to cart:", error);
    }
}
   const decrease = () => {
  setquant((prev) => Math.max(1, prev - 1));
   }

   const toggleWishlist = async () => {
    if (status !== "authenticated" || !session?.user?.id) {
      alert("Please login to manage wishlist");
      return;
    }
    if(wishlistLoading){
        return;
    }
    try{
      setwishlistLoading(true);
        if(!wishlist){
            const res = await fetch(`/api/wishlist`,{
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    productId: product.id,
                })
            });
            const data = await res.json();
            if(!res.ok){
                throw new Error("Failed to add item to wishlist");
            }
            setwishlist(true);
        }
        else{
            const res = await fetch(`/api/wishlist/${product.id}`,{
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json"
                },
                body:JSON.stringify({
                    productId: product.id,
                })  
            });
            const data = await res.json();
            if(!res.ok){
                throw new Error("Failed to remove item from wishlist");
            }
            setwishlist(false);
        }
    } catch(error){
        console.error("Error managing wishlist:", error);
    } finally{
        setwishlistLoading(false);  
    }
    }

 return (
    <div
      className="
        overflow-hidden rounded-2xl border
        border-[#eadbc9] bg-[#fffaf3] shadow-sm
        transition hover:-translate-y-1 hover:shadow-md
      "
    >
      {/* ========================================
          IMAGE
      ======================================== */}

      <div className="relative h-56 w-full overflow-hidden">
        <img
          src={image}
          alt={name}
          className="h-full w-full object-cover"
        />

        {/* WISHLIST BUTTON */}

        <button
          type="button"
          onClick={toggleWishlist}
          disabled={wishlistLoading}
          aria-label={
            wishlist
              ? "Remove from wishlist"
              : "Add to wishlist"
          }
          className="
            absolute right-3 top-3
            flex h-10 w-10 items-center justify-center
            rounded-full bg-white/90 shadow-md
            backdrop-blur-sm
            transition hover:scale-105
            disabled:cursor-not-allowed
            disabled:opacity-60
          "
        >
          <Heart
            size={21}
            className={
            wishlist
                ? "fill-[#b75d08] text-[#b75d08]"
                : "text-[#6b4630]"
            }
          />
        </button>
      </div>

      {/* ========================================
          CONTENT
      ======================================== */}

      <div className="p-5">

        <h3 className="text-lg font-semibold text-[#3b2114]">
          {name}
        </h3>

        {description && (
          <p className="mt-2 line-clamp-2 text-sm text-[#806b5c]">
            {description}
          </p>
        )}

        <p className="mt-3 text-lg font-bold text-[#8b451f]">
          ₹{price}
        </p>

        {/* ========================================
            QUANTITY
        ======================================== */}

        <div className="mt-4 flex items-center justify-between">

          <div
            className="
              flex items-center gap-3
              rounded-full border
              border-[#dec9b8]
              bg-white px-2 py-1
            "
          >
            <button
              type="button"
              onClick={decrease}
              disabled={quant <= 1}
              className="
                flex h-8 w-8 items-center
                justify-center rounded-full
                bg-[#8b451f] text-white
                disabled:opacity-40
              "
            >
              -
            </button>

            <span className="w-5 text-center font-medium text-[#3b2114]">
              {quant}
            </span>

            <button
              type="button"
              onClick={increase}
              disabled={quant >= 100}
              className="
                flex h-8 w-8 items-center
                justify-center rounded-full
                bg-[#8b451f] text-white
                disabled:opacity-40
              "
            >
              +
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}