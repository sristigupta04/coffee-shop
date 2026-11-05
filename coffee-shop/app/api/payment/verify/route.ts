
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import Razorpay from "razorpay";
import { prisma } from "@/app/lib/prisma";
import { getcurrentuser } from "@/app/lib/auth";
import { createactive } from "@/app/lib/activity";

export const runtime = "nodejs";

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

    const body = await req.json();

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = body;

    if (
      typeof razorpay_order_id !== "string" ||
      typeof razorpay_payment_id !== "string" ||
      typeof razorpay_signature !== "string"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Payment details are missing",
        },
        { status: 400 }
      );
    }

    // 2. Find user's application order
    const order = await prisma.order.findFirst({
      where: {
        userId: user.id,
        razorpayOrderId: razorpay_order_id,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          message: "Payment order not found",
        },
        { status: 404 }
      );
    }

    // 3. Idempotency
    if (order.paymentStatus === "PAID") {
      if (order.razorpayPaymentId !== razorpay_payment_id) {
        return NextResponse.json(
          {
            success: false,
            message: "Order was paid using a different payment.",
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          message: "Payment was already verified",
          data: order,
        },
        { status: 200 }
      );
    }

    if (order.paymentStatus !== "PENDING") {
      return NextResponse.json(
        {
          success: false,
          message: "Order is not awaiting payment",
        },
        { status: 409 }
      );
    }

    if (order.status !== "PENDING") {
      return NextResponse.json(
        {
          success: false,
          message: "This order has already been cancelled or updated.",
        },
        { status: 409 }
      );
    }

    // 4. Verify signature
    const secret = process.env.RAZORPAY_KEY_SECRET;

    if (!secret) {
      throw new Error("Razorpay secret is not configured");
    }

    if (!/^[a-f0-9]{64}$/i.test(razorpay_signature)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid payment signature",
        },
        { status: 400 }
      );
    }

    const generatedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const generatedBuffer = Buffer.from(
      generatedSignature,
      "hex"
    );

    const receivedBuffer = Buffer.from(
      razorpay_signature,
      "hex"
    );

    if (
      generatedBuffer.length !== receivedBuffer.length ||
      !crypto.timingSafeEqual(
        generatedBuffer,
        receivedBuffer
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid payment signature",
        },
        { status: 400 }
      );
    }

    // 5. Verify directly with Razorpay
    const [razorpayOrder, payment] = await Promise.all([
      razorpay.orders.fetch(razorpay_order_id),
      razorpay.payments.fetch(razorpay_payment_id),
    ]);

    const expectedAmount = Math.round(
      order.totalPrice * 100
    );

    if (
      razorpayOrder.id !== order.razorpayOrderId ||
      Number(razorpayOrder.amount) !== expectedAmount ||
      razorpayOrder.currency !== "INR"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Payment amount mismatch",
        },
        { status: 400 }
      );
    }

    if (
      payment.order_id !== razorpay_order_id ||
      Number(payment.amount) !== expectedAmount ||
      payment.currency !== "INR" ||
      payment.status !== "captured"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Payment is not captured or details do not match",
        },
        { status: 400 }
      );
    }

    // 6. Atomic payment processing
    const updatedOrder = await prisma.$transaction(
      async (tx) => {
        // Claim only a pending, non-cancelled order.
        const claimed = await tx.order.updateMany({
          where: {
            id: order.id,
            userId: user.id,
            status: "PENDING",
            paymentStatus: "PENDING",
            razorpayOrderId: razorpay_order_id,
          },
          data: {
            paymentStatus: "VERIFYING",
          },
        });

        if (claimed.count !== 1) {
          throw new Error(
            "PAYMENT_ALREADY_PROCESSING_OR_ORDER_UPDATED"
          );
        }

        // Re-fetch order items.
        const currentOrder = await tx.order.findUnique({
          where: {
            id: order.id,
          },
          include: {
            items: true,
          },
        });

        if (!currentOrder) {
          throw new Error("Order not found");
        }

        // 7. Deduct stock atomically.
        for (const item of currentOrder.items) {
          const stockUpdate = await tx.product.updateMany({
            where: {
              id: item.productId,
              isAvailable: true,
              stock: {
                gte: item.quantity,
              },
            },
            data: {
              stock: {
                decrement: item.quantity,
              },
            },
          });

          if (stockUpdate.count !== 1) {
            throw new Error(
              `Insufficient stock for product ${item.productId}`
            );
          }
        }

        // 8. Increment coupon usage after successful payment.
        if (currentOrder.couponId) {
          await tx.coupon.update({
            where: {
              id: currentOrder.couponId,
            },
            data: {
              usedCount: {
                increment: 1,
              },
            },
          });
        }

        // 9. Mark payment as PAID and stock as deducted.
        const paidOrder = await tx.order.update({
          where: {
            id: currentOrder.id,
          },
          data: {
            paymentStatus: "PAID",
            razorpayPaymentId: razorpay_payment_id,
            stockDeducted: true,
          },
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
        });

        // 10. Clear cart only if it still matches order snapshot.
        const cart = await tx.cart.findUnique({
          where: {
            userId: user.id,
          },
          include: {
            items: true,
          },
        });

        if (
          cart &&
          cart.items.length === currentOrder.items.length
        ) {
          const sameCart = currentOrder.items.every(
            (orderItem) =>
              cart.items.some(
                (cartItem) =>
                  cartItem.productId === orderItem.productId &&
                  cartItem.quantity === orderItem.quantity &&
                  Number(cartItem.price) ===
                    Number(orderItem.price) &&
                  JSON.stringify(
                    cartItem.customizations ?? null
                  ) ===
                    JSON.stringify(
                      orderItem.customizations ?? null
                    )
              )
          );

          if (sameCart) {
            await tx.cartItem.deleteMany({
              where: {
                cartId: cart.id,
              },
            });
          }
        }

        return paidOrder;
      }
    );

    // 11. Activity log
    await createactive(
      user.id,
      "ORDER_PLACED",
      `Order placed with ID: ${updatedOrder.id}`
    );

    return NextResponse.json(
      {
        success: true,
        message: "Payment verified successfully",
        data: updatedOrder,
      },
      { status: 200 }
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        "PAYMENT_ALREADY_PROCESSING_OR_ORDER_UPDATED"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Payment is already being processed or order was updated.",
        },
        { status: 409 }
      );
    }

    console.error("Payment verification error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Payment verification failed",
      },
      { status: 500 }
    );
  }
}
