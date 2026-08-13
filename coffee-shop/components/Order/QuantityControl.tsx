
// type Quantity ={
//     quantity:number;
//     onQuantityChange:(newQuantity:number)=>void;
// }
// type control={
//     quantity:Quantity;

// }


// export default function QuantityControl({
//   quantity,
//   onQuantityChange,
// }: QuantityControlProps) {
//   const [amount, setAmount] = useState(quantity);

//   const handleIncrement = () => {
//     const newAmount = Math.min(amount + 1, 10);

//     setAmount(newAmount);
//     onQuantityChange(newAmount);
//   };

//   const handleDecrement = () => {
//     const newAmount = Math.max(amount - 1, 0);

//     setAmount(newAmount);
//     onQuantityChange(newAmount);
//   };

//   return (
//     <div className="flex items-center gap-2">
//       <button
//         onClick={handleDecrement}
//         className="rounded bg-gray-300 px-2 py-1"
//       >
//         -
//       </button>

//       <span>{amount}</span>

//       <button
//         onClick={handleIncrement}
//         className="rounded bg-gray-300 px-2 py-1"
//       >
//         +
//       </button>
//     </div>
//   );
// }



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