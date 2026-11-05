
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getcurrentuser } from "@/app/lib/auth";

type RouteContext = {
  params: Promise<{ optionId: string }>;
};

async function checkAdmin() {
  const auth = await getcurrentuser();

  if (!auth?.id || auth.role !== "ADMIN") {
    return false;
  }

  return true;
}

// GET: Fetch single customization option
export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    if (!(await checkAdmin())) {
      return NextResponse.json(
        { success: false, message: "Unauthorized access" },
        { status: 401 }
      );
    }

    const { optionId } = await params;

    const option = await prisma.productCustomizationOption.findUnique({
      where: { id: optionId },
      include: {
        group: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
              },
            },
          },
        },
      },
    });

    if (!option) {
      return NextResponse.json(
        { success: false, message: "Customization option not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Customization option fetched successfully",
      data: option,
    });
  } catch (error) {
    console.error("Get customization option error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch customization option",
      },
      { status: 500 }
    );
  }
}

// PUT: Update customization option
export async function PUT(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    if (!(await checkAdmin())) {
      return NextResponse.json(
        { success: false, message: "Unauthorized access" },
        { status: 401 }
      );
    }

    const { optionId } = await params;
    const body = await request.json();

    const existingOption =
      await prisma.productCustomizationOption.findUnique({
        where: { id: optionId },
        include: {
          group: {
            select: {
              id: true,
              minSelections: true,
            },
          },
        },
      });

    if (!existingOption) {
      return NextResponse.json(
        { success: false, message: "Customization option not found" },
        { status: 404 }
      );
    }

    const data: {
      name?: string;
      priceAdjustment?: number;
      isAvailable?: boolean;
      sortOrder?: number;
    } = {};

    if (body.name !== undefined) {
      if (typeof body.name !== "string" || !body.name.trim()) {
        return NextResponse.json(
          { success: false, message: "Valid option name is required" },
          { status: 400 }
        );
      }

      data.name = body.name.trim();
    }

    if (body.priceAdjustment !== undefined) {
      const price = Number(body.priceAdjustment);

      if (!Number.isFinite(price) || price < 0) {
        return NextResponse.json(
          {
            success: false,
            message: "Price adjustment must be non-negative",
          },
          { status: 400 }
        );
      }

      data.priceAdjustment = price;
    }

    if (body.isAvailable !== undefined) {
      if (typeof body.isAvailable !== "boolean") {
        return NextResponse.json(
          { success: false, message: "Invalid availability status" },
          { status: 400 }
        );
      }

      data.isAvailable = body.isAvailable;
    }

    if (body.sortOrder !== undefined) {
      if (!Number.isInteger(body.sortOrder) || body.sortOrder < 0) {
        return NextResponse.json(
          { success: false, message: "Invalid sort order" },
          { status: 400 }
        );
      }

      data.sortOrder = body.sortOrder;
    }

    // Prevent disabling an option if it violates the group's minimum.
    if (
      data.isAvailable === false &&
      existingOption.isAvailable
    ) {
      const availableCount =
        await prisma.productCustomizationOption.count({
          where: {
            groupId: existingOption.groupId,
            isAvailable: true,
            id: { not: optionId },
          },
        });

      if (availableCount < existingOption.group.minSelections) {
        return NextResponse.json(
          {
            success: false,
            message: "Cannot disable this option. It would violate the group's minimum selection requirement.",
          },
          { status: 400 }
        );
      }
    }

    const updatedOption =
      await prisma.productCustomizationOption.update({
        where: { id: optionId },
        data,
      });

    return NextResponse.json({
      success: true,
      message: "Customization option updated successfully",
      data: updatedOption,
    });
  } catch (error) {
    console.error("Update customization option error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update customization option",
      },
      { status: 500 }
    );
  }
}

// PATCH: Toggle option availability
export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    if (!(await checkAdmin())) {
      return NextResponse.json(
        { success: false, message: "Unauthorized access" },
        { status: 401 }
      );
    }

    const { optionId } = await params;
    const body = await request.json();

    if (typeof body.isAvailable !== "boolean") {
      return NextResponse.json(
        {
          success: false,
          message: "isAvailable must be true or false",
        },
        { status: 400 }
      );
    }

    const option = await prisma.productCustomizationOption.findUnique({
      where: { id: optionId },
      include: {
        group: {
          select: {
            id: true,
            minSelections: true,
          },
        },
      },
    });

    if (!option) {
      return NextResponse.json(
        { success: false, message: "Customization option not found" },
        { status: 404 }
      );
    }

    if (option.isAvailable === body.isAvailable) {
      return NextResponse.json({
        success: true,
        message: "Availability is already set to this value",
        data: option,
      });
    }

    if (body.isAvailable === false) {
      const availableCount =
        await prisma.productCustomizationOption.count({
          where: {
            groupId: option.groupId,
            isAvailable: true,
            id: { not: optionId },
          },
        });

      if (availableCount < option.group.minSelections) {
        return NextResponse.json(
          {
            success: false,
            message: "Cannot disable this option because the group's minimum selection requirement would not be met.",
          },
          { status: 400 }
        );
      }
    }

    const updatedOption =
      await prisma.productCustomizationOption.update({
        where: { id: optionId },
        data: {
          isAvailable: body.isAvailable,
        },
      });

    return NextResponse.json({
      success: true,
      message: body.isAvailable
        ? "Option activated successfully"
        : "Option deactivated successfully",
      data: updatedOption,
    });
  } catch (error) {
    console.error("Toggle customization option error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update option availability",
      },
      { status: 500 }
    );
  }
}

// DELETE: Delete customization option
export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    if (!(await checkAdmin())) {
      return NextResponse.json(
        { success: false, message: "Unauthorized access" },
        { status: 401 }
      );
    }

    const { optionId } = await params;

    const option = await prisma.productCustomizationOption.findUnique({
      where: { id: optionId },
      include: {
        group: {
          select: {
            id: true,
            minSelections: true,
          },
        },
      },
    });

    if (!option) {
      return NextResponse.json(
        { success: false, message: "Customization option not found" },
        { status: 404 }
      );
    }

    if (option.isAvailable) {
      const availableCount =
        await prisma.productCustomizationOption.count({
          where: {
            groupId: option.groupId,
            isAvailable: true,
            id: { not: optionId },
          },
        });

      if (availableCount < option.group.minSelections) {
        return NextResponse.json(
          {
            success: false,
            message: "Cannot delete this option. It would violate the group's minimum selection requirement.",
          },
          { status: 400 }
        );
      }
    }

    await prisma.productCustomizationOption.delete({
      where: { id: optionId },
    });

    return NextResponse.json({
      success: true,
      message: "Customization option deleted successfully",
      data: {
        id: option.id,
        name: option.name,
      },
    });
  } catch (error) {
    console.error("Delete customization option error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete customization option",
      },
      { status: 500 }
    );
  }
}
