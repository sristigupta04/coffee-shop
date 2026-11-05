import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getcurrentuser } from "@/app/lib/auth";

type RouteContext = {
  params: Promise<{ groupId: string }>;
};

async function checkAdmin() {
  const user = await getcurrentuser();
  return Boolean(user?.id && user.role === "ADMIN");
}

// PUT: Update customization group
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

    const { groupId } = await params;
    const body = await request.json();

    const existingGroup =
      await prisma.productCustomizationGroup.findUnique({
        where: { id: groupId },
        include: {
          _count: { select: { options: true } },
        },
      });

    if (!existingGroup) {
      return NextResponse.json(
        { success: false, message: "Customization group not found" },
        { status: 404 }
      );
    }

    const data: {
      name?: string;
      description?: string | null;
      selectionType?: "SINGLE" | "MULTIPLE";
      isRequired?: boolean;
      minSelections?: number;
      maxSelections?: number;
      isActive?: boolean;
      sortOrder?: number;
    } = {};

    if (body.name !== undefined) {
      if (typeof body.name !== "string" || !body.name.trim()) {
        return NextResponse.json(
          { success: false, message: "Valid group name is required" },
          { status: 400 }
        );
      }
      data.name = body.name.trim();
    }

    if (body.description !== undefined) {
      if (
        body.description !== null &&
        typeof body.description !== "string"
      ) {
        return NextResponse.json(
          { success: false, message: "Invalid description" },
          { status: 400 }
        );
      }
      data.description =
        typeof body.description === "string" && body.description.trim()
          ? body.description.trim()
          : null;
    }

    if (body.selectionType !== undefined) {
      if (!["SINGLE", "MULTIPLE"].includes(body.selectionType)) {
        return NextResponse.json(
          { success: false, message: "Invalid selection type" },
          { status: 400 }
        );
      }
      data.selectionType = body.selectionType;
    }

    if (body.isRequired !== undefined) {
      if (typeof body.isRequired !== "boolean") {
        return NextResponse.json(
          { success: false, message: "Invalid required status" },
          { status: 400 }
        );
      }
      data.isRequired = body.isRequired;
    }

    if (body.isActive !== undefined) {
      if (typeof body.isActive !== "boolean") {
        return NextResponse.json(
          { success: false, message: "Invalid active status" },
          { status: 400 }
        );
      }
      data.isActive = body.isActive;
    }

    if (body.minSelections !== undefined) {
      if (
        !Number.isInteger(body.minSelections) ||
        body.minSelections < 0
      ) {
        return NextResponse.json(
          { success: false, message: "Invalid minimum selections" },
          { status: 400 }
        );
      }
      data.minSelections = body.minSelections;
    }

    if (body.maxSelections !== undefined) {
      if (
        !Number.isInteger(body.maxSelections) ||
        body.maxSelections < 1
      ) {
        return NextResponse.json(
          { success: false, message: "Invalid maximum selections" },
          { status: 400 }
        );
      }
      data.maxSelections = body.maxSelections;
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

    const selectionType =
      data.selectionType ?? existingGroup.selectionType;
    const isRequired = data.isRequired ?? existingGroup.isRequired;
    const minSelections =
      data.minSelections ?? existingGroup.minSelections;
    const maxSelections =
      data.maxSelections ?? existingGroup.maxSelections;

    if (minSelections > maxSelections) {
      return NextResponse.json(
        { success: false, message: "Minimum cannot exceed maximum" },
        { status: 400 }
      );
    }

    if (selectionType === "SINGLE" && maxSelections !== 1) {
      return NextResponse.json(
        { success: false, message: "SINGLE groups must have maxSelections = 1" },
        { status: 400 }
      );
    }

    if (isRequired && minSelections < 1) {
      return NextResponse.json(
        { success: false, message: "Required groups need at least one minimum selection" },
        { status: 400 }
      );
    }

    if (maxSelections > existingGroup._count.options) {
      return NextResponse.json(
        { success: false, message: "Maximum selections cannot exceed the number of options" },
        { status: 400 }
      );
    }

    const updatedGroup =
      await prisma.productCustomizationGroup.update({
        where: { id: groupId },
        data,
        include: {
          options: {
            orderBy: { sortOrder: "asc" },
          },
        },
      });

    return NextResponse.json({
      success: true,
      message: "Customization group updated successfully",
      data: updatedGroup,
    });
  } catch (error) {
    console.error("Update customization group error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to update customization group" },
      { status: 500 }
    );
  }
}

// DELETE: Delete customization group and its options
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

    const { groupId } = await params;

    const group = await prisma.productCustomizationGroup.findUnique({
      where: { id: groupId },
      select: { id: true, name: true },
    });

    if (!group) {
      return NextResponse.json(
        { success: false, message: "Customization group not found" },
        { status: 404 }
      );
    }

    await prisma.$transaction([
      prisma.productCustomizationOption.deleteMany({
        where: { groupId },
      }),
      prisma.productCustomizationGroup.delete({
        where: { id: groupId },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Customization group deleted successfully",
      data: { id: group.id, name: group.name },
    });
  } catch (error) {
    console.error("Delete customization group error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to delete customization group" },
      { status: 500 }
    );
  }
}
