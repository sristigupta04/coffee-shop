
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getcurrentuser } from "@/app/lib/auth";

type RouteContext = {
  params: Promise<{ groupId: string }>;
};

// GET: Fetch all options of a customization group
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

    const { groupId } = await params;

    const group = await prisma.productCustomizationGroup.findUnique({
      where: { id: groupId },
      select: {
        id: true,
        name: true,
        selectionType: true,
        isRequired: true,
        minSelections: true,
        maxSelections: true,
      },
    });

    if (!group) {
      return NextResponse.json(
        { success: false, message: "Customization group not found" },
        { status: 404 }
      );
    }

    const options = await prisma.productCustomizationOption.findMany({
      where: { groupId },
      orderBy: [
        { sortOrder: "asc" },
        { createdAt: "asc" },
      ],
    });

    return NextResponse.json({
      success: true,
      message: "Customization options fetched successfully",
      data: {
        group,
        options,
        total: options.length,
      },
    });
  } catch (error) {
    console.error("Fetch customization options error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch customization options",
      },
      { status: 500 }
    );
  }
}

// POST: Create a new customization option
export async function POST(
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

    const { groupId } = await params;
    const body = await request.json();

    const {
      name,
      priceAdjustment = 0,
      isAvailable = true,
      sortOrder,
    } = body;

    if (
      typeof name !== "string" ||
      !name.trim()
    ) {
      return NextResponse.json(
        { success: false, message: "Option name is required" },
        { status: 400 }
      );
    }

    const price = Number(priceAdjustment);

    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Price adjustment must be a valid non-negative number",
        },
        { status: 400 }
      );
    }

    if (typeof isAvailable !== "boolean") {
      return NextResponse.json(
        { success: false, message: "Invalid availability status" },
        { status: 400 }
      );
    }

    if (
      sortOrder !== undefined &&
      (!Number.isInteger(sortOrder) || sortOrder < 0)
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid sort order" },
        { status: 400 }
      );
    }

    const group = await prisma.productCustomizationGroup.findUnique({
      where: { id: groupId },
      select: {
        id: true,
        name: true,
        isActive: true,
      },
    });

    if (!group) {
      return NextResponse.json(
        { success: false, message: "Customization group not found" },
        { status: 404 }
      );
    }

    const option = await prisma.productCustomizationOption.create({
      data: {
        groupId,
        name: name.trim(),
        priceAdjustment: price,
        isAvailable,
        sortOrder: sortOrder ?? 0,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Customization option created successfully",
        data: {
          group: {
            id: group.id,
            name: group.name,
          },
          option,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create customization option error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create customization option",
      },
      { status: 500 }
    );
  }
}
