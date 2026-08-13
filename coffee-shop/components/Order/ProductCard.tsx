"use client"

import {useState} from "react";

type product = {
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

 const increase = ()=>{
    setquant((prev)=>Math.min(100,prev+1))
 }
const decrease = ()=>{
    setquant((prev)=>Math.max(10,prev+1))
};
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
       ₹{price.toFixed(2)}
</p>

{/* quanttity  includee inbox style everything */}



<div className="mt-4 flex item-center justify-between">

    <div className="flex item-center gap-3 rounded-full border border-[#dec9b8] bg-white px-2 py-1">
       <button onClick={increase}
       disabled={quant === 0}
       className="flex h-8 w-8 items-center justify-center rounded-full
       bg-[#8b451f] text-white diabled:opacity-40">
        - </button> 
        <span className="w-5 text-center font-medium text-[#3b2114]">{quant}</span>
        <button  className="flex h-8 w-8 items-center justify-center rounded-full
       bg-[#8b451f] text-white diabled:opacity-40"> +</button>
    </div>
</div>
</div>
   </div> 
)

}