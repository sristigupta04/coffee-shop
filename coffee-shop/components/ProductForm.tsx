"use client"

import { useState } from "react";

// import product from MenuCard
type product ={
    onSubmit :(product :{
    name:string;
    price:number;
    description:string;
   image:string;
   category:string;
   stock:number;
   isAvailable:boolean;
})=>void;
}

export default function Productform({
    onSubmit,
}:product){


    const[ form, setform] = useState({
        name:"",
        price:0,    
    description:"",
    image:"",
    category:"",
    stock:0,
    isAvailable:true,
    });

const handle =(
    e:React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
)=>{
    const {name,value} = e.target;
    setform((prev)=>({
        ...prev,
        [name]:name ==="price" || name ==="stock"
        ? Number(value) : value,

    }))
}   

const submit = (e:React.FormEvent<HTMLFormElement>)=>{
    e.preventDefault();
    onSubmit(form);
}

return (
    <form 
    onSubmit={submit}
    className="mx-auto flex w-full
     max-w-lg flex-col gap-5 rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="text-3xl font-bold text-[#3b2115]">Add  new Productt</h1>

        {/* product name  */}
        <div>
            <label className="mb-2 block text-sm font-medium text-[#3b2115]">
                Product Name
            </label>
        
        <input
        type="text"
        name="name"
        value={form.name}
        onChange={handle}
        placeholder="Product Name"
        className="w-full rounded-lg border border-[#d6c4b5] px-4 py-3 outline-none focus:border-[#8b4a24]"/></div>

        {/* product price  */}
        <div>

            <label className="mb-2 block text-sm font-medium text-[#3b2115]">
                Product Price
            </label>
            <input
            type="number"   
            name="price"
            value={form.price}
            onChange={handle}
            placeholder="Product Price"
            className="w-full rounded-lg border border-[#d6c4b5] px-4 py-3 outline-none focus:border-[#8b4a24]"/>
        </div>



        {/* product description  */}
        <div>
            <label className="mb-2 block text-sm font-medium text-[#3b2115]">
                Product Description         
    </label>

            <textarea
            name="description"
            value={form.description}
            onChange={handle}
            placeholder="Product Description"
            className="w-full rounded-lg border border-[#d6c4b5] px-4 py-3 outline-none focus:border-[#8b4a24]"/>
        </div>  


        {/* category */}

<div>


            <label className="mb-2 block text-sm font-medium text-[#3b2115]">
                Product Category
            </label>                    
            <input 
            type="text"
            name="category"
            value={form.category}
            onChange={handle}
            placeholder="Product Category"
            className="w-full rounded-lg border border-[#d6c4b5] px-4 py-3 outline-none focus:border-[#8b4a24]"/>

</div>


{/* imgae wala sections */}

<div>

            <label className="mb-2 block text-sm font-medium text-[#3b2115]">
                Product Image URL
            </label>
                <input 
                type="text"
                name="image"
                value={form.image}   
                onChange={handle}
                placeholder="Product Image URL"
                className="w-full rounded-lg border border-[#d6c4b5] px-4 py-3 outline-none focus:border-[#8b4a24]"/>
                
</div>

{/* stockk  fileds */}
<div >


    <label className="mb-2 block text-sm font-medium text-[#3b2115]">
        Product Stock
    </label>
    <input 
    type="number"
    name="stock"
    value={form.stock}
    onChange={handle}
    placeholder="Product Stock"
    className="w-full rounded-lg border border-[#d6c4b5] px-4 py-3 outline-none focus:border-[#8b4a24]"/>
</div>
<div >

    <label className="flex items-center gap-3 text-sm font-medium text-[#3b2115]">
        <input 
        type="checkbox"
        name="isAvailable"
        checked={form.isAvailable}
        onChange={(e)=>setform((prev)=>({       
            ...prev,
            isAvailable:e.target.checked,
        }))}
        />
        Product is Available
    </label>
</div>
<button 
type="submit"
className="rounded-lg bg-[#8b4a24] px-4 py-2 text-white hover:bg-[#6f351c]">add product </button></form>
)
}