
import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import { prisma } from "@/app/lib/prisma";
import { getcurrentuser } from "@/app/lib/auth";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(req: NextRequest) {
  try {
    // 1. Authentication
    const user = await getcurrentuser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // 2. Request validation
    const body = await req.json();

    const { couponCode, orderType, address, phone } = body;

    const allowedOrderTypes = ["DINE_IN", "PICKUP", "DELIVERY"];

    if (!allowedOrderTypes.includes(orderType)) {
      return NextResponse.json(
        { success: false, message: "Invalid order type" },
        { status: 400 }
      );
    }

    if (orderType === "DELIVERY" && !address?.trim()) {
      return NextResponse.json(
        { success: false, message: "Delivery address is required" },
        { status: 400 }
      );
    }

    if (orderType !== "DINE_IN" && !phone?.trim()) {
      return NextResponse.json(
        { success: false, message: "Phone number is required" },
        { status: 400 }
      );
    }

    // 3. Fetch cart
    const cart = await prisma.cart.findUnique({
      where: { userId: user.id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      return NextResponse.json(
        { success: false, message: "Cart is empty" },
        { status: 400 }
      );
    }

    // 4. Product and stock validation
    for (const item of cart.items) {
      if (!item.product.isAvailable) {
        return NextResponse.json(
          {
            success: false,
            message: `${item.product.name} is not available`,
          },
          { status: 400 }
        );
      }

      if (item.quantity > item.product.stock) {
        return NextResponse.json(
          {
            success: false,
            message: `Insufficient stock for ${item.product.name}`,
          },
          { status: 400 }
        );
      }
    }

    // 5. Calculate cart total
    // CartItem.price includes customization charges.
    const totalPrice = cart.items.reduce(
      (sum, item) =>
        sum + Number(item.price) * item.quantity,
      0
    );

    // 6. Calculate tax
    const tax = totalPrice * 0.1;
    const subtotal = totalPrice + tax;

    // 7. Coupon validation and calculation
    let discountAmount = 0;
    let couponId: string | undefined;

    if (couponCode?.trim()) {
      const coupon = await prisma.coupon.findUnique({
        where: {
          code: couponCode.trim().toUpperCase(),
        },
      });

      if (
        !coupon ||
        !coupon.isActive ||
        coupon.expireDate < new Date()
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid or expired coupon code",
          },
          { status: 400 }
        );
      }

      if (subtotal < Number(coupon.minimumAmount)) {
        return NextResponse.json(
          {
            success: false,
            message: `Minimum order amount is ₹${coupon.minimumAmount}`,
          },
          { status: 400 }
        );
      }

      if (coupon.discountType === "PERCENTAGE") {
        discountAmount =
          (subtotal * Number(coupon.discount)) / 100;

        if (coupon.maximumDiscount !== null) {
          discountAmount = Math.min(
            discountAmount,
            Number(coupon.maximumDiscount)
          );
        }
      } else if (coupon.discountType === "FLAT") {
        discountAmount = Number(coupon.discount);
      } else {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid coupon discount type",
          },
          { status: 400 }
        );
      }

      // Discount cannot exceed subtotal.
      discountAmount = Math.min(
        Math.max(0, discountAmount),
        subtotal
      );

      couponId = coupon.id;
    }

    // 8. Final amount
    const finalAmount = Math.max(
      0,
      subtotal - discountAmount
    );

    const amountInPaise = Math.round(finalAmount * 100);

    if (amountInPaise <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid payment amount",
        },
        { status: 400 }
      );
    }

    // 9. Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: {
        userId: user.id,
        orderType,
      },
    });

    // 10. Save pending order in database
    const order = await prisma.order.create({
      data: {
        userId: user.id,
        totalPrice: amountInPaise / 100,
        status: "PENDING",
        orderType,

        address:
          orderType === "DELIVERY" ? address.trim() : "",

        phone:
          orderType === "DINE_IN" ? "" : phone.trim(),

        paymentWay: "ONLINE",
        paymentStatus: "PENDING",

        razorpayOrderId: razorpayOrder.id,

        discountAmount,

        ...(couponId ? { couponId } : {}),

        items: {
          create: cart.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: Number(item.price),
            customizations: item.customizations ?? undefined,
          })),
        },
      },
    });

    // 11. Response
    return NextResponse.json(
      {
        success: true,
        message: "Payment order created successfully",
        data: razorpayOrder,
        orderId: order.id,
        amount: amountInPaise,
        currency: "INR",
        breakdown: {
          itemTotal: totalPrice,
          tax,
          subtotal,
          discountAmount,
          finalAmount: amountInPaise / 100,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Razorpay order creation error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create payment order",
      },
      { status: 500 }
    );
  }
}
