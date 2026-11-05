import { NextRequest, NextResponse } from "next/server";
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

    // 3. Fetch analytics in parallel
    const [
      revenue,
      totalOrders,
      pendingOrders,
      completedOrders,
      cancelledOrders,
      newCustomers,
      totalProducts,
      lowStockProducts,
      recentOrders,
      productSales,
    ] = await Promise.all([
      prisma.order.aggregate({
        where: {
          ...dateFilter,
          paymentStatus: { in: ["PAID", "COMPLETED"] },
          status: { not: "CANCELLED" },
        },
        _sum: { totalPrice: true },
      }),

      prisma.order.count({
        where: dateFilter,
      }),

      prisma.order.count({
        where: {
          ...dateFilter,
          status: { in: ["PENDING", "CONFIRMED", "PREPARING"] },
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

      prisma.user.count({
        where: {
          createdAt: dateFilter.createdAt,
          role: "USER",
        },
      }),

      prisma.product.count(),

      prisma.product.count({
        where: {
          stock: { lte: 5 },
        },
      }),

      prisma.order.findMany({
        where: dateFilter,
        orderBy: { createdAt: "desc" },
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

      prisma.orderItem.groupBy({
        by: ["productId"],
        where: {
          order: {
            ...dateFilter,
            status: { not: "CANCELLED" },
          },
        },
        _sum: {
          quantity: true,
        },
        orderBy: {
          _sum: {
            quantity: "desc",
          },
        },
        take: 5,
      }),
    ]);

    // 4. Resolve top-selling product names
    const topProducts = await prisma.product.findMany({
      where: {
        id: {
          in: productSales.map((item) => item.productId),
        },
      },
      select: {
        id: true,
        name: true,
        image: true,
        price: true,
      },
    });

    const topSellingProducts = productSales.map((sale) => {
      const product = topProducts.find(
        (item) => item.id === sale.productId
      );

      return {
        id: sale.productId,
        name: product?.name ?? "Deleted product",
        image: product?.image ?? "",
        quantitySold: sale._sum.quantity ?? 0,
        price: product?.price ?? 0,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          revenue: revenue._sum.totalPrice ?? 0,
          totalOrders,
          pendingOrders,
          completedOrders,
          cancelledOrders,
          newCustomers,
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