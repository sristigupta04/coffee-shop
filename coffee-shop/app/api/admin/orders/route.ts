
import { NextRequest, NextResponse } from "next/server";

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

export async function GET(request: NextRequest) {
  try {
    // Authentication
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

    // Query parameters
    const params = request.nextUrl.searchParams;

    const search = params.get("search")?.trim() ?? "";
    const requestedStatus = params.get("status")?.toUpperCase() ?? "";

    const page = Math.max(
      1,
      Number.parseInt(params.get("page") ?? "1", 10) || 1
    );

    const limit = Math.min(
      50,
      Math.max(
        1,
        Number.parseInt(params.get("limit") ?? "10", 10) || 10
      )
    );

    // Validate status
    if (
      requestedStatus &&
      !ORDER_STATUSES.includes(
        requestedStatus as (typeof ORDER_STATUSES)[number]
      )
    ) {
      return NextResponse.json(
        { message: "Invalid order status." },
        { status: 400 }
      );
    }

    // Database filters
    const where = {
      ...(requestedStatus
        ? {
            status: requestedStatus as (typeof ORDER_STATUSES)[number],
          }
        : {}),

      ...(search
        ? {
            OR: [
              {
                id: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
              {
                user: {
                  is: {
                    name: {
                      contains: search,
                      mode: "insensitive" as const,
                    },
                  },
                },
              },
              {
                user: {
                  is: {
                    email: {
                      contains: search,
                      mode: "insensitive" as const,
                    },
                  },
                },
              },
              {
                phone: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : {}),
    };

    // Fetch orders and total count
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
      { message: "Unable to fetch orders." },
      { status: 500 }
    );
  }
}
