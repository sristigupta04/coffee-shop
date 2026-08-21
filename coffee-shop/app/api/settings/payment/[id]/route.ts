
import {NextRequest, NextResponse} from "next/server";
import { getcurrentuser } from "@/app/lib/auth";
import {prisma} from "@/app/lib/prisma";

import { createactive } from "@/app/lib/activity";
type Params = {
    params:Promise<{id:string}>
}

export async function GET(req:NextRequest, {params}:Params){
    try{
        const {id} = await params;
        const user = await getcurrentuser();
        if(!user){
            return NextResponse.json({message:"Unauthorized"}, {status:401});
        }

        const payment = await prisma.paymentMethod.findFirst({
            where:{
                id,
                userId:user.id
            }
        });
if(!payment){
    return NextResponse.json({message:"Payment method not found"}, {status:404});
}

      
    return NextResponse.json({
        success:true,
        data:payment,
    },{status:200});
    }
    catch(error){
        console.log(error);
        return NextResponse.json({message:"Internal Server Error"}, {status:500});
    }
}


export async function PATCH(req:NextRequest, {params}:Params){
    try{
        const {id} = await params;
        const user = await getcurrentuser();
        if(!user){
            return NextResponse.json({message:"Unauthorized"}, {status:401});
        }
        const payment = await prisma.paymentMethod.findFirst({
            where:{
                id,
                userId:user.id
            }
        });
        if(!payment){
            return NextResponse.json({message:"Payment method not found"}, {status:404});
        }
        await prisma.paymentMethod.updateMany({
            where:{
                userId:user.id,
                id:{
                    not:id,
                }
            },
            data:{
               isActive:false
            }
        });
        const update = await prisma.paymentMethod.update({
            where:{
                id,
                userId:user.id
            },
            data:{
                isActive:true
            }
        });
        await createactive(user.id,"Updated payment method", `User updated the active payment method to: ${payment.type} - ${payment.name}`);
        return NextResponse.json({
            success:true,
            data:update,
        },{status:200});
    }
    catch(error){
        console.log(error);
        return NextResponse.json({message:"Internal Server Error"}, {status:500});
    }
}
        









export async function DELETE(req:NextRequest, {params}:Params){
    try{
        const {id} = await params;
        const user = await getcurrentuser();
        if(!user){
            return NextResponse.json({message:"Unauthorized"}, {status:401});
        }
const paymentMethod =
      await prisma.paymentMethod.findFirst({
        where: {
          id,
          userId: user.id,
        },
      });

    if (!paymentMethod) {
      return NextResponse.json(
        {
          success: false,
          message: "Payment method not found",
        },
        { status: 404 }
      );
    }

    await prisma.paymentMethod.delete({
      where: {
        id,
      },
    });
    await createactive(user.id,"Deleted payment method", `User deleted a payment method: ${paymentMethod.type} - ${paymentMethod.name}`);


    return NextResponse.json({
      success: true,
      message: "Payment method deleted successfully",
    });
    }catch(error){
        console.log(error);
        return NextResponse.json({message:"Internal Server Error"}, {status:500});
    }
}


