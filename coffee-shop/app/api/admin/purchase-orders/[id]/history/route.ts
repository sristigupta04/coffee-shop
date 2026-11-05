
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getcurrentuser } from "@/app/lib/auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const auth = await getcurrentuser();

    if (!auth?.id || auth.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Unauthorized access" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;

    const page = Math.max(
      1,
      Number(searchParams.get("page")) || 1
    );

    const limit = Math.min(
      100,
      Math.max(1, Number(searchParams.get("limit")) || 10)
    );

    const skip = (page - 1) * limit;

    // Verify purchase order
    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        supplier: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!purchaseOrder) {
      return NextResponse.json(
        { success: false, message: "Purchase order not found" },
        { status: 404 }
      );
    }

    // Direct relation-based receiving history
    const where = {
      purchaseOrderId: id,
      purchaseOrderItemId: { not: null },
      type: "ADD" as const,
    };

    const [movements, total, aggregate] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              image: true,
              stock: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),

      prisma.stockMovement.count({ where }),

      prisma.stockMovement.aggregate({
        where,
        _sum: {
          quantity: true,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Receiving history fetched successfully",
      data: {
        purchaseOrder,
        movements,
        summary: {
          totalRecords: total,
          totalReceivedQuantity: aggregate._sum.quantity || 0,
        },
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page * limit < total,
          hasPreviousPage: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Purchase order history error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch receiving history",
      },
      { status: 500 }
    );
  }
}
