
import { NextRequest, NextResponse } from "next/server";
import { OrderStatus } from "@prisma/client";
import { prisma } from "@/app/lib/prisma";
import { getcurrentuser } from "@/app/lib/auth";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY"],
  READY: ["OUT_FOR_DELIVERY", "DELIVERED"],
  OUT_FOR_DELIVERY: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

const notificationMessages: Partial<
  Record<OrderStatus, { title: string; message: string }>
> = {
  CONFIRMED: {
    title: "Order Confirmed",
    message: "Your order has been confirmed. We are getting it ready.",
  },
  PREPARING: {
    title: "Order Being Prepared",
    message: "Your order is now being prepared.",
  },
  READY: {
    title: "Order Ready",
    message: "Your order is ready for pickup.",
  },
  OUT_FOR_DELIVERY: {
    title: "Order Out for Delivery",
    message: "Your order is on its way.",
  },
  DELIVERED: {
    title: "Order Delivered",
    message: "Your order has been delivered. Enjoy!",
  },
  CANCELLED: {
    title: "Order Cancelled",
    message: "Your order has been cancelled.",
  },
};

export async function PATCH(
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
    const body = await req.json().catch(() => null);
    const requestedStatus = body?.status;

    const validStatuses = Object.values(OrderStatus) as string[];

    if (
      typeof requestedStatus !== "string" ||
      !validStatuses.includes(requestedStatus)
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid order status" },
        { status: 400 }
      );
    }

    const newStatus = requestedStatus as OrderStatus;

    // 3. Find order
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order not found" },
        { status: 404 }
      );
    }

    // 4. Validate status transition
    if (!allowedTransitions[order.status].includes(newStatus)) {
      return NextResponse.json(
        {
          success: false,
          message: `Cannot change order from ${order.status} to ${newStatus}`,
        },
        { status: 400 }
      );
    }

    // 5. Protect online payments from direct cancellation
    if (newStatus === "CANCELLED") {
      const isOnlinePayment =
        order.paymentWay === "RAZORPAY" ||
        order.paymentWay === "ONLINE";

      if (
        isOnlinePayment &&
        order.paymentStatus !== "REFUNDED"
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              order.paymentStatus === "REFUNDING"
                ? "Refund is still processing. Wait for confirmation."
                : "Refund the online payment before cancelling this order.",
          },
          { status: 409 }
        );
      }

      if (
        order.refundStatus === "REFUNDING" ||
        order.refundStatus === "PENDING"
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Refund is in progress. Wait for its final status.",
          },
          { status: 409 }
        );
      }
    }

    // 6. Update order, stock and notification atomically
    const updatedOrder = await prisma.$transaction(async (tx) => {
      const currentOrder = await tx.order.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!currentOrder) {
        throw new Error("ORDER_NOT_FOUND");
      }

      if (currentOrder.status !== order.status) {
        throw new Error("ORDER_STATUS_CHANGED");
      }

      if (
        newStatus === "CANCELLED" &&
        (currentOrder.paymentWay === "RAZORPAY" ||
          currentOrder.paymentWay === "ONLINE") &&
        currentOrder.paymentStatus !== "REFUNDED"
      ) {
        throw new Error("ONLINE_REFUND_REQUIRED");
      }

      const updateResult = await tx.order.updateMany({
        where: {
          id: currentOrder.id,
          status: currentOrder.status,
        },
        data: {
          status: newStatus,
          ...(newStatus === "CANCELLED"
            ? { stockDeducted: false }
            : {}),
        },
      });

      if (updateResult.count !== 1) {
        throw new Error("ORDER_STATUS_CHANGED");
      }

      // Restore stock only if it was previously deducted.
      if (
        newStatus === "CANCELLED" &&
        currentOrder.stockDeducted
      ) {
        for (const item of currentOrder.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                increment: item.quantity,
              },
            },
          });
        }
      }

      // Create customer notification.
      const notification = notificationMessages[newStatus];

      if (notification) {
        await tx.notification.create({
          data: {
            userId: currentOrder.userId,
            type: "ORDER_UPDATE",
            title: notification.title,
            message: `${notification.message} Order #${currentOrder.id.slice(-8).toUpperCase()}.`,
          },
        });
      }

      return tx.order.findUnique({
        where: { id: currentOrder.id },
        include: {
          user: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: `Order status updated to ${newStatus}`,
      order: updatedOrder,
    });
  } catch (error) {
    console.error("[ADMIN_ORDER_STATUS_ERROR]", error);

    if (error instanceof Error) {
      if (error.message === "ORDER_NOT_FOUND") {
        return NextResponse.json(
          { success: false, message: "Order not found" },
          { status: 404 }
        );
      }

      if (error.message === "ORDER_STATUS_CHANGED") {
        return NextResponse.json(
          {
            success: false,
            message: "Order was updated by another request. Refresh and try again.",
          },
          { status: 409 }
        );
      }

      if (error.message === "ONLINE_REFUND_REQUIRED") {
        return NextResponse.json(
          {
            success: false,
            message: "Complete the online refund before cancelling this order.",
          },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        message: "Unable to update order status",
      },
      { status: 500 }
    );
  }
}
