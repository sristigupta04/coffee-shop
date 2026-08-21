import {NextRequest, NextResponse} from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getcurrentuser } from "@/app/lib/auth";


type params ={
    params:Promise<{id:string}>
}

export async function GET(req:NextRequest,{params}:params){
    try{
        const {id} = await params;
        if(!id){
            return NextResponse.json({success:false,message:"Missing required fields"},{status:400});
        }
        const user = await getcurrentuser(req);
        if(!user){
            return NextResponse.json({success:false,message:"Unauthorized"},{status:401});
        }
        const order = await prisma.order.findUnique({
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
        if(!order){
            return NextResponse.json({success:false,message:"Order not found"},{status:404});
        }
        if(user.role !== "ADMIN" && order.userId !== user.id){
            return NextResponse.json({success:false,message:"Unauthorized"},{status:401});
        }
        return NextResponse.json({success:true,data:order},{status:200});
    } catch (error) {
        console.error("Order fetch error:",error);
        return NextResponse.json({success:false,message:"Internal Server Error"},{status:500});
    }
    }


    export async function PATCH(req:NextRequest,{params}:params){
        try{
const {id} = await params;
if(!id){
    return NextResponse.json({success:false,message:"Missing required fields"},{status:400});
}

const user= await getcurrentuser(req);
if(!user){
    return NextResponse.json({success:false,message:"Unauthorized"},{status:401});
}
const order = await prisma.order.findUnique({
    where:{
        id,
    },
   
            include:{
 items:true,
            }
});
if(!order){ 
    return NextResponse.json({success:false,message:"Order not found"},{status:404});
}

const body = await req.json();
if(user.role === "USER"){
    if(order.userId !== user.id){
        return NextResponse.json({success:false,message:"Unauthorized"},{status:401});
    }
    if(order.status !== "PENDING"){
        return NextResponse.json({success:false,message:"Cannot update order status"},{status:400});
    }



const update = await prisma.$transaction(async(tx)=>{
    const updatedOrder = await tx.order.update({
        where:{
            id,
        },
        data:{
            status:"CANCELLED",
        },
    });
    for (const item of order.items){
        await tx.product.update({
            where:{
                id:item.productId,
            },
            data:{
                stock:{
                    increment:item.quantity,
                }
            }
        });
    }
    return updatedOrder;
});
return NextResponse.json({success:true,data:update},{status:200});
}
if(user.role === "ADMIN"){
 const {status} = body;
 const allowedStatuses = ["PENDING","COMPLETED","CANCELLED"];
 if(!status || !allowedStatuses.includes(status)){
    return NextResponse.json({success:false,message:"Invalid status"},{status:400});
 }

 const updatedOrder = await prisma.order.update({
    where:{
        id,
    },
    data:{
        status
    }
 });
 return NextResponse.json({success:true,data:updatedOrder},{status:200});
}
return NextResponse.json({success:false,message:"Unauthorized"},{status:401});

        } catch (error) {
            console.error("Order update error:",error);
            return NextResponse.json({success:false,message:"Internal Server Error"},{status:500});
        }
    }



