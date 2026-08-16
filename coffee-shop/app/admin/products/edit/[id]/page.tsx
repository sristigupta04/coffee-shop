"use client"

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import Productform from "@/components/ProductForm";


type Product = {
    name:string;
    description:string;
    price:number;
    category:string;

    image:string;
    stock:number;
    isAvailable:boolean;

}

export default function edit(){
    const params = useParams();
    const router = useRouter();
    const [prod ,setprod] = useState<Product | null>(null);
const[load,setload] = useState(true);
    useEffect(()=>{
        const fetchprod = async()=>{
        try{
            
                const res = await fetch(`/api/products/${params.id}`);
                const data = await res.json();
                if(!res.ok){
                    alert(data.message);
                    router.push("/admin/products");
                    return;
                }
                    setprod(data.data);

        }catch(error){
            console.log(error);
            alert("Something went wrong");
        }finally{
            setload(false);
            console.log("fetching product");
        }
    };
    if(params.id){
        setprod(null);
        fetchprod();
    }
}, [params.id,router]);



    const update =  async(form:Product)=>{
        try{
            const res=await fetch(`/api/products/${params.id}`,{
                method:"PUT",
                headers:{
                    "Content-Type":"application/json"
                },
                body:JSON.stringify(form)
            });
            if(!res.ok){
               alert("Failed to update product");
               return;
            }
              router.push("/admin/products");
        }catch(error){
            console.log(error);
        }
    }
    if(!load){
    return(
        <div className="flex min-h-screen items-center justify-center">
            loading...
        </div>
    )
}
if(!prod){
    return(
        <div className="flex min-h-screen items-center justify-center">
            prduct not found
        </div>
    )
}

   
 


return(
    <main className="min-h-screen bg-[#f8f3ed] px-4 py-10">
        <Productform 
        onSubmit={update}

     initialval={prod}
     btntext="Update Product"
        />
    </main>
)
}