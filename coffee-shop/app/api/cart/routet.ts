import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { success } from "zod";

type param ={
  params: Promise<{id:string}>
}


export  async function  GET(req:NextRequest){
    
        try{
            const userId = req.headers.get("userId");
            if(!userId){
                return  NextResponse.json({
                    success:false,
                    message:"userId is required in header",
                },{status:400});
            }
                
            
        
           
            const cartitem = await prisma.cart.findUnique({
                where:{
                userId,
   }, 
           include:{

            items:{

                include:{
                    product:true,
                }
            }
           }
        });

        if(!cartitem){
            return NextResponse.json({
                success:true,
                message:"cart is empty",
                data:null,
            },{status:200});

        }

        return NextResponse.json({
            success:true,
            message:"cart items found",
            data:cartitem,
        }),{status:200};

    }catch(error){
            console.error("GET CART ERROR:", error);

        return NextResponse.json({
            success:false,  
            message:"internal server error",
        },{status:500});
    }
}




export async function POST(req:NextRequest){

        try{
            const body = await req.json();
            const {userId,productId,quantity} = body;
            if(!userId || !productId || !quantity){
                return NextResponse.json({
                    success:false,
                    message:"userId,productId and quantity are required",
                },{status:400});
            }


            const product = await prisma.product.findUnique({
                where:{
                    id:productId
                }
            });

            if(!product){
                return NextResponse.json({
                    success:false,
                    message:"product not found",
                },{status:404});


            }
            if(!product.isAvailable){
                return NextResponse.json({
                    success:false,
                    message:"product is not available",
                },{status:400});
            }


            const cart = await prisma.cart.upsert({
      where: {
        userId,
      },
      update: {},
      create: {
        userId,
      },
    });
            const exist = await prisma.cartItem.findUnique({
                where:{
                    cartId_productId:{
                        cartId:userId,
                        productId:productId
                    }
                }
            });


            const add = Number(quantity) || 1;

            let cartItem;
            if(exist){
            cartItem = await prisma.cartItem.update({
                where:{
                    id:exist.id,
                },
                data:{
                    quantity:exist.quantity + add,
                }
            });

        }else {
            cartItem = await prisma.cartItem.create({
                data:{
                    cartId:cart.id,
                    productId,
                    quantity:Number(quantity) || 1,
                    price:product.price,
                }
            });
        }
        return NextResponse.json({
            success:true,
            message:"product added to cart",
            data:cartItem,
        },{status:200});

            
        
    }catch(error){
        return NextResponse.json({
            success:false,
            message:"internal server error",
        },{status:500});
    }
                }
            
        