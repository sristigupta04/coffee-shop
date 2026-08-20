import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/app/lib/prisma";
import {getcurrentuser} from "@/app/lib/auth";
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = body;

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Payment details are missing",
        },
        { status: 400 }
      );
    }

    const generatedSignature = crypto
      .createHmac(
        "sha256",
        process.env.RAZORPAY_KEY_SECRET!
      )
      .update(
        `${razorpay_order_id}|${razorpay_payment_id}`
      )
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid payment signature",
        },
        { status: 400 }
      );
    }
    const user = await getcurrentuser(req);
    if(!user){
      return NextResponse.json(
        {
            success: false,
            message: "User not found",
        },
        { status: 404 }
      );
    }
    const cart= await prisma.cart.findUnique({
     where:{
        userId:user.id
        },
        include:{
            items:{
                include:{
                    product:true
                }
            }
        }
     });
     if(!cart || cart.items.length === 0){
        return NextResponse.json(
            {
                success: false,
                message: "Cart is empty",
            },
            { status: 400 }
        );
     }

    return NextResponse.json(
      {
        success: true,
        message: "Payment verified successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Payment verification error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Payment verification failed",
      },
      { status: 500 }
    );
  }
}