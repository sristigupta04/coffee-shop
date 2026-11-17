
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getcurrentuser } from "@/app/lib/auth";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const MAX_PAGE = 1_000_000;

const MOVEMENT_TYPES = ["ADD", "REMOVE", "SET"] as const;
type MovementType = (typeof MOVEMENT_TYPES)[number];

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

  return { authorized: true as const };
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

    const searchParams = request.nextUrl.searchParams;

    // ==========================================
    // PAGINATION
    // ==========================================

    const rawPage = searchParams.get("page");
    const rawLimit = searchParams.get("limit");

    const page = rawPage === null ? 1 : Number(rawPage);

    const pageSize =
      rawLimit === null
        ? DEFAULT_PAGE_SIZE
        : Number(rawLimit);

    if (
      !Number.isSafeInteger(page) ||
      page < 1 ||
      page > MAX_PAGE
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid page number.",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isSafeInteger(pageSize) ||
      pageSize < 1 ||
      pageSize > MAX_PAGE_SIZE
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Limit must be between 1 and 100.",
        },
        { status: 400 }
      );
    }

    // ==========================================
    // FILTERS
    // ==========================================

    const rawType = searchParams.get("type");
    const productId = searchParams.get("productId")?.trim();
    const search = searchParams.get("search")?.trim();

    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (
      rawType &&
      !MOVEMENT_TYPES.includes(rawType as MovementType)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid movement type.",
        },
        { status: 400 }
      );
    }

    if (search && search.length > 200) {
      return NextResponse.json(
        {
          success: false,
          message: "Search cannot exceed 200 characters.",
        },
        { status: 400 }
      );
    }

    if (productId && productId.length > 200) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid product ID.",
        },
        { status: 400 }
      );
    }

    // ==========================================
    // DATE VALIDATION
    // ==========================================

    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;

    if (fromDate && Number.isNaN(fromDate.getTime())) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid start date.",
        },
        { status: 400 }
      );
    }

    if (toDate && Number.isNaN(toDate.getTime())) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid end date.",
        },
        { status: 400 }
      );
    }

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
      ...(rawType
        ? { type: rawType as MovementType }
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
    // FETCH MOVEMENTS + SUMMARY
    // ==========================================

    const [movements, totalRecords, summaryRecords] =
      await prisma.$transaction([
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
          orderBy: [
            { createdAt: "desc" },
            { id: "desc" },
          ],
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),

        prisma.stockMovement.count({
          where,
        }),

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

    const summary = {
      totalMovements: totalRecords,
      additions: 0,
      removals: 0,
      manualAdjustments: 0,
      addedQuantity: 0,
      removedQuantity: 0,
    };

    for (const movement of summaryRecords) {
      if (movement.type === "ADD") {
        summary.additions += 1;
        summary.addedQuantity += movement.quantity;
      } else if (movement.type === "REMOVE") {
        summary.removals += 1;
        summary.removedQuantity += movement.quantity;
      } else if (movement.type === "SET") {
        summary.manualAdjustments += 1;
      }
    }

    // ==========================================
    // SUCCESS RESPONSE
    // ==========================================

    return NextResponse.json({
      success: true,
      movements,
      summary,
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
