
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getcurrentuser } from "@/app/lib/auth";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type RazorpayRefundResponse = {
  id?: string;
  payment_id?: string;
  amount?: number;
  status?: string;
  error?: {
    description?: string;
    reason?: string;
  };
};

export async function POST(
  req: NextRequest,
  { params }: RouteContext
) {
  try {
    // 1. Admin authentication
    const user = await getcurrentuser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    if (user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // 2. Validate request
    let body: { reason?: string } = {};

    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const reason =
      typeof body.reason === "string"
        ? body.reason.trim().slice(0, 500)
        : "Refund requested by admin";

    // 3. Find order
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        user: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order not found" },
        { status: 404 }
      );
    }

    // 4. Validate payment method
    if (
      order.paymentWay !== "RAZORPAY" &&
      order.paymentWay !== "ONLINE"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Only Razorpay online payments can be refunded here",
        },
        { status: 400 }
      );
    }

    if (!order.razorpayPaymentId) {
      return NextResponse.json(
        {
          success: false,
          message: "Razorpay payment ID is missing",
        },
        { status: 400 }
      );
    }

    if (order.paymentStatus !== "PAID") {
      return NextResponse.json(
        {
          success: false,
          message: "Only paid orders can be refunded",
        },
        { status: 400 }
      );
    }

    if (order.status === "DELIVERED") {
      return NextResponse.json(
        {
          success: false,
          message: "Delivered orders cannot be refunded through this action",
        },
        { status: 400 }
      );
    }

    if (
      order.refundStatus === "REFUNDING" ||
      order.refundStatus === "PENDING"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "A refund is already in progress",
          refundId: order.refundId,
        },
        { status: 409 }
      );
    }

    if (order.refundStatus === "PROCESSED") {
      return NextResponse.json(
        {
          success: false,
          message: "This order has already been refunded",
        },
        { status: 409 }
      );
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json(
        {
          success: false,
          message: "Razorpay credentials are not configured",
        },
        { status: 500 }
      );
    }

    const amountInPaise = Math.round(order.totalPrice * 100);

    if (!Number.isSafeInteger(amountInPaise) || amountInPaise <= 0) {
      return NextResponse.json(
        { success: false, message: "Invalid refund amount" },
        { status: 400 }
      );
    }

    // 5. Claim refund request to prevent duplicate requests.
    const claim = await prisma.order.updateMany({
      where: {
        id: order.id,
        paymentStatus: "PAID",
        refundStatus: {
          in: ["NOT_REQUESTED", "FAILED"],
        },
      },
      data: {
        refundStatus: "REFUNDING",
        paymentStatus: "REFUNDING",
        refundReason: reason,
      },
    });

    if (claim.count !== 1) {
      return NextResponse.json(
        {
          success: false,
          message: "Refund request is already being handled",
        },
        { status: 409 }
      );
    }

    // 6. Call Razorpay refund API.
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

    let razorpayResponse: Response;

    try {
      razorpayResponse = await fetch(
        `https://api.razorpay.com/v1/payments/${encodeURIComponent(
          order.razorpayPaymentId
        )}/refund`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: amountInPaise,
            speed: "normal",
            notes: {
              orderId: order.id,
              reason,
            },
          }),
          cache: "no-store",
        }
      );
    } catch (error) {
      // Keep REFUNDING when the network outcome is uncertain.
      // Do not blindly retry: Razorpay may have received the request.
      console.error("[RAZORPAY_REFUND_NETWORK_ERROR]", error);

      return NextResponse.json(
        {
          success: false,
          message:
            "Refund request outcome is uncertain. Check Razorpay Dashboard before retrying.",
        },
        { status: 502 }
      );
    }

    const refundData =
      (await razorpayResponse.json().catch(() => ({}))) as
        | RazorpayRefundResponse
        | {
            error?: {
              description?: string;
              reason?: string;
            };
          };

    // 7. Handle definitive Razorpay rejection.
    if (!razorpayResponse.ok) {
      const errorMessage =
        refundData.error?.description ||
        refundData.error?.reason ||
        "Razorpay rejected the refund request";

      await prisma.order.updateMany({
        where: {
          id: order.id,
          refundStatus: "REFUNDING",
        },
        data: {
          refundStatus: "FAILED",
          paymentStatus: "PAID",
        },
      });

      return NextResponse.json(
        {
          success: false,
          message: errorMessage,
        },
        { status: 400 }
      );
    }

    // 8. Validate Razorpay response.
    if (
      !("id" in refundData) ||
      !refundData.id ||
      refundData.payment_id !== order.razorpayPaymentId ||
      refundData.amount !== amountInPaise
    ) {
      // Do not mark FAILED: Razorpay may already have created the refund.
      // Keep REFUNDING for reconciliation.
      console.error(
        "[RAZORPAY_REFUND_INVALID_RESPONSE]",
        refundData
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Razorpay response could not be verified. Check the Razorpay Dashboard.",
        },
        { status: 502 }
      );
    }

    // 9. Save Razorpay refund details.
    // Stock restoration and order cancellation happen only after
    // refund.processed is received and verified by the webhook.
    await prisma.order.update({
      where: { id: order.id },
      data: {
        refundId: refundData.id,
        refundAmount: refundData.amount / 100,
        refundReason: reason,
        refundStatus: "PENDING",
        paymentStatus: "REFUNDING",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Refund request submitted to Razorpay",
      refund: {
        id: refundData.id,
        amount: refundData.amount / 100,
        status: refundData.status || "created",
      },
    });
  } catch (error) {
    console.error("[ADMIN_REFUND_ERROR]", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to process refund",
      },
      { status: 500 }
    );
  }
}
