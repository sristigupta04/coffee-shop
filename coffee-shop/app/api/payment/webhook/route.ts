
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/app/lib/prisma";

export const runtime = "nodejs";

type RazorpayWebhookPayload = {
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        amount?: number;
        currency?: string;
        status?: string;
      };
    };
  };
};

function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  secret: string
) {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  if (!/^[a-f0-9]{64}$/i.test(signature)) {
    return false;
  }

  const expectedBuffer = Buffer.from(expected, "hex");
  const receivedBuffer = Buffer.from(signature, "hex");

  return (
    expectedBuffer.length === receivedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

export async function POST(req: NextRequest) {
  let eventId = "";
  
  try {
    // 1. Read raw body for signature verification.
    const rawBody = await req.text();

    const signature = req.headers.get("x-razorpay-signature");
    eventId = req.headers.get("x-razorpay-event-id") || "";

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("RAZORPAY_WEBHOOK_SECRET is missing");

      return NextResponse.json(
        { success: false, message: "Webhook configuration error" },
        { status: 500 }
      );
    }

    if (!signature || !eventId) {
      return NextResponse.json(
        { success: false, message: "Missing webhook headers" },
        { status: 400 }
      );
    }

    // 2. Verify webhook signature.
    if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
      return NextResponse.json(
        { success: false, message: "Invalid webhook signature" },
        { status: 401 }
      );
    }

    // 3. Parse event.
    const webhook: RazorpayWebhookPayload = JSON.parse(rawBody);
    const event = webhook.event;

    if (!event) {
      return NextResponse.json(
        { success: false, message: "Missing event type" },
        { status: 400 }
      );
    }

    // 4. Register event idempotently.
    try {
      await prisma.paymentWebhookEvent.create({
        data: {
          eventId,
          event,
          status: "RECEIVED",
        },
      });
    } catch (error) {
      if (!isUniqueConstraintError(error)) {
        throw error;
      }

      const existingEvent =
        await prisma.paymentWebhookEvent.findUnique({
          where: { eventId },
        });

      if (!existingEvent) {
        throw error;
      }

      if (
        existingEvent.status === "PROCESSED" ||
        existingEvent.status === "PROCESSING"
      ) {
        return NextResponse.json({
          success: true,
          message: "Webhook event already received",
        });
      }

      // FAILED or RECEIVED events can be retried.
    }

    // 5. Claim this webhook event.
    const eventClaim = await prisma.paymentWebhookEvent.updateMany({
      where: {
        eventId,
        status: {
          in: ["RECEIVED", "FAILED"],
        },
      },
      data: {
        status: "PROCESSING",
      },
    });

    if (eventClaim.count !== 1) {
      return NextResponse.json({
        success: true,
        message: "Webhook event is already being processed",
      });
    }

    // 6. Handle payment.failed.
    if (event === "payment.failed") {
      await prisma.paymentWebhookEvent.update({
        where: { eventId },
        data: {
          status: "PROCESSED",
          processedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: "Payment failure event processed",
      });
    }

    // 7. Ignore unsupported events safely.
    if (event !== "payment.captured") {
      await prisma.paymentWebhookEvent.update({
        where: { eventId },
        data: {
          status: "PROCESSED",
          processedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: `Event ${event} acknowledged`,
      });
    }

    // 8. Extract captured payment.
    const payment = webhook.payload?.payment?.entity;

    if (
      !payment?.id ||
      !payment.order_id ||
      typeof payment.amount !== "number" ||
      !payment.currency
    ) {
      throw new Error("Invalid captured payment payload");
    }

    if (
      payment.status &&
      payment.status !== "captured"
    ) {
      throw new Error("Payment is not captured");
    }

    // 9. Find corresponding application order.
    const order = await prisma.order.findFirst({
      where: {
        razorpayOrderId: payment.order_id,
      },
      include: {
        items: true,
      },
    });

    if (!order) {
      throw new Error("Application order not found");
    }

    // 10. Verify amount and currency.
    const expectedAmount = Math.round(order.totalPrice * 100);

    if (
      payment.amount !== expectedAmount ||
      payment.currency !== "INR"
    ) {
      throw new Error("Webhook payment amount mismatch");
    }

    // 11. Process captured payment atomically.
    await prisma.$transaction(async (tx) => {
      const currentOrder = await tx.order.findUnique({
        where: { id: order.id },
        include: { items: true },
      });

      if (!currentOrder) {
        throw new Error("Order not found");
      }

      // Already paid: do not deduct stock or coupon again.
      if (currentOrder.paymentStatus === "PAID") {
        if (
          currentOrder.razorpayPaymentId !== payment.id
        ) {
          throw new Error(
            "Order is already paid with another payment"
          );
        }

        await tx.paymentWebhookEvent.update({
          where: { eventId },
          data: {
            status: "PROCESSED",
            processedAt: new Date(),
          },
        });

        return;
      }

      if (
        currentOrder.paymentStatus !== "PENDING" ||
        currentOrder.status !== "PENDING"
      ) {
        throw new Error(
          "Order is not eligible for payment processing"
        );
      }

      // Claim the order exactly once.
      const claimed = await tx.order.updateMany({
        where: {
          id: currentOrder.id,
          status: "PENDING",
          paymentStatus: "PENDING",
          razorpayOrderId: payment.order_id,
        },
        data: {
          paymentStatus: "VERIFYING",
        },
      });

      if (claimed.count !== 1) {
        throw new Error(
          "Order payment is already being processed"
        );
      }

      // Deduct stock atomically.
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

      // Increment coupon usage only once after capture.
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

      // Mark order paid and stock deducted.
      await tx.order.update({
        where: {
          id: currentOrder.id,
        },
        data: {
          paymentStatus: "PAID",
          razorpayPaymentId: payment.id,
          stockDeducted: true,
        },
      });

      // Clear cart only when it matches the order snapshot.
      const cart = await tx.cart.findUnique({
        where: {
          userId: currentOrder.userId,
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

      // Mark webhook event processed in same transaction.
      await tx.paymentWebhookEvent.update({
        where: { eventId },
        data: {
          status: "PROCESSED",
          processedAt: new Date(),
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Payment captured and order updated",
    });
  } catch (error) {
    console.error("[RAZORPAY_WEBHOOK_ERROR]", error);

    // Allow Razorpay retry if processing failed.
    if (eventId) {
      try {
        await prisma.paymentWebhookEvent.updateMany({
          where: {
            eventId,
            status: "PROCESSING",
          },
          data: {
            status: "FAILED",
          },
        });
      } catch (updateError) {
        console.error(
          "Webhook event status update failed:",
          updateError
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        message: "Webhook processing failed",
      },
      { status: 500 }
    );
  }
}
