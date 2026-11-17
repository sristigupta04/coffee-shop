
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getcurrentuser } from "@/app/lib/auth";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

function errorResponse(message: string, status = 400) {
  return NextResponse.json(
    { success: false, message },
    { status }
  );
}

export async function GET(req: NextRequest) {
  try {
    // 1. Admin authorization
    const user = await getcurrentuser();

    if (!user) {
      return errorResponse("Unauthorized", 401);
    }

    if (user.role !== "ADMIN") {
      return errorResponse("Forbidden", 403);
    }

    // 2. Query parameters
    const { searchParams } = new URL(req.url);

    const page = Math.max(
      1,
      Number.parseInt(searchParams.get("page") || "1", 10) || 1
    );

    const limit = Math.min(
      100,
      Math.max(
        1,
        Number.parseInt(searchParams.get("limit") || "10", 10) || 10
      )
    );

    const search = searchParams.get("search")?.trim() || "";
    const paymentStatus = searchParams.get("paymentStatus") || "ALL";
    const refundStatus = searchParams.get("refundStatus") || "ALL";
    const paymentWay = searchParams.get("paymentWay") || "ALL";
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    // 3. Build filters
    const where: Prisma.OrderWhereInput = {};

    if (search) {
      where.OR = [
        { id: { contains: search, mode: "insensitive" } },
        {
          razorpayOrderId: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          razorpayPaymentId: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          refundId: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          user: {
            is: {
              OR: [
                {
                  name: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
                {
                  email: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              ],
            },
          },
        },
      ];
    }

    if (paymentStatus !== "ALL") {
      where.paymentStatus = paymentStatus;
    }

    if (refundStatus !== "ALL") {
      where.refundStatus = refundStatus;
    }

    if (paymentWay !== "ALL") {
      where.paymentWay = paymentWay;
    }

    if (from || to) {
      const createdAt: Prisma.DateTimeFilter = {};

      if (from) {
        const fromDate = new Date(from);

        if (Number.isNaN(fromDate.getTime())) {
          return errorResponse("Invalid start date");
        }

        createdAt.gte = fromDate;
      }

      if (to) {
        const toDate = new Date(to);

        if (Number.isNaN(toDate.getTime())) {
          return errorResponse("Invalid end date");
        }

        toDate.setHours(23, 59, 59, 999);
        createdAt.lte = toDate;
      }

      where.createdAt = createdAt;
    }

    // 4. Fetch payment records and summary
    const paidWhere: Prisma.OrderWhereInput = {
      paymentStatus: {
        in: ["PAID", "REFUNDED"],
      },
    };

    const [
      payments,
      totalRecords,
      totalTransactions,
      paidCount,
      pendingCount,
      verifyingCount,
      refundingCount,
      refundedCount,
      failedRefundCount,
      grossRevenue,
      refundTotal,
    ] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          items: {
            select: {
              id: true,
              quantity: true,
              price: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,
      }),

      prisma.order.count({ where }),

      prisma.order.count(),

      prisma.order.count({
        where: { paymentStatus: "PAID" },
      }),

      prisma.order.count({
        where: { paymentStatus: "PENDING" },
      }),

      prisma.order.count({
        where: { paymentStatus: "VERIFYING" },
      }),

      prisma.order.count({
        where: { paymentStatus: "REFUNDING" },
      }),

      prisma.order.count({
        where: { paymentStatus: "REFUNDED" },
      }),

      prisma.order.count({
        where: { refundStatus: "FAILED" },
      }),

      prisma.order.aggregate({
        where: paidWhere,
        _sum: {
          totalPrice: true,
        },
      }),

      prisma.order.aggregate({
        where: {
          refundStatus: "PROCESSED",
        },
        _sum: {
          refundAmount: true,
        },
      }),
    ]);

    // 5. Pagination
    const totalPages = Math.ceil(totalRecords / limit);

    // 6. Summary
    const totalGrossRevenue = Number(
      grossRevenue._sum.totalPrice || 0
    );

    const totalRefunded = Number(
      refundTotal._sum.refundAmount || 0
    );

    const summary = {
      totalTransactions,
      paidCount,
      pendingCount,
      verifyingCount,
      refundingCount,
      refundedCount,
      failedRefundCount,
      grossRevenue: totalGrossRevenue,
      totalRefunded,
      netRevenue: totalGrossRevenue - totalRefunded,
    };

    return NextResponse.json({
      success: true,
      data: payments,
      summary,
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error("[ADMIN_PAYMENTS_GET_ERROR]", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to fetch payment records",
      },
      { status: 500 }
    );
  }
}
