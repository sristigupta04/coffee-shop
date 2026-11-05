
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getcurrentuser } from "@/app/lib/auth";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

// ==========================================
// ADMIN AUTHORIZATION
// ==========================================

async function authorizeAdmin() {
  const user = await getcurrentuser();

  if (!user) {
    return {
      authorized: false as const,
      response: NextResponse.json(
        { success: false, message: "Please login first." },
        { status: 401 }
      ),
    };
  }

  if (user.role !== "ADMIN") {
    return {
      authorized: false as const,
      response: NextResponse.json(
        { success: false, message: "Admin access required." },
        { status: 403 }
      ),
    };
  }

  return {
    authorized: true as const,
  };
}

// ==========================================
// GET: STOCK MOVEMENT HISTORY
// ==========================================

export async function GET(request: NextRequest) {
  try {
    const auth = await authorizeAdmin();

    if (!auth.authorized) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);

    // ==========================================
    // PAGINATION
    // ==========================================

    const page = Math.max(
      1,
      Number(searchParams.get("page")) || 1
    );

    const pageSize = Math.min(
      100,
      Math.max(1, Number(searchParams.get("limit")) || 20)
    );

    // ==========================================
    // FILTERS
    // ==========================================

    const type = searchParams.get("type");
    const productId = searchParams.get("productId");
    const search = searchParams.get("search")?.trim();

    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (type && !["ADD", "REMOVE", "SET"].includes(type)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid movement type.",
        },
        { status: 400 }
      );
    }

    if (from && Number.isNaN(Date.parse(from))) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid start date.",
        },
        { status: 400 }
      );
    }

    if (to && Number.isNaN(Date.parse(to))) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid end date.",
        },
        { status: 400 }
      );
    }

    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;

    if (
      fromDate &&
      toDate &&
      fromDate.getTime() > toDate.getTime()
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Start date cannot be after end date.",
        },
        { status: 400 }
      );
    }

    // ==========================================
    // WHERE CONDITION
    // ==========================================

    const where: Prisma.StockMovementWhereInput = {
      ...(type
        ? {
            type: type as "ADD" | "REMOVE" | "SET",
          }
        : {}),

      ...(productId ? { productId } : {}),

      ...(search
        ? {
            OR: [
              {
                product: {
                  name: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              },
              {
                user: {
                  name: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              },
              {
                reason: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            ],
          }
        : {}),

      ...(fromDate || toDate
        ? {
            createdAt: {
              ...(fromDate ? { gte: fromDate } : {}),
              ...(toDate ? { lte: toDate } : {}),
            },
          }
        : {}),
    };

    // ==========================================
    // FETCH MOVEMENTS, COUNT AND SUMMARY
    // ==========================================

    const [movements, totalRecords, summary] =
      await prisma.$transaction([
        // Movement records
        prisma.stockMovement.findMany({
          where,
          include: {
            product: {
              select: {
                id: true,
                name: true,
                image: true,
                price: true,
                category: {
                  select: {
                    name: true,
                  },
                },
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
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),

        // Total records
        prisma.stockMovement.count({
          where,
        }),

        // Summary records
        prisma.stockMovement.findMany({
          where,
          select: {
            type: true,
            quantity: true,
          },
        }),
      ]);

    // ==========================================
    // SUMMARY CALCULATION
    // ==========================================

    const totalPages = Math.ceil(totalRecords / pageSize);

    const summaryData = {
      totalMovements: totalRecords,
      additions: 0,
      removals: 0,
      manualAdjustments: 0,
      addedQuantity: 0,
      removedQuantity: 0,
    };

    for (const item of summary) {
      if (item.type === "ADD") {
        summaryData.additions += 1;
        summaryData.addedQuantity += item.quantity;
      } else if (item.type === "REMOVE") {
        summaryData.removals += 1;
        summaryData.removedQuantity += item.quantity;
      } else if (item.type === "SET") {
        summaryData.manualAdjustments += 1;
      }
    }

    // ==========================================
    // SUCCESS RESPONSE
    // ==========================================

    return NextResponse.json({
      success: true,
      movements,
      summary: summaryData,
      pagination: {
        page,
        pageSize,
        totalRecords,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Stock history GET error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch stock movement history.",
      },
      { status: 500 }
    );
  }
}
