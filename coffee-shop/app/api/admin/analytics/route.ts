
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/app/lib/prisma";
import { getcurrentuser } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // 1. Authentication and admin authorization
    const user = await getcurrentuser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    if (user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Admin access required" },
        { status: 403 }
      );
    }

    // 2. Date filters
    const { searchParams } = new URL(req.url);
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    const from = fromParam ? new Date(fromParam) : new Date();
    const to = toParam ? new Date(toParam) : new Date();

    if (
      Number.isNaN(from.getTime()) ||
      Number.isNaN(to.getTime()) ||
      from > to
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid date range" },
        { status: 400 }
      );
    }

    from.setHours(0, 0, 0, 0);
    to.setHours(0, 0, 0, 0);
    to.setDate(to.getDate() + 1);

    const dateFilter = {
      createdAt: {
        gte: from,
        lt: to,
      },
    };

    // Explicit Prisma type prevents enum values becoming plain strings.
    const paidOrderFilter: Prisma.OrderWhereInput = {
      ...dateFilter,
      paymentStatus: {
        in: ["PAID", "COMPLETED"],
      },
      status: {
        not: "CANCELLED",
      },
    };

    // 3. Fetch analytics in parallel
    const [
      revenue,
      totalOrders,
      pendingOrders,
      completedOrders,
      cancelledOrders,
      newCustomers,
      totalCustomers,
      totalProducts,
      lowStockProducts,
      recentOrders,
      orderItems,
    ] = await Promise.all([
      // Paid revenue
      prisma.order.aggregate({
        where: paidOrderFilter,
        _sum: {
          totalPrice: true,
        },
      }),

      // All orders in selected period
      prisma.order.count({
        where: dateFilter,
      }),

      prisma.order.count({
        where: {
          ...dateFilter,
          status: {
            in: ["PENDING", "CONFIRMED", "PREPARING"],
          },
        },
      }),

      prisma.order.count({
        where: {
          ...dateFilter,
          status: "DELIVERED",
        },
      }),

      prisma.order.count({
        where: {
          ...dateFilter,
          status: "CANCELLED",
        },
      }),

      // Customers registered in selected period
      prisma.user.count({
        where: {
          createdAt: dateFilter.createdAt,
          role: "USER",
        },
      }),

      // All registered customers
      prisma.user.count({
        where: {
          role: "USER",
        },
      }),

      prisma.product.count(),

      // Products with stock of 5 or less
      prisma.product.count({
        where: {
          stock: {
            lte: 5,
          },
        },
      }),

      // Recent orders
      prisma.order.findMany({
        where: dateFilter,
        orderBy: {
          createdAt: "desc",
        },
        take: 8,
        select: {
          id: true,
          totalPrice: true,
          status: true,
          paymentStatus: true,
          createdAt: true,
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      }),

      // Historical order item prices for paid orders
      prisma.orderItem.findMany({
        where: {
          order: paidOrderFilter,
        },
        select: {
          productId: true,
          quantity: true,
          price: true,
        },
      }),
    ]);

    // 4. Fetch product details separately
    const productIds = [
      ...new Set(orderItems.map((item) => item.productId)),
    ];

    const products = productIds.length
      ? await prisma.product.findMany({
          where: {
            id: {
              in: productIds,
            },
          },
          select: {
            id: true,
            name: true,
            image: true,
          },
        })
      : [];

    // 5. Calculate top-selling products
    const productSalesMap = new Map<
      string,
      {
        id: string;
        quantitySold: number;
        revenue: number;
      }
    >();

    for (const item of orderItems) {
      const existing = productSalesMap.get(item.productId);

      const quantity = item.quantity;
      const itemRevenue = quantity * Number(item.price);

      if (existing) {
        existing.quantitySold += quantity;
        existing.revenue += itemRevenue;
      } else {
        productSalesMap.set(item.productId, {
          id: item.productId,
          quantitySold: quantity,
          revenue: itemRevenue,
        });
      }
    }

    const topSellingProducts = Array.from(productSalesMap.values())
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, 5)
      .map((sale) => {
        const product = products.find(
          (item) => item.id === sale.id
        );

        return {
          id: sale.id,
          name: product?.name ?? "Deleted product",
          image: product?.image ?? "",
          quantitySold: sale.quantitySold,
          revenue: sale.revenue,
        };
      });

    // 6. Return analytics response
    return NextResponse.json({
      success: true,
      data: {
        summary: {
          revenue: Number(revenue._sum?.totalPrice ?? 0),
          totalOrders,
          pendingOrders,
          completedOrders,
          cancelledOrders,
          newCustomers,
          totalCustomers,
          totalProducts,
          lowStockProducts,
        },
        recentOrders,
        topSellingProducts,
        period: {
          from: from.toISOString(),
          to: new Date(to.getTime() - 1).toISOString(),
        },
      },
    });
  } catch (error) {
    console.error("Admin analytics error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load admin analytics",
      },
      { status: 500 }
    );
  }
}
