
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/app/lib/prisma";
import { getcurrentuser } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

const DISCOUNT_TYPES = ["FLAT", "PERCENTAGE"] as const;

const getAdmin = async () => {
  const user = await getcurrentuser();

  if (!user) {
    return {
      authorized: false,
      status: 401,
      message: "Authentication required.",
    };
  }

  if (user.role !== "ADMIN") {
    return {
      authorized: false,
      status: 403,
      message: "Admin access required.",
    };
  }

  return { authorized: true };
};

export async function GET(request: NextRequest) {
  try {
    const auth = await getAdmin();

    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, message: auth.message },
        { status: auth.status }
      );
    }

    const params = request.nextUrl.searchParams;

    const search = params.get("search")?.trim() ?? "";
    const requestedStatus = (
      params.get("status") ?? "ALL"
    ).toUpperCase();

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

    const now = new Date();

    if (
      !["ALL", "ACTIVE", "INACTIVE", "EXPIRED"].includes(
        requestedStatus
      )
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid coupon status." },
        { status: 400 }
      );
    }

    const where = {
      ...(search
        ? {
            OR: [
              {
                code: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
              {
                description: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : {}),

      ...(requestedStatus === "ACTIVE"
        ? {
            isActive: true,
            expireDate: { gt: now },
          }
        : {}),

      ...(requestedStatus === "INACTIVE"
        ? {
            isActive: false,
          }
        : {}),

      ...(requestedStatus === "EXPIRED"
        ? {
            isActive: true,
            expireDate: { lte: now },
          }
        : {}),
    };

    const [
      coupons,
      total,
      totalCoupons,
      activeCoupons,
      inactiveCoupons,
      expiredCoupons,
    ] = await Promise.all([
      prisma.coupon.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: {
            select: {
              orders: true,
            },
          },
        },
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
        },
      }),

      prisma.coupon.count({
        where: {
          isActive: true,
          expireDate: { lte: now },
        },
      }),
    ]);

    const formattedCoupons = coupons.map((coupon) => {
      const { _count, ...couponDetails } = coupon;

      return {
        ...couponDetails,
        orderCount: _count.orders,
        isExpired: coupon.expireDate <= now,
      };
    });

    return NextResponse.json({
      success: true,
      coupons: formattedCoupons,
      summary: {
        totalCoupons,
        activeCoupons,
        inactiveCoupons,
        expiredCoupons,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[ADMIN_COUPONS_GET_ERROR]", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to fetch coupons.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAdmin();

    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, message: auth.message },
        { status: auth.status }
      );
    }

    const body = await request.json();

    const code =
      typeof body.code === "string"
        ? body.code.trim().toUpperCase()
        : "";

    const description =
      typeof body.description === "string"
        ? body.description.trim()
        : "";

    const discount = Number(body.discount);
    const minimumAmount =
      body.minimumAmount === undefined
        ? 0
        : Number(body.minimumAmount);

    const discountType = body.discountType ?? "PERCENTAGE";

    const maximumDiscount =
      body.maximumDiscount === undefined ||
      body.maximumDiscount === null ||
      body.maximumDiscount === ""
        ? null
        : Number(body.maximumDiscount);

    const usageLimit =
      body.usageLimit === undefined ||
      body.usageLimit === null ||
      body.usageLimit === ""
        ? null
        : Number(body.usageLimit);

    const expireDate = new Date(body.expireDate);

    if (!code || !description || !body.expireDate) {
      return NextResponse.json(
        {
          success: false,
          message: "Code, description and expiry date are required.",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isFinite(discount) ||
      discount <= 0 ||
      !Number.isFinite(minimumAmount) ||
      minimumAmount < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Enter valid discount and minimum amount values.",
        },
        { status: 400 }
      );
    }

    if (
      !DISCOUNT_TYPES.includes(
        discountType as (typeof DISCOUNT_TYPES)[number]
      )
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid discount type." },
        { status: 400 }
      );
    }

    if (discountType === "PERCENTAGE" && discount > 100) {
      return NextResponse.json(
        {
          success: false,
          message: "Percentage discount cannot exceed 100.",
        },
        { status: 400 }
      );
    }

    if (
      maximumDiscount !== null &&
      (!Number.isFinite(maximumDiscount) || maximumDiscount <= 0)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Maximum discount must be a positive number.",
        },
        { status: 400 }
      );
    }

    if (
      usageLimit !== null &&
      (!Number.isInteger(usageLimit) || usageLimit <= 0)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Usage limit must be a positive whole number.",
        },
        { status: 400 }
      );
    }

    if (Number.isNaN(expireDate.getTime())) {
      return NextResponse.json(
        { success: false, message: "Invalid expiry date." },
        { status: 400 }
      );
    }

    const existingCoupon = await prisma.coupon.findUnique({
      where: { code },
    });

    if (existingCoupon) {
      return NextResponse.json(
        { success: false, message: "Coupon code already exists." },
        { status: 409 }
      );
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
        coupon,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[ADMIN_COUPONS_POST_ERROR]", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to create coupon.",
      },
      { status: 500 }
    );
  }
}
