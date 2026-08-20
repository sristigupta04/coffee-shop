import { NextRequest } from "next/server";
import {prisma} from "@/app/lib/prisma";
export async function GET(req: NextRequest) {
try{
     const coupon = req.nextUrl.searchParams.get("coupon");
     if(!coupon){
        return new Response(JSON.stringify({error: "Coupon code is required"}), {status: 400});
     }
     const exist = await prisma.coupon.findUnique({
        where:{
            code: coupon,
        }
     });
     if(!exist){
        return new Response(JSON.stringify({error: "Coupon not found"}), {status: 404});
     }
     return new Response(JSON.stringify(exist), {status: 200});
}catch(error){
    return new Response(JSON.stringify({error: "An error occurred while fetching coupon details"}), {status: 500});
}
}
export async function POST(req: NextRequest) {
    try{
        const body = await req.json();
        const {code, description, discount, minimumAmount ,expireDate} = body;
        if(!code || !description || !discount=== undefined || !minimumAmount || !expireDate){
            return new Response(JSON.stringify({error: "All fields are required"}), {status: 400});
        }

        const exisingCoupon = await prisma.coupon.findUnique({
            where:{
                code
            }
        });
        if(exisingCoupon){
            return new Response(JSON.stringify({error: "Coupon code already exists"}), {status: 400});
            }
        const coupon = await prisma.coupon.create({
            data: {
                code,
                description,
                discount,
                minimumAmount,
                        expireDate: new Date(expireDate),

            }
        });
        return new Response(JSON.stringify(coupon), {status: 201});
    } catch (error) {
        return new Response(JSON.stringify({error: "An error occurred while creating the coupon"}), {status: 500});
    }

}