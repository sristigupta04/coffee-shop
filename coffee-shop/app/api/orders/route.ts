import { prisma } from "@/app/lib/prisma";
import { NextResponse , NextRequest} from "next/server";
import { getcurrentuser } from "@/app/lib/auth";
import {createactive} from "@/app/lib/activity";

export async function GET(req: NextRequest) {
  try {
    const user = await getcurrentuser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const orders = await prisma.order.findMany({
      where:{
        userId:user.id,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: orders,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Orders fetch error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Internal Server Error",
      },
      { status: 500 }
    );
  }
}


export async function POST(req: NextRequest) {
  try{
    const user = await getcurrentuser();
    const body = await req.json();
const allowedPaymentMethods = ["COD", "ONLINE"];
const {
  address,
  phone,
  paymentWay,
  couponCode
} = body;


if (!address || !phone || !paymentWay ) {
  return NextResponse.json(
    {
      success: false,
      message: "Address, phone and payment method are required",
    },
    { status: 400 }
  );
}


if (!allowedPaymentMethods.includes(paymentWay)) {
  return NextResponse.json(
    {
      success: false,
      message: "Invalid payment method",
    },
    { status: 400 }
  );
}
    if(!user){
      return NextResponse.json({success:false,message:"Unauthorized"},{status:401});
    }
    const cart = await prisma.cart.findUnique({
      where:{
        userId:user.id,
      },
      include:{
        items:{
          include:{
            product:true,
          },
        },
      },
    });


    if(!cart || cart.items.length === 0){
      return NextResponse.json({success:false,message:"Cart is empty"},{status:400});
    }
    for (const item of cart.items){
      if(!item.product.isAvailable){
        return NextResponse.json({success:false,message:`Product ${item.product.name} is not available`},{status:400});
      }



      if(item.quantity > item.product.stock){
        return NextResponse.json({success:false,message:`Product ${item.product.name} does not have enough stock`},{status:400});
      }
    }

      const totalPrice = cart.items.reduce((acc, item) => acc + item.quantity * item.product.price, 0);
let discountAmount = 0;
let finalAmount = totalPrice;

if(couponCode.trim()){
  const coupon = await prisma.coupon.findUnique({
    where:{
      code:couponCode.toUpperCase(),
    },
  });

  if(!coupon){
    return NextResponse.json({success:false,message:"Invalid coupon code"},{status:400});
  }
  if(coupon.expireDate < new Date()){
    return NextResponse.json({success:false,message:"Coupon code has expired"},{status:400});
  }
  if(!coupon.isActive){
    return NextResponse.json({success:false,message:"Coupon code is not active"},{status:400});
  }
  if(totalPrice < coupon.minimumAmount){
    return NextResponse.json({success:false,message:`Minimum amount for this coupon is ${coupon.minimumAmount}`},{status:400});
  }
  discountAmount = (totalPrice * coupon.discount) / 100;
  finalAmount = totalPrice - discountAmount;
}

      const order = await prisma.$transaction(async(tx)=>{

        const neworder = await tx.order.create({
          data:{
            userId:user.id,
            totalPrice:finalAmount,
            status:"PENDING",
            address,
            phone,
            paymentWay,
            items:{
              create:cart.items.map((item)=>({
              productId:item.productId,
              quantity:item.quantity,
              price:item.product.price
            })),
          },
          },
        include:{
          items:{
            include:{
              product:true,
            }
          }
        }
      });

      
      for (const item of cart.items){

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
      where:{
        cartId:cart.id,
      },
    });
    return neworder;
  });
 await createactive(user.id,"Order Created",`Order with ID ${order.id} has been created successfully.`);

  return NextResponse.json({success:true,data:order},{status:201});

  } catch (error) {
    console.error("Order creation error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
