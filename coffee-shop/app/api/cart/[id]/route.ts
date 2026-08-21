import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/app/lib/prisma";
import { auth } from "@/auth";
type params ={
  params: Promise<{id:string}>
}
export async function GET(req:NextRequest, {params}:params){
const {id} = await params;
try{
  const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }
  const {id: userId} = await params;
  
  if(!userId){
    return NextResponse.json({
      success:false,
      message:"unauthorized",
    },
    {status:401});
  }
    const cart = await prisma.cart.upsert({
        where:{
            userId:id,
        },
        update:{},
        create:{
            userId:id,
        },
        include:{
            items:{
                include:{
                    product:true,
                }
            }
        }
    });
   
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
    const {id:userId} = await params;
    if(!userId){
        return NextResponse.json({
            success:false,
            message:"product id is required",
        },
        {status:400});
    }
    const body = await req.json();

    const {productId, quantity} = body;
    if(!productId){
        return NextResponse.json({
            success:false,
            message:"quantity is required and must be a non-negative number",
        },
        {status:400});
    }

   


    const newQuantity = Number(quantity);
    if(!Number.isFinite(newQuantity) || newQuantity < 0){
        return NextResponse.json({
            success:false,
            message:"quantity is required and must be a non-negative number",
        },
        {status:400});
    }

 const product = await prisma.product.findUnique({
      where: {
        id: productId,
      },
    });

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          message: "Product not found",
        },
        { status: 404 }
      );
    }

 if (!product.isAvailable) {
      return NextResponse.json(
        {
          success: false,
          message: "Product is not available",
        },
        { status: 400 }
      );
    }


  const  cart = await prisma.cart.upsert({
        where:{
            userId:userId,
        },
        update:{},
        create:{
            userId,
        },
         include: {
    items: {
      include: {
        product: true,
      },
    },
  },
    });
  

        let cartItem;
        const exist = await prisma.cartItem.findUnique({
        where:{
            cartId_productId:{
                cartId:cart.id,
                productId:productId,
            }
        }
    });
    if(exist){
        cartItem = await prisma.cartItem.update({
            where:{
                id:exist.id,
            },
            data:{
                quantity:newQuantity,
            }
        });
    }else{
      cartItem = await prisma.cartItem.create({
        data:{
          cartId:cart.id,
          productId:productId,
          quantity:newQuantity,
          price:product.price,
        }
      })

    }
    return NextResponse.json({
        success:true,
        message:"cart item updated successfully", 
        data:cartItem,
    },
    {status:200});

  



   

  
    

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
  const {id:userId} = await params;
  if(!userId){
    return NextResponse.json(
      {
        success: false,
        message: "Product ID is required",
      },
      { status: 400 }
    );
  }
  const val = await prisma.cart.findUnique({
    where:{
      id:userId,
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
      id:userId,
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



