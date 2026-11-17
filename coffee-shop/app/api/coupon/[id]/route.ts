
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/app/lib/prisma";
import { getcurrentuser } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

const DISCOUNT_TYPES = ["FLAT", "PERCENTAGE"] as const;

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function authorizeAdmin() {
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
}

// GET: Fetch one coupon
export async function GET(
  _request: NextRequest,
  { params }: RouteContext
) {
  try {
    const auth = await authorizeAdmin();

    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, message: auth.message },
        { status: auth.status }
      );
    }

    const { id } = await params;

    const coupon = await prisma.coupon.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            orders: true,
          },
        },
      },
    });

    if (!coupon) {
      return NextResponse.json(
        { success: false, message: "Coupon not found." },
        { status: 404 }
      );
    }

    const { _count, ...couponDetails } = coupon;

    return NextResponse.json({
      success: true,
      coupon: {
        ...couponDetails,
        orderCount: _count.orders,
        isExpired: coupon.expireDate <= new Date(),
      },
    });
  } catch (error) {
    console.error("[ADMIN_COUPON_GET_ERROR]", error);

    return NextResponse.json(
      { success: false, message: "Unable to fetch coupon." },
      { status: 500 }
    );
  }
}

// PUT: Update coupon
export async function PUT(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const auth = await authorizeAdmin();

    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, message: auth.message },
        { status: auth.status }
      );
    }

    const { id } = await params;
    const body = await request.json();

    const existingCoupon = await prisma.coupon.findUnique({
      where: { id },
    });

    if (!existingCoupon) {
      return NextResponse.json(
        { success: false, message: "Coupon not found." },
        { status: 404 }
      );
    }

    const data: {
      code?: string;
      description?: string;
      discount?: number;
      discountType?: (typeof DISCOUNT_TYPES)[number];
      minimumAmount?: number;
      maximumDiscount?: number | null;
      usageLimit?: number | null;
      expireDate?: Date;
      isActive?: boolean;
    } = {};

    if (body.code !== undefined) {
      if (
        typeof body.code !== "string" ||
        !body.code.trim()
      ) {
        return NextResponse.json(
          { success: false, message: "Invalid coupon code." },
          { status: 400 }
        );
      }

      const code = body.code.trim().toUpperCase();

      const duplicate = await prisma.coupon.findFirst({
        where: {
          code,
          NOT: { id },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { success: false, message: "Coupon code already exists." },
          { status: 409 }
        );
      }

      data.code = code;
    }

    if (body.description !== undefined) {
      if (
        typeof body.description !== "string" ||
        !body.description.trim()
      ) {
        return NextResponse.json(
          { success: false, message: "Invalid description." },
          { status: 400 }
        );
      }

      data.description = body.description.trim();
    }

    const discountType =
      body.discountType ?? existingCoupon.discountType;

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

    data.discountType = discountType;

    if (body.discount !== undefined) {
      const discount = Number(body.discount);

      if (!Number.isFinite(discount) || discount <= 0) {
        return NextResponse.json(
          { success: false, message: "Invalid discount amount." },
          { status: 400 }
        );
      }

      data.discount = discount;
    }

    const finalDiscount =
      data.discount ?? existingCoupon.discount;

    if (
      discountType === "PERCENTAGE" &&
      finalDiscount > 100
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Percentage discount cannot exceed 100.",
        },
        { status: 400 }
      );
    }

    if (body.minimumAmount !== undefined) {
      const minimumAmount = Number(body.minimumAmount);

      if (
        !Number.isFinite(minimumAmount) ||
        minimumAmount < 0
      ) {
        return NextResponse.json(
          { success: false, message: "Invalid minimum amount." },
          { status: 400 }
        );
      }

      data.minimumAmount = minimumAmount;
    }

    if (body.maximumDiscount !== undefined) {
      if (
        body.maximumDiscount === null ||
        body.maximumDiscount === ""
      ) {
        data.maximumDiscount = null;
      } else {
        const maximumDiscount = Number(body.maximumDiscount);

        if (
          !Number.isFinite(maximumDiscount) ||
          maximumDiscount <= 0
        ) {
          return NextResponse.json(
            {
              success: false,
              message: "Maximum discount must be positive.",
            },
            { status: 400 }
          );
        }

        data.maximumDiscount = maximumDiscount;
      }
    }

    if (body.usageLimit !== undefined) {
      if (body.usageLimit === null || body.usageLimit === "") {
        data.usageLimit = null;
      } else {
        const usageLimit = Number(body.usageLimit);

        if (
          !Number.isInteger(usageLimit) ||
          usageLimit <= 0
        ) {
          return NextResponse.json(
            {
              success: false,
              message: "Usage limit must be a positive whole number.",
            },
            { status: 400 }
          );
        }

        if (usageLimit < existingCoupon.usedCount) {
          return NextResponse.json(
            {
              success: false,
              message: "Usage limit cannot be less than coupons already used.",
            },
            { status: 400 }
          );
        }

        data.usageLimit = usageLimit;
      }
    }

    if (body.expireDate !== undefined) {
      const expireDate = new Date(body.expireDate);

      if (Number.isNaN(expireDate.getTime())) {
        return NextResponse.json(
          { success: false, message: "Invalid expiry date." },
          { status: 400 }
        );
      }

      data.expireDate = expireDate;
    }

    if (body.isActive !== undefined) {
      if (typeof body.isActive !== "boolean") {
        return NextResponse.json(
          { success: false, message: "Invalid active status." },
          { status: 400 }
        );
      }

      data.isActive = body.isActive;
    }

    const coupon = await prisma.coupon.update({
      where: { id },
      data,
    });

    return NextResponse.json({
      success: true,
      message: "Coupon updated successfully.",
      coupon,
    });
  } catch (error) {
    console.error("[ADMIN_COUPON_PUT_ERROR]", error);

    return NextResponse.json(
      { success: false, message: "Unable to update coupon." },
      { status: 500 }
    );
  }
}

// DELETE: Soft deactivate coupon
export async function DELETE(
  _request: NextRequest,
  { params }: RouteContext
) {
  try {
    const auth = await authorizeAdmin();

    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, message: auth.message },
        { status: auth.status }
      );
    }

    const { id } = await params;

    const existingCoupon = await prisma.coupon.findUnique({
      where: { id },
    });

    if (!existingCoupon) {
      return NextResponse.json(
        { success: false, message: "Coupon not found." },
        { status: 404 }
      );
    }

    if (!existingCoupon.isActive) {
      return NextResponse.json({
        success: true,
        message: "Coupon is already inactive.",
      });
    }

    await prisma.coupon.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({
      success: true,
      message: "Coupon deactivated successfully.",
    });
  } catch (error) {
    console.error("[ADMIN_COUPON_DELETE_ERROR]", error);

    return NextResponse.json(
      { success: false, message: "Unable to deactivate coupon." },
      { status: 500 }
    );
  }
}
