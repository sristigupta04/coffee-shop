
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/app/lib/prisma";
import { getcurrentuser } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY"],
  READY: ["OUT_FOR_DELIVERY", "DELIVERED"],
  OUT_FOR_DELIVERY: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

const VALID_STATUSES = Object.keys(
  ALLOWED_TRANSITIONS
) as OrderStatus[];

export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const user = await getcurrentuser();

    if (!user) {
      return NextResponse.json(
        { message: "Authentication required." },
        { status: 401 }
      );
    }

    if (user.role !== "ADMIN") {
      return NextResponse.json(
        { message: "Admin access required." },
        { status: 403 }
      );
    }

    const { id } = await params;

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { message: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    if (
      !body ||
      typeof body !== "object" ||
      !("status" in body) ||
      typeof body.status !== "string"
    ) {
      return NextResponse.json(
        { message: "A valid order status is required." },
        { status: 400 }
      );
    }

    const nextStatus = body.status.toUpperCase() as OrderStatus;

    if (!VALID_STATUSES.includes(nextStatus)) {
      return NextResponse.json(
        { message: "Invalid order status." },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        paymentStatus: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { message: "Order not found." },
        { status: 404 }
      );
    }

    const currentStatus = order.status as OrderStatus;

    if (currentStatus === nextStatus) {
      return NextResponse.json({
        message: "Order already has this status.",
        order,
      });
    }

    if (!ALLOWED_TRANSITIONS[currentStatus]?.includes(nextStatus)) {
      return NextResponse.json(
        {
          message: `Cannot change order status from ${currentStatus} to ${nextStatus}.`,
        },
        { status: 409 }
      );
    }

    // Prevent concurrent updates from overwriting each other.
    const updateResult = await prisma.order.updateMany({
      where: {
        id,
        status: currentStatus,
      },
      data: {
        status: nextStatus,
      },
    });

    if (updateResult.count === 0) {
      return NextResponse.json(
        {
          message: "Order was updated by another request. Refresh and try again.",
        },
        { status: 409 }
      );
    }

    const updatedOrder = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      message: "Order status updated successfully.",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("[ADMIN_ORDER_UPDATE_ERROR]", error);

    return NextResponse.json(
      { message: "Unable to update order status." },
      { status: 500 }
    );
  }
}
