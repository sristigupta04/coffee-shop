
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getcurrentuser } from "@/app/lib/auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  req: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Order ID is required." },
        { status: 400 }
      );
    }

    const user = await getcurrentuser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order not found." },
        { status: 404 }
      );
    }

    if (user.role !== "ADMIN" && order.userId !== user.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { success: true, data: order },
      { status: 200 }
    );
  } catch (error) {
    console.error("[ORDER_GET_ERROR]", error);

    return NextResponse.json(
      { success: false, message: "Unable to fetch order." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Order ID is required." },
        { status: 400 }
      );
    }

    const user = await getcurrentuser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 }
      );
    }

    // Admin status changes are handled by the admin order API.
    if (user.role !== "USER") {
      return NextResponse.json(
        { success: false, message: "Use the admin order API for status updates." },
        { status: 403 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order not found." },
        { status: 404 }
      );
    }

    if (order.userId !== user.id) {
      return NextResponse.json(
        { success: false, message: "You cannot cancel this order." },
        { status: 403 }
      );
    }

    if (order.status !== "PENDING") {
      return NextResponse.json(
        {
          success: false,
          message: "Only pending orders can be cancelled.",
        },
        { status: 409 }
      );
    }

    // A paid order must go through refund handling, not this cancellation path.
    if (order.paymentStatus === "PAID" ||
        order.paymentStatus === "VERIFYING") {
      return NextResponse.json(
        {
          success: false,
          message: "This payment requires the refund process.",
        },
        { status: 409 }
      );
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Atomic guard prevents two cancellation requests from processing together.
      const cancellation = await tx.order.updateMany({
        where: {
          id,
          userId: user.id,
          status: "PENDING",
          paymentStatus: {
            notIn: ["PAID", "VERIFYING"],
          },
        },
        data: {
          status: "CANCELLED",
        },
      });

      if (cancellation.count === 0) {
        throw new Error("ORDER_ALREADY_UPDATED");
      }

      // Restore stock only if it was previously deducted.
      if (order.stockDeducted) {
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                increment: item.quantity,
              },
            },
          });
        }

        await tx.order.update({
          where: { id },
          data: {
            stockDeducted: false,
          },
        });
      }

      await tx.notification.create({
        data: {
          userId: order.userId,
          type: "ORDER_UPDATE",
          title: "Order Cancelled",
          message: `Your order #${order.id} has been cancelled successfully.`,
        },
      });

      return tx.order.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });
    });

    return NextResponse.json(
      {
        success: true,
        message: "Order cancelled successfully.",
        data: updatedOrder,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof Error &&
        error.message === "ORDER_ALREADY_UPDATED") {
      return NextResponse.json(
        {
          success: false,
          message: "Order was already updated. Please refresh.",
        },
        { status: 409 }
      );
    }

    console.error("[ORDER_CANCEL_ERROR]", error);

    return NextResponse.json(
      { success: false, message: "Unable to cancel order." },
      { status: 500 }
    );
  }
}
