


"use client"

import{useState} from "react";


type Quantity ={
  quantity:number;
  Onquant:(newquant:number)=>void;
}


export default function Quanity({
  quantity,
  Onquant
}:Quantity){

const [amount, setamount] =useState(quantity);

const increase =()=>{
  const newamount = Math.min(amount +1,10);
  setamount(newamount);
  Onquant(newamount);
}
const decrease =()=>{
  const newamount =Math.max(amount-1,0);
  setamount(newamount);
  Onquant(newamount);
}

return(

<div className="flex items-center gap-3">
  <button 
  onClick={decrease}
  className="  flex h-8 w-8  items-center justify-center rounded-full bg-[#8b451f] text-white transition 
  hover:bg-[#6f351c]">-</button>



<span className="w-5 text-center font-medium text-[#3b2115]">{amount}</span>
<button onClick={increase}
  className="h-8 w-8 rounded-full bg-[#8b451f] text-white hover:bg-[#6f351c]">+</button>
</div>
)

}