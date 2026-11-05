
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { code, totalAmount } = body;

    // 1. Input validation
    if (
      typeof code !== "string" ||
      !code.trim() ||
      totalAmount === undefined ||
      !Number.isFinite(Number(totalAmount)) ||
      Number(totalAmount) < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Valid coupon code and total amount are required",
        },
        { status: 400 }
      );
    }

    const normalizedCode = code.trim().toUpperCase();
    const amount = Number(totalAmount);

    // 2. Find coupon
    const coupon = await prisma.coupon.findUnique({
      where: {
        code: normalizedCode,
      },
    });

    if (!coupon) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid coupon code",
        },
        { status: 404 }
      );
    }

    // 3. Active check
    if (!coupon.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: "Coupon is inactive",
        },
        { status: 400 }
      );
    }

    // 4. Expiry check
    if (coupon.expireDate < new Date()) {
      return NextResponse.json(
        {
          success: false,
          error: "Coupon has expired",
        },
        { status: 400 }
      );
    }

    // 5. Usage limit check
    if (
      coupon.usageLimit !== null &&
      coupon.usedCount >= coupon.usageLimit
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Coupon usage limit has been reached",
        },
        { status: 400 }
      );
    }

    // 6. Minimum amount check
    if (amount < Number(coupon.minimumAmount)) {
      return NextResponse.json(
        {
          success: false,
          error: `Minimum order amount is ₹${coupon.minimumAmount}`,
        },
        { status: 400 }
      );
    }

    // 7. Calculate discount
    let discountAmount = 0;

    if (coupon.discountType === "PERCENTAGE") {
      discountAmount =
        (amount * Number(coupon.discount)) / 100;

      if (coupon.maximumDiscount !== null) {
        discountAmount = Math.min(
          discountAmount,
          Number(coupon.maximumDiscount)
        );
      }
    } else if (coupon.discountType === "FLAT") {
      discountAmount = Number(coupon.discount);
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid coupon discount type",
        },
        { status: 400 }
      );
    }

    // 8. Prevent discount exceeding order amount
    discountAmount = Math.min(
      Math.max(0, discountAmount),
      amount
    );

    // Round monetary values to 2 decimal places
    discountAmount =
      Math.round(discountAmount * 100) / 100;

    const finalAmount =
      Math.round((amount - discountAmount) * 100) / 100;

    // 9. Success response
    return NextResponse.json(
      {
        success: true,
        message: "Coupon applied successfully",
        coupon: {
          id: coupon.id,
          code: coupon.code,
          description: coupon.description,
          discount: coupon.discount,
          discountType: coupon.discountType,
          minimumAmount: coupon.minimumAmount,
          maximumDiscount: coupon.maximumDiscount,
        },
        discountAmount,
        finalAmount,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Coupon validation error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to validate coupon",
      },
      { status: 500 }
    );
  }
}
