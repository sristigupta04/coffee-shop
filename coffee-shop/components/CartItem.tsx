"use client";


type Props = {
  image: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  totalPrice: number;

  removeitem: () => void;
  onincrease:()=>void;
  ondecrease:()=>void;
 
};

export default function CartItem({
  image,
  name,
  category,
  price,
  quantity,
  totalPrice,
  removeitem,
  onincrease,
  ondecrease,
}: Props) {
  return (
    <div className="flex items-center justify-between bg-white rounded-xl shadow-md p-5 mb-5">
      
      {/* Image */}
      <img
        src={image}
        alt={name}
        className="w-28 h-28 rounded-lg object-cover"
      />





      {/* Product Details */}
      <div className="flex-1 ml-6">
        <h2 className="text-2xl font-bold">{name}</h2>

        <p className="text-gray-500">{category}</p>

        <p className="mt-2 font-semibold">
          Price: ₹{price}
        </p>

        <p className="mt-1">
          Quantity: {quantity}
        </p>

        <p className="mt-1 text-amber-700 font-bold">
          Total: ₹{totalPrice}
        </p>
      </div>

      {/* Buttons */}
      <div className=" mt-3 flex items-center  gap-3">

        <button
          onClick={ondecrease}
          className=" flex h-8 w-8 items-center justify-center rounded-full
          bg-[#9a4f24] text-white hover:bg-[#7a3620]"
        >
          -
        </button>



     <span className="w-6 text-center font-semibold text-[#3b2115]">
  {quantity}
</span>
                 


                  <button onClick={onincrease}
          className=" flex h-8 w-8 items-center justify-center rounded-full
          bg-[#9a4f24] text-white hover:bg-[#7a3620]"
        >
          +
        </button>
      </div>


      <button onClick={removeitem} 
      className="rounded-lg bg-red-500 px-4 py-2 text-white hover:bg-red-600">
        Remove
      </button>

    </div>
  );
}


// export default  function MenuCard({ product }: product){
//     const [quant,setquant] = useState(1);
//     const decrease =()=>{
//         const newquant = Math.max(1,quant-1);
//         setquant(newquant);
//         product.onAddToCart(newquant);
//     }
//      const increase =()=>{
//         const newquant = Math.min(10,quant+1);
//         setquant(newquant);
//         product.onAddToCart(newquant);
//      }

     