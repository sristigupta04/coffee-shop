import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Please login",
        },
        { status: 401 }
      );
    }

    const addresses = await prisma.address.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: [
        {
          isDefault: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
    });

    return NextResponse.json({
      success: true,
      data: addresses,
    });
  } catch (error) {
    console.error("GET ADDRESSES ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch addresses",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Please login",
        },
        { status: 401 }
      );
    }

    const body = await req.json();

    const {
      type,
      label,
      fullName,
      phone,
      addressLine,
      landmark,
      city,
      state,
      pincode,
      isDefault,
    } = body;

    if (
      !fullName ||
      !phone ||
      !addressLine ||
      !city ||
      !state ||
      !pincode
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Please fill all required fields",
        },
        { status: 400 }
      );
    }

    const normalizedPhone = phone.startsWith("+91")
      ? phone
      : `+91${phone}`;

    if (!/^\+91[6-9]\d{9}$/.test(normalizedPhone)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid Indian phone number",
        },
        { status: 400 }
      );
    }

    if (!/^\d{6}$/.test(pincode)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid pincode",
        },
        { status: 400 }
      );
    }

    // If new address is default,
    // remove default from existing addresses
    if (isDefault) {
      await prisma.address.updateMany({
        where: {
          userId: session.user.id,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    }

    const address = await prisma.address.create({
      data: {
        userId: session.user.id,
        type: type || "HOME",
        label: label?.trim() || null,
        fullName: fullName.trim(),
        phone: normalizedPhone,
        addressLine: addressLine.trim(),
        landmark: landmark?.trim() || null,
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        isDefault: Boolean(isDefault),
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Address added successfully",
        data: address,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("CREATE ADDRESS ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create address",
      },
      { status: 500 }
    );
  }
}