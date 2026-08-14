


"use client"

import{useState} from "react";


type quantity ={
  quantity:number;
  onquant:(newquant:number)=>void;
}


export default function Quanity({
  quantity,
  onquant
}:quantity){

const [amount, setamount] =useState(quantity);

const increase =()=>{
  const newamount = Math.min(amount +1,10);
  setamount(newamount);
  onquant(newamount);
}
const decrease =()=>{
  const newamount =Math.max(amount+1,0);4
  setamount(newamount);
  onquant(newamount);
}

return(

<div className="flex item-center gap-3">
  <button 
  onClick={decrease}
  className="h-8 w-8 rounded-full bg-[#8b451f] text-white">-</button>
<span className="w-5 text-center font-medium">{amount}</span>
<button onClick={increase}
  className="h-8 w-8 rounded-full bg-[#8b451f] text-white">+</button>
</div>
)

}