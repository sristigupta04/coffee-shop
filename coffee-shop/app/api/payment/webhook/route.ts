
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/app/lib/prisma";

export const runtime = "nodejs";

type WebhookPayload = {
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
    refund?: {
      entity?: {
        id?: string;
        payment_id?: string;
        amount?: number;
        status?: string;
      };
    };
  };
};

function verifySignature(
  body: string,
  signature: string,
  secret: string
) {
  if (!/^[a-f0-9]{64}$/i.test(signature)) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  const receivedBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  return (
    receivedBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
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
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");
    eventId = req.headers.get("x-razorpay-event-id") || "";

    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!secret) {
      throw new Error("RAZORPAY_WEBHOOK_SECRET is missing");
    }

    if (!signature || !eventId) {
      return NextResponse.json(
        { success: false, message: "Missing webhook headers" },
        { status: 400 }
      );
    }

    if (!verifySignature(rawBody, signature, secret)) {
      return NextResponse.json(
        { success: false, message: "Invalid signature" },
        { status: 401 }
      );
    }

    const webhook: WebhookPayload = JSON.parse(rawBody);
    const event = webhook.event;

    if (!event) {
      return NextResponse.json(
        { success: false, message: "Missing event type" },
        { status: 400 }
      );
    }

    // Register event. Unique eventId prevents duplicate processing.
    try {
      await prisma.paymentWebhookEvent.create({
        data: {
          eventId,
          event,
          status: "RECEIVED",
        },
      });
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;

      const existing = await prisma.paymentWebhookEvent.findUnique({
        where: { eventId },
      });

      if (!existing) throw error;

      if (
        existing.status === "PROCESSED" ||
        existing.status === "PROCESSING"
      ) {
        return NextResponse.json({
          success: true,
          message: "Event already handled",
        });
      }
    }

    const claim = await prisma.paymentWebhookEvent.updateMany({
      where: {
        eventId,
        status: { in: ["RECEIVED", "FAILED"] },
      },
      data: { status: "PROCESSING" },
    });

    if (claim.count !== 1) {
      return NextResponse.json({
        success: true,
        message: "Event is already being processed",
      });
    }

    // =========================================
    // REFUND PROCESSED
    // =========================================
    if (event === "refund.processed") {
      const refund = webhook.payload?.refund?.entity;

      if (
        !refund?.id ||
        !refund.payment_id ||
        typeof refund.amount !== "number"
      ) {
        throw new Error("Invalid refund.processed payload");
      }

      await prisma.$transaction(async (tx) => {
        const order = await tx.order.findFirst({
          where: {
            refundId: refund.id,
            razorpayPaymentId: refund.payment_id,
          },
          include: { items: true },
        });

        if (!order) {
          throw new Error("Order for refund not found");
        }

        if (
          Math.round((order.refundAmount ?? 0) * 100) !==
          refund.amount
        ) {
          throw new Error("Refund amount mismatch");
        }

        // Idempotency: don't restore stock twice.
        if (order.refundStatus !== "PROCESSED") {
          if (order.stockDeducted) {
            for (const item of order.items) {
              await tx.product.update({
                where: { id: item.productId },
                data: {
                  stock: { increment: item.quantity },
                },
              });
            }
          }

          await tx.order.update({
            where: { id: order.id },
            data: {
              status: "CANCELLED",
              paymentStatus: "REFUNDED",
              refundStatus: "PROCESSED",
              refundId: refund.id,
              refundAmount: refund.amount / 100,
              refundedAt: new Date(),
              stockDeducted: false,
            },
          });

          await tx.notification.create({
            data: {
              userId: order.userId,
              type: "ORDER_UPDATE",
              title: "Refund Successful",
              message: `Your refund for order #${order.id} has been processed successfully.`,
            },
          });
        }

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
        message: "Refund processed and order updated",
      });
    }

    // =========================================
    // REFUND FAILED
    // =========================================
    if (event === "refund.failed") {
      const refund = webhook.payload?.refund?.entity;

      if (!refund?.id || !refund.payment_id) {
        throw new Error("Invalid refund.failed payload");
      }

      await prisma.$transaction(async (tx) => {
        const order = await tx.order.findFirst({
          where: {
            refundId: refund.id,
            razorpayPaymentId: refund.payment_id,
          },
        });

        if (!order) {
          throw new Error("Order for failed refund not found");
        }

        // Never downgrade an already completed refund.
        if (order.refundStatus !== "PROCESSED") {
          await tx.order.update({
            where: { id: order.id },
            data: {
              refundStatus: "FAILED",
              paymentStatus: "PAID",
            },
          });

          await tx.notification.create({
            data: {
              userId: order.userId,
              type: "ORDER_UPDATE",
              title: "Refund Failed",
              message: `Refund for order #${order.id} failed. Please contact support.`,
            },
          });
        }

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
        message: "Refund failure event handled",
      });
    }

    // =========================================
    // PAYMENT FAILED
    // =========================================
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
        message: "Payment failure event acknowledged",
      });
    }

    // =========================================
    // PAYMENT CAPTURED
    // =========================================
    if (event === "payment.captured") {
      const payment = webhook.payload?.payment?.entity;

      if (
        !payment?.id ||
        !payment.order_id ||
        typeof payment.amount !== "number" ||
        payment.currency !== "INR" ||
        (payment.status && payment.status !== "captured")
      ) {
        throw new Error("Invalid payment.captured payload");
      }

      const order = await prisma.order.findFirst({
        where: { razorpayOrderId: payment.order_id },
      });

      if (!order) {
        throw new Error("Order not found for captured payment");
      }

      if (Math.round(order.totalPrice * 100) !== payment.amount) {
        throw new Error("Captured payment amount mismatch");
      }

      await prisma.$transaction(async (tx) => {
        const currentOrder = await tx.order.findUnique({
          where: { id: order.id },
          include: { items: true },
        });

        if (!currentOrder) {
          throw new Error("Order not found");
        }

        if (currentOrder.paymentStatus === "PAID") {
          if (currentOrder.razorpayPaymentId !== payment.id) {
            throw new Error("Order was paid using another payment");
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
          currentOrder.status !== "PENDING" ||
          currentOrder.paymentStatus !== "PENDING"
        ) {
          throw new Error("Order is not eligible for payment");
        }

        const claimed = await tx.order.updateMany({
          where: {
            id: currentOrder.id,
            status: "PENDING",
            paymentStatus: "PENDING",
          },
          data: { paymentStatus: "VERIFYING" },
        });

        if (claimed.count !== 1) {
          throw new Error("Payment is already being processed");
        }

        for (const item of currentOrder.items) {
          const stockUpdate = await tx.product.updateMany({
            where: {
              id: item.productId,
              isAvailable: true,
              stock: { gte: item.quantity },
            },
            data: {
              stock: { decrement: item.quantity },
            },
          });

          if (stockUpdate.count !== 1) {
            throw new Error(
              `Insufficient stock for product ${item.productId}`
            );
          }
        }

        if (currentOrder.couponId) {
          await tx.coupon.update({
            where: { id: currentOrder.couponId },
            data: {
              usedCount: { increment: 1 },
            },
          });
        }

        await tx.order.update({
          where: { id: currentOrder.id },
          data: {
            paymentStatus: "PAID",
            razorpayPaymentId: payment.id,
            stockDeducted: true,
          },
        });

        const cart = await tx.cart.findUnique({
          where: { userId: currentOrder.userId },
          include: { items: true },
        });

        if (
          cart &&
          cart.items.length === currentOrder.items.length
        ) {
          const sameCart = currentOrder.items.every((orderItem) =>
            cart.items.some(
              (cartItem) =>
                cartItem.productId === orderItem.productId &&
                cartItem.quantity === orderItem.quantity &&
                Number(cartItem.price) === Number(orderItem.price) &&
                JSON.stringify(cartItem.customizations ?? null) ===
                  JSON.stringify(orderItem.customizations ?? null)
            )
          );

          if (sameCart) {
            await tx.cartItem.deleteMany({
              where: { cartId: cart.id },
            });
          }
        }

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
    }

    // =========================================
    // UNKNOWN EVENT
    // =========================================
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
  } catch (error) {
    console.error("[RAZORPAY_WEBHOOK_ERROR]", error);

    if (eventId) {
      try {
        await prisma.paymentWebhookEvent.updateMany({
          where: {
            eventId,
            status: "PROCESSING",
          },
          data: { status: "FAILED" },
        });
      } catch (updateError) {
        console.error("Failed to update webhook event:", updateError);
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
