
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

    const product = await prisma.product.findUnique({
      where: { id },
      select: { id: true, name: true },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, message: "Product not found" },
        { status: 404 }
      );
    }

    const groups = await prisma.productCustomizationGroup.findMany({
      where: { productId: id },
      include: {
        options: {
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({
      success: true,
      message: "Customization groups fetched successfully",
      data: {
        product,
        groups,
      },
    });
  } catch (error) {
    console.error("Fetch customization groups error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch customization groups",
      },
      { status: 500 }
    );
  }
}

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

    const { id } = await params;
    const body = await request.json();

    const {
      name,
      description,
      selectionType = "SINGLE",
      isRequired = false,
      minSelections = 0,
      maxSelections = 1,
      isActive = true,
      sortOrder = 0,
      options = [],
    } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { success: false, message: "Group name is required" },
        { status: 400 }
      );
    }

    if (!["SINGLE", "MULTIPLE"].includes(selectionType)) {
      return NextResponse.json(
        { success: false, message: "Invalid selection type" },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(minSelections) ||
      !Number.isInteger(maxSelections) ||
      minSelections < 0 ||
      maxSelections < 1 ||
      minSelections > maxSelections
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid selection limits" },
        { status: 400 }
      );
    }

    if (selectionType === "SINGLE" && maxSelections !== 1) {
      return NextResponse.json(
        {
          success: false,
          message: "SINGLE selection groups must have maxSelections = 1",
        },
        { status: 400 }
      );
    }

    if (isRequired && minSelections < 1) {
      return NextResponse.json(
        {
          success: false,
          message: "Required groups must have at least one minimum selection",
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(options)) {
      return NextResponse.json(
        { success: false, message: "Options must be an array" },
        { status: 400 }
      );
    }

    if (options.length > 0 && options.length < minSelections) {
      return NextResponse.json(
        {
          success: false,
          message: "Not enough options for the minimum selection limit",
        },
        { status: 400 }
      );
    }

    if (options.length > 0 && options.length < maxSelections) {
      return NextResponse.json(
        {
          success: false,
          message: "Maximum selections cannot exceed available options",
        },
        { status: 400 }
      );
    }

    const invalidOption = options.find(
      (option: any) =>
        !option.name ||
        typeof option.name !== "string" ||
        !option.name.trim() ||
        !Number.isFinite(Number(option.priceAdjustment ?? 0)) ||
        Number(option.priceAdjustment ?? 0) < 0
    );

    if (invalidOption) {
      return NextResponse.json(
        {
          success: false,
          message: "Each option needs a valid name and non-negative price",
        },
        { status: 400 }
      );
    }

    const product = await prisma.product.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, message: "Product not found" },
        { status: 404 }
      );
    }

    const group = await prisma.productCustomizationGroup.create({
      data: {
        productId: id,
        name: name.trim(),
        description:
          typeof description === "string" && description.trim()
            ? description.trim()
            : null,
        selectionType,
        isRequired,
        minSelections,
        maxSelections,
        isActive: Boolean(isActive),
        sortOrder: Number.isInteger(sortOrder) ? sortOrder : 0,

        options: {
          create: options.map((option: any, index: number) => ({
            name: option.name.trim(),
            priceAdjustment: Number(option.priceAdjustment ?? 0),
            isAvailable: option.isAvailable !== false,
            sortOrder: Number.isInteger(option.sortOrder)
              ? option.sortOrder
              : index,
          })),
        },
      },
      include: {
        options: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Customization group created successfully",
        data: group,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create customization group error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create customization group",
      },
      { status: 500 }
    );
  }
}
