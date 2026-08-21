import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import  {auth}  from "@/auth";

type param ={
  params: Promise<{id:string}>
}


export  async function  GET(req:NextRequest){
    
        try{
           const session  = await auth();
           if(!session?.user?.email){
            return NextResponse.json({
                success:false,
                message:"unauthorized",
            },{status:401});
           } 
            
            const userId = session.user.id;

           
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
            const session  = await auth();
            if(!session?.user?.email){
                return NextResponse.json({
                    success:false,
                    message:"unauthorized",
                },{status:401});
            }
            const userId = session.user.id;

            const body = await req.json();

            const {productId,quantity} = body;
            if( !productId || !quantity){
                return NextResponse.json({
                    success:false,
                    message:"productId and quantity are required",
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
           


            const cart = await prisma.cart.upsert({
      where: {
        userId,
      },
      update: {},
      create: {
        user:{
            connect: {
                id:userId,
            }
        }
      },
    });
            const exist = await prisma.cartItem.findUnique({
                where:{
                    cartId_productId:{
                        cartId:cart.id,
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
            
        