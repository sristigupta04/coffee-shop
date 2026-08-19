import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/app/lib/prisma";
type params ={
  params: Promise<{id:string}>
}
export async function GET(req:NextRequest, {params}:params){
const {id} = await params;
try{
    const cart = await prisma.cart.findUnique({
        where:{
            id,
        },
        include:{
            items:{
                include:{
                    product:true,
                }
            }
        }
    });
    if(!cart){
        return NextResponse.json({
            success:false,
            msg:"cart not found",
        },
        {status:404});
    }
    return NextResponse.json({
        success:true,
        msg:"cart founded",
        data: cart
    },
      {status:200});

}
catch(error) {
    return NextResponse.json(
      {
        success: false,
        message:"internal server error",
      },
      { status: 500 }
    );
  }
        }





        
export async function PUT(req:NextRequest, {params}:params){
try{
    const {id} = await params;
    if(!id){
        return NextResponse.json({
            success:false,
            message:"product id is required",
        },
        {status:400});
    }
    const body = await req.json();
    const {quantity} = body;
    if(quantity === undefined || quantity < 0){
        return NextResponse.json({
            success:false,
            message:"quantity is required and must be a non-negative number",
        },
        {status:400});
    }
    const val = await prisma.cart.findUnique({
        where:{
            id,
        }
    })
    if(!val){
        return NextResponse.json({
            success:false,
            message:"cart item not found",
        },
        {status:404});
    }
    const update = await prisma.cartItem.update({
      where: {
        id,
      },
      data: {
        quantity: Number(quantity),
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Cart item updated successfully",
        data: update,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("UPDATE CART ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update cart item",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req:NextRequest, {params}:params){
try{
  const {id} = await params;
  if(!id){
    return NextResponse.json(
      {
        success: false,
        message: "Product ID is required",
      },
      { status: 400 }
    );
  }
  const val = await prisma.product.delete({
    where:{
      id:id,
    }
  });
  if(!val){
    return NextResponse.json(
      {
        success:false,
        message:"product not found",
      },
      {status:404}
    )
  }
  const deleteCart = await prisma.cart.delete({
    where:{
      id:id,
    }
});

   return NextResponse.json(
    {
      success:true,
      data:deleteCart,
    },
    {status:200}
   )
}

catch(error){
  return NextResponse.json(
    {
      success:false,
      message:"failed to delete product"
},{status:500}
  )}
   
}



