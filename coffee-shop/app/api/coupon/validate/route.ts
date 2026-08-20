import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { code, totalAmount } = body;

    if (!code || totalAmount === undefined) {
      return NextResponse.json(
        { error: "Coupon code and total amount are required" },
        { status: 400 }
      );
    }

    const coupon = await prisma.coupon.findUnique({
      where: {
        code: code.toUpperCase(),
      },
    });

    if (!coupon) {
      return NextResponse.json(
        { error: "Invalid coupon code" },
        { status: 404 }
      );
    }

    if (!coupon.isActive) {
      return NextResponse.json(
        { error: "Coupon is inactive" },
        { status: 400 }
      );
    }

if (coupon.expireDate < new Date()) {      return NextResponse.json(
        { error: "Coupon has expired" },
        { status: 400 }
      );
    }

    if (totalAmount < coupon.minimumAmount) {
      return NextResponse.json(
        {
          error: `Minimum order amount is ₹${coupon.minimumAmount}`,
        },
        { status: 400 }
      );
    }

    const discountAmount = (totalAmount * coupon.discount) / 100;

    const finalAmount = totalAmount - discountAmount;

    return NextResponse.json({
      success: true,
      coupon: {
        code: coupon.code,
        description: coupon.description,
        discount: coupon.discount,
      },
      discountAmount,
      finalAmount,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to validate coupon" },
      { status: 500 }
    );
  }
}