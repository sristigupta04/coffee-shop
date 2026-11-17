
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/app/lib/prisma";
import { getcurrentuser } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

const EXCLUDED_STATUSES = ["CANCELLED"] as const;

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getcurrentuser();

    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: "Authentication required." },
        { status: 401 }
      );
    }

    if (currentUser.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Admin access required." },
        { status: 403 }
      );
    }

    const params = request.nextUrl.searchParams;
    const search = params.get("search")?.trim() ?? "";

    const parsedPage = Number.parseInt(params.get("page") ?? "1", 10);
    const parsedLimit = Number.parseInt(params.get("limit") ?? "10", 10);

    const page = Number.isFinite(parsedPage)
      ? Math.max(1, parsedPage)
      : 1;

    const limit = Number.isFinite(parsedLimit)
      ? Math.min(50, Math.max(1, parsedLimit))
      : 10;

    const where = {
      role: "USER" as const,
      ...(search
        ? {
            OR: [
              {
                name: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
              {
                email: {
                  contains: search,
                  mode: "insensitive" as const,
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

    const [
      customers,
      filteredCustomers,
      totalCustomers,
      activeCustomers,
    ] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          image: true,
          createdAt: true,
          _count: {
            select: {
              orders: true,
            },
          },
          orders: {
            where: {
              status: {
                notIn: [...EXCLUDED_STATUSES],
              },
            },
            select: {
              totalPrice: true,
              createdAt: true,
            },
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      }),

      prisma.user.count({ where }),

      prisma.user.count({
        where: {
          role: "USER",
        },
      }),

      prisma.user.count({
        where: {
          role: "USER",
          orders: {
            some: {
              status: {
                notIn: [...EXCLUDED_STATUSES],
              },
            },
          },
        },
      }),
    ]);

    const formattedCustomers = customers.map((customer) => {
      const { orders, _count, ...customerDetails } = customer;

      const totalSpent = orders.reduce(
        (total, order) => total + Number(order.totalPrice),
        0
      );

      return {
        ...customerDetails,
        totalOrders: _count.orders,
        completedOrderCount: orders.length,
        totalSpent,
        lastOrderAt: orders[0]?.createdAt ?? null,
      };
    });

    return NextResponse.json({
      success: true,
      customers: formattedCustomers,
      summary: {
        totalCustomers,
        activeCustomers,
        filteredCustomers,
      },
      pagination: {
        page,
        limit,
        total: filteredCustomers,
        totalPages: Math.ceil(filteredCustomers / limit),
      },
    });
  } catch (error) {
    console.error("[ADMIN_CUSTOMERS_GET_ERROR]", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to fetch customers.",
      },
      { status: 500 }
    );
  }
}
