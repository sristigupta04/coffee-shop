import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/app/lib/prisma";
import {getcurrentuser} from "@/app/lib/auth";
import {createactive} from "@/app/lib/activity";
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      couponCode,
      address,
      phone,
    } = body;
 const user = await getcurrentuser();
    if(!user){
      return NextResponse.json(
        {
            success: false,
            message: "User not found",
        },
        { status: 404 }
      );
    }


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

for(const item of cart.items){
  
  if(!item.product.isAvailable){
    return NextResponse.json(
      {
        success: false,
        message: `Product ${item.product.name} is not available`,
      },
      { status: 400 }
    );
  }
}

   

    const totalPrice = cart.items.reduce((acc, item) => acc + item.product.price * item.quantity, 0) || 0;
    let finalAmount = totalPrice;

    if(couponCode?.trim()){
        const coupon = await prisma.coupon.findUnique({
            where: {
                code: couponCode.toUpperCase(),
            },
        });
if (!coupon || !coupon.isActive || coupon.expireDate < new Date()){
              return NextResponse.json(
                {
                    success: false,
                    message: "Invalid or expired coupon code",
                },
                { status: 400 }
            );
        }
    
    if(totalPrice < coupon.minimumAmount){
        return NextResponse.json(
            {
                success: false,
                message: "Total amount is less than the minimum required for this coupon",
            },
            { status: 400 }
        );
      }

    const discountedAmount = (totalPrice * coupon.discount) / 100;
    finalAmount = totalPrice - discountedAmount;
  }
    

  
   
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          userId: user.id,
          totalPrice:finalAmount,
          status:"PENDING",
          address,
          phone,
          paymentWay: "ONLINE",
          items:{
            create: cart.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.product.price,
            })),
          },
        },
        include:{
          items:{
            include:{ 
              product:true
            },
          }
        }
        });
    for(const item of cart.items){
      await tx.product.update({
        where:{
          id:item.productId

        },
        data:{
          stock:{
            decrement:item.quantity,
          }
        }
      });
    }
        
        await tx.cartItem.deleteMany({
          where: {
            cartId: cart.id,
          },
        });

        return newOrder;
  });
          

  await createactive(user.id, "ORDER_PLACED", `Order placed with ID: ${order.id}`);

    return NextResponse.json(
      {
        success: true,
        message: "Payment verified successfully",
        data:order,
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