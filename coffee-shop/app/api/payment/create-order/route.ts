import { NextRequest, NextResponse } from "next/server";
import {prisma} from "@/app/lib/prisma";
import Razorpay from "razorpay";


const razorpay = new Razorpay({
  key_id: process.env.test_api as string,
  key_secret: process.env.test_secret as string,
});


export async function POST(req: NextRequest) {
    try{
        const body = await req.json();
        const {amount} = body;
        if(!amount || amount <= 0){
            return NextResponse.json({message: "Invalid amount"}, {status: 400});

        }
        const options = {
            amount:Math.round(amount * 100), // amount in the smallest currency unit
            currency: "INR",
            receipt: `receipt_${Date.now()}`,
        };
        const order = await razorpay.orders.create(options);
        return NextResponse.json({
            success: true,
            data:order,

        },{status: 200});
    }catch(error){
        console.error("Error creating order:", error);
        return NextResponse.json({
            success: false,
            message: "Failed to create order",
        },{status: 500});
    }
        }
    