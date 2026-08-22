"use client"

import {useState} from "react";
import {useSession} from "next-auth/react";
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
 const {image,name, description,price} = product;

const {status,data:session} = useSession();
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

    window.dispatchEvent(new CustomEvent("cartUpdate"));
  
    } catch(error){
        console.error("Error adding item to cart:", error);
    }
}
   const decrease = () => {
  setquant((prev) => Math.max(1, prev - 1));
   }


return(
   <div className="overflow-hidden rounded-2xl border
   border-[#eadbc9] bg-[#ffaf3] shadow-sm transition
   hover:-transalate-y-1 hover:shadow-md">


{/* image  section
 */}

<div className="relative h-56 w-full overflow-hidden">
    <img src={image} alt={name} className="h-full w-full object-cover"/>
</div>

{/* content  of price */}


<div className="p-5">


    <h3 className="text-lg font-semibold text-[#3b2114]">{name}</h3>



<p className="mt-3 text-lg font-bold text-[#8b451f]">
       ₹{price}
</p>

{/* quanttity  includee inbox style everything */}


<div className="mt-4 flex items-center justify-between">

  <div className="flex items-center gap-3 rounded-full border border-[#dec9b8] bg-white px-2 py-1">

    <button
      type="button"
      onClick={decrease}
      disabled={quant <= 1}
      className="flex h-8 w-8 items-center justify-center rounded-full bg-[#8b451f] text-white disabled:opacity-40"
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
      className="flex h-8 w-8 items-center justify-center rounded-full bg-[#8b451f] text-white disabled:opacity-40"
    >
      +
    </button>

  </div>

</div>
</div>
   </div> 
)

}