
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/app/lib/prisma";
import { getcurrentuser } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
] as const;

const REFUND_STATUSES = [
  "NOT_REQUESTED",
  "REFUNDING",
  "PENDING",
  "PROCESSED",
  "FAILED",
] as const;

export async function GET(request: NextRequest) {
  try {
    const user = await getcurrentuser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Authentication required." },
        { status: 401 }
      );
    }

    if (user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Admin access required." },
        { status: 403 }
      );
    }

    const params = request.nextUrl.searchParams;

    const search = params.get("search")?.trim() ?? "";
    const requestedStatus = params.get("status")?.toUpperCase() ?? "";
    const requestedRefundStatus =
      params.get("refundStatus")?.toUpperCase() ?? "";

    const parsedPage = Number.parseInt(params.get("page") ?? "1", 10);
    const parsedLimit = Number.parseInt(params.get("limit") ?? "10", 10);

    const page = Number.isFinite(parsedPage)
      ? Math.max(1, parsedPage)
      : 1;

    const limit = Number.isFinite(parsedLimit)
      ? Math.min(50, Math.max(1, parsedLimit))
      : 10;

    if (
      requestedStatus &&
      !ORDER_STATUSES.includes(
        requestedStatus as (typeof ORDER_STATUSES)[number]
      )
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid order status." },
        { status: 400 }
      );
    }

    if (
      requestedRefundStatus &&
      !REFUND_STATUSES.includes(
        requestedRefundStatus as (typeof REFUND_STATUSES)[number]
      )
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid refund status." },
        { status: 400 }
      );
    }

    const where: Prisma.OrderWhereInput = {
      ...(requestedStatus
        ? {
            status: requestedStatus as (typeof ORDER_STATUSES)[number],
          }
        : {}),

      ...(requestedRefundStatus
        ? {
            refundStatus: requestedRefundStatus as
              (typeof REFUND_STATUSES)[number],
          }
        : {}),

      ...(search
        ? {
            OR: [
              {
                id: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                user: {
                  is: {
                    name: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                },
              },
              {
                user: {
                  is: {
                    email: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                },
              },
              {
                phone: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            ],
          }
        : {}),
    };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                },
              },
            },
          },
        },
      }),

      prisma.order.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[ADMIN_ORDERS_GET_ERROR]", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to fetch orders.",
      },
      { status: 500 }
    );
  }
}
