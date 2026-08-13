
import {product} from "@/types/product";
import {NextRequest, NextResponse} from "next/server";
export async function  prod(req:NextRequest){
  const res= await fetch("http://localhost:3000/api/products");
  const result = await res.json();
  if(!result.success){
    return NextResponse.json({
      success:"false",
      message:"product failed",
      data:res},{status:200})
    }
      return result.data;
  }

export async function byId(id:Number):Promise<product | null> {
const res= await fetch("http://localhost:3000/api/products");
const result = await res.json();
if(!result.success){
  return null;
}
return result.data;
}

export async function postId(req:NextRequest){
  const res= await fetch("http://localhost:3000/api/products",{
    method:"POST",
    body:req.body,
  });
  const val = await res.json();
  if(!val.success){
    return NextResponse.json({
      success:"false",
      message:"not found product",
      data:res},{status:200})
  }
  return val.data;
}


export async function updateProd(req:NextRequest){
  const res= await fetch(
"http://localhost:3000/api/products",{
  method:'PUT',
  body:JSON.stringify(req.body),
})
const  val = await res.json();
if(!val.success){
  return NextResponse.json({
    success:"false",
    message:"not found product",
    data:res},{status:200})
  }
  return val.data;
}


export async function deleteprod(req:NextRequest){
  const res = await fetch("http://localhost:3000/api/products",{
    method:"DELETE",
    headers:{
      "Content-Type":"application/json",
    },
    body:JSON.stringify(req.body),
  });
  const val = await res.json();
  if(!val.success){
    return NextResponse.json({
      success:"false",
      message:"not found product",
      data:res},{status:200
    })
  }
}
 