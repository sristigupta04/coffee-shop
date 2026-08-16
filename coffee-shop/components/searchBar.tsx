
"use client"

import { useRouter } from "next/navigation";
import { useState ,useEffect} from "react";
type Product ={
    id:string;
    name:string;  
    price:number;
   image:string;
}
export default function Search(){
    
    const [item, setitem] = useState("");
    const [prod ,setprod]  = useState<Product[]>([]);
    const [load,setload] = useState(false);
const router = useRouter();

useEffect(()=>{
    const fetching = async()=>{
        if(item.trim() === ""){
            setprod([]);
            setload(false);
            return;
        
        
       
    }

try{
    const res = await fetch("/api/products");
    const data = await res.json();
    const newpod = data.data.filter((product:Product)=>
        product.name.toLowerCase().includes(item.toLowerCase())
    );
    setprod(newpod);
    setload(true);
}catch(error){
    console.error("Error fetching products:", error);
}
    };
    fetching();
},[item]);
const handle = (id:string)=>{
    setitem("");
    setload(false);
    router.push(`/menu/${id}`);
}
    return(
        <div className="relative">
<div className="flex items-center rounded-lg border border-[#d6c4b5] bg-white ">
<input type="text"
placeholder="Search for products"
value={item}
onFocus={()=>{ item && setload(true)}}
onChange={(e)=>setitem(e.target.value)}
    className="w-full rounded-lg border border-[#d6c4b5]  bg-white px-4 py-3 outline-none 
    focus:border-[#8b4a24] " />

    <button 
    type="submit"
    className="rounded-lg bg-[#8b4a24] px-5 py-3 text-white">Search </button>

        </div>

        {load && item &&(
            <div className="absolute left-0 top-full z-50 mt-2 w-full overflow-hidden
            border border-[#eadbc9] bg-white/95 shadow-lg backdrop-blur-sm">
                {prod.length>0 ?(
                    prod.map((product)=>(
                        <button 
                        key={product.id}
                        onClick={()=>handle(product.id)}
                        className="flex w-full items-center gap-3 px-4 py-3
                        text-left transition hover:bg-[#f8eee4]">
                            <img src= {product.image}

                            alt={product.name}
                                className="h-10 w-10 rounded-full object-cover" />
                            
                        <div>
<p className="font-medium text-[#3b2115]">{product.name}</p>

<p className="text-sm text-[#8b4a24]">${product.price}</p>



                        </div>

                        </button>

                    ))
                ):(
                    <p className="px-4 py-3 text-[#3b2115]">No products found</p>
                )}
                </div>
        )}
            </div>

   
    )
}