
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getcurrentuser } from "@/app/lib/auth";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const PAGE_SIZE_MAX = 100;

type CouponStatus = "ALL" | "ACTIVE" | "INACTIVE" | "EXPIRED";

function errorResponse(message: string, status = 400) {
  return NextResponse.json(
    { success: false, message },
    { status }
  );
}

async function authorizeAdmin() {
  const user = await getcurrentuser();

  if (!user?.id) {
    return {
      authorized: false as const,
      response: errorResponse("Please login first.", 401),
    };
  }

  if (user.role !== "ADMIN") {
    return {
      authorized: false as const,
      response: errorResponse("Admin access required.", 403),
    };
  }

  return { authorized: true as const };
}

function isValidDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    !Number.isNaN(new Date(value).getTime())
  );
}

function parseOptionalNumber(
  value: unknown,
  field: string,
  minimum = 0
): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < minimum) {
    throw new Error(`Invalid ${field}.`);
  }

  return parsed;
}

function isPrismaError(error: unknown, code: string) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}

// GET: List coupons with search, status filter and pagination
export async function GET(request: NextRequest) {
  try {
    const auth = await authorizeAdmin();
    if (!auth.authorized) return auth.response;

    const searchParams = request.nextUrl.searchParams;

    const search = (searchParams.get("search") || "").trim();
    const status = (searchParams.get("status") || "ALL") as CouponStatus;

    const pageValue = Number(searchParams.get("page") || 1);
    const limitValue = Number(searchParams.get("limit") || 10);

    if (!["ALL", "ACTIVE", "INACTIVE", "EXPIRED"].includes(status)) {
      return errorResponse("Invalid coupon status filter.");
    }

    if (
      !Number.isInteger(pageValue) ||
      pageValue < 1 ||
      !Number.isInteger(limitValue) ||
      limitValue < 1
    ) {
      return errorResponse("Invalid pagination values.");
    }

    const page = pageValue;
    const limit = Math.min(limitValue, PAGE_SIZE_MAX);
    const now = new Date();

    const where: Prisma.CouponWhereInput = {
      ...(search
        ? {
            OR: [
              {
                code: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                description: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            ],
          }
        : {}),
      ...(status === "ACTIVE"
        ? { isActive: true, expireDate: { gt: now } }
        : {}),
      ...(status === "INACTIVE"
        ? { isActive: false, expireDate: { gt: now } }
        : {}),
      ...(status === "EXPIRED"
        ? { expireDate: { lte: now } }
        : {}),
    };

    const [
      coupons,
      totalFiltered,
      totalCoupons,
      activeCoupons,
      inactiveCoupons,
      expiredCoupons,
    ] = await Promise.all([
      prisma.coupon.findMany({
        where,
        orderBy: [
          { createdAt: "desc" },
          { id: "desc" },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.coupon.count({ where }),
      prisma.coupon.count(),
      prisma.coupon.count({
        where: {
          isActive: true,
          expireDate: { gt: now },
        },
      }),
      prisma.coupon.count({
        where: {
          isActive: false,
          expireDate: { gt: now },
        },
      }),
      prisma.coupon.count({
        where: {
          expireDate: { lte: now },
        },
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalFiltered / limit));

    return NextResponse.json({
      success: true,
      coupons: coupons.map((coupon) => ({
        ...coupon,
        discount: Number(coupon.discount),
        minimumAmount: Number(coupon.minimumAmount),
        maximumDiscount:
          coupon.maximumDiscount === null
            ? null
            : Number(coupon.maximumDiscount),
        isExpired: coupon.expireDate <= now,
      })),
      summary: {
        totalCoupons,
        activeCoupons,
        inactiveCoupons,
        expiredCoupons,
      },
      pagination: {
        page,
        limit,
        totalRecords: totalFiltered,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Admin coupons GET error:", error);
    return errorResponse("Failed to fetch coupons.", 500);
  }
}

// POST: Create coupon
export async function POST(request: NextRequest) {
  try {
    const auth = await authorizeAdmin();
    if (!auth.authorized) return auth.response;

    const body: unknown = await request.json().catch(() => null);

    if (
      typeof body !== "object" ||
      body === null ||
      Array.isArray(body)
    ) {
      return errorResponse("Invalid request body.");
    }

    const data = body as Record<string, unknown>;

    const code =
      typeof data.code === "string"
        ? data.code.trim().toUpperCase()
        : "";

    const description =
      typeof data.description === "string"
        ? data.description.trim()
        : "";

    if (!code || code.length > 50) {
      return errorResponse("Coupon code is required (maximum 50 characters).");
    }

    if (!/^[A-Z0-9_-]+$/.test(code)) {
      return errorResponse(
        "Coupon code can contain only letters, numbers, hyphens and underscores."
      );
    }

    if (!description || description.length > 500) {
      return errorResponse("A valid coupon description is required.");
    }

    const discountType = data.discountType;

    if (discountType !== "FLAT" && discountType !== "PERCENTAGE") {
      return errorResponse("Invalid discount type.");
    }

    const discount = parseOptionalNumber(data.discount, "discount", 0.01);
    const minimumAmount = parseOptionalNumber(
      data.minimumAmount ?? 0,
      "minimum amount",
      0
    );

    const maximumDiscount = parseOptionalNumber(
      data.maximumDiscount,
      "maximum discount",
      0.01
    );

    const usageLimit = parseOptionalNumber(
      data.usageLimit,
      "usage limit",
      1
    );

    if (discount === null || minimumAmount === null) {
      return errorResponse("Discount and minimum amount are required.");
    }

    if (
      discountType === "PERCENTAGE" &&
      discount > 100
    ) {
      return errorResponse("Percentage discount cannot exceed 100.");
    }

    if (
      usageLimit !== null &&
      !Number.isSafeInteger(usageLimit)
    ) {
      return errorResponse("Usage limit must be a whole number.");
    }

    if (!isValidDate(data.expireDate)) {
      return errorResponse("A valid expiry date is required.");
    }

    const expireDate = new Date(data.expireDate);

    if (expireDate <= new Date()) {
      return errorResponse("Expiry date must be in the future.");
    }

    const existing = await prisma.coupon.findUnique({
      where: { code },
      select: { id: true },
    });

    if (existing) {
      return errorResponse("This coupon code already exists.", 409);
    }

    const coupon = await prisma.coupon.create({
      data: {
        code,
        description,
        discount,
        discountType,
        minimumAmount,
        maximumDiscount,
        usageLimit,
        expireDate,
        isActive: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Coupon created successfully.",
        coupon: {
          ...coupon,
          discount: Number(coupon.discount),
          minimumAmount: Number(coupon.minimumAmount),
          maximumDiscount:
            coupon.maximumDiscount === null
              ? null
              : Number(coupon.maximumDiscount),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Admin coupons POST error:", error);

    if (error instanceof Error && error.message.startsWith("Invalid ")) {
      return errorResponse(error.message);
    }

    if (isPrismaError(error, "P2002")) {
      return errorResponse("This coupon code already exists.", 409);
    }

    return errorResponse("Failed to create coupon.", 500);
  }
}
