import {NextRequest, NextResponse} from "next/server";
import {prisma} from "@/app/lib/prisma";




export async function DELETE(req: NextRequest, {params}: {params: Promise<{id: string}>}) {
    try{
        const {id} = await params;
        const coupon = await prisma.coupon.findUnique({
            where: {
                id
            }
        });
        if(!coupon){
            return new Response(JSON.stringify({error: "Coupon not found"}), {status: 404});
        }
        await prisma.coupon.update({
            where: {
                id
            },
            data: {
                isActive: false
            }
        });
        return new Response(JSON.stringify({message: "Coupon deactivated successfully"}), {status: 200});
    } catch (error) {
        return new Response(JSON.stringify({error: "An error occurred while deactivating the coupon"}), {status: 500});
    }
}


export async function PUT(req: NextRequest, {params}: {params: Promise<{id: string}>}) {
try{
    const {id} = await params;
    const body = await req.json();
    const {code, description, discount, minimumAmount ,expireDate,isActive} = body;
    const exist = await prisma.coupon.findUnique({
        where:{
            id,
        }
    });
    if(!exist){
        return new Response(JSON.stringify({error: "Coupon not found"}), {status: 404});
    }
  const update =   await prisma.coupon.update({
        where:{
            id,
        },
        data:{
           ...(code !== undefined && {code}),
          ...(description !== undefined && {description}),
            ...(discount !== undefined && {discount}),
            ...(minimumAmount !== undefined && {minimumAmount}),
             ...(expireDate !== undefined && {
          expireDate: new Date(expireDate),
        }),
            ...(isActive !== undefined && {isActive}),
       
        }
    });
    return new Response(JSON.stringify({success:true, coupon: update}), {status: 200});
} catch (error) {
    return new Response(JSON.stringify({error: "An error occurred while updating the coupon"}), {status: 500});
}
}