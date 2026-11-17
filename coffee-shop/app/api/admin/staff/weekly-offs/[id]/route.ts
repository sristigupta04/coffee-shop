
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getcurrentuser } from "@/app/lib/auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const isValidDay = (value: unknown): value is number =>
  Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 6;

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await getcurrentuser();

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { message: "Unauthorized access." },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const body = await request.json();

    const existingRule = await prisma.staffWeeklyOff.findUnique({
      where: { id },
    });

    if (!existingRule) {
      return NextResponse.json(
        { message: "Weekly off rule not found." },
        { status: 404 }
      );
    }

    const data: {
      dayOfWeek?: number;
      staffId?: string | null;
      branchId?: string | null;
      isActive?: boolean;
    } = {};

    if (body.dayOfWeek !== undefined) {
      if (!isValidDay(body.dayOfWeek)) {
        return NextResponse.json(
          { message: "Day of week must be between 0 and 6." },
          { status: 400 }
        );
      }

      data.dayOfWeek = body.dayOfWeek;
    }

    if (body.isActive !== undefined) {
      if (typeof body.isActive !== "boolean") {
        return NextResponse.json(
          { message: "Invalid active status." },
          { status: 400 }
        );
      }

      data.isActive = body.isActive;
    }

    const hasStaffId = Object.prototype.hasOwnProperty.call(
      body,
      "staffId"
    );
    const hasBranchId = Object.prototype.hasOwnProperty.call(
      body,
      "branchId"
    );

    if (hasStaffId || hasBranchId) {
      const nextStaffId = hasStaffId
        ? body.staffId || null
        : existingRule.staffId;

      const nextBranchId = hasBranchId
        ? body.branchId || null
        : existingRule.branchId;

      if (
        nextStaffId !== null &&
        typeof nextStaffId !== "string"
      ) {
        return NextResponse.json(
          { message: "Invalid staff selection." },
          { status: 400 }
        );
      }

      if (
        nextBranchId !== null &&
        typeof nextBranchId !== "string"
      ) {
        return NextResponse.json(
          { message: "Invalid branch selection." },
          { status: 400 }
        );
      }

      if (nextStaffId && nextBranchId) {
        return NextResponse.json(
          { message: "Select either a staff member or a branch, not both." },
          { status: 400 }
        );
      }

      if (nextStaffId) {
        const staffMember = await prisma.staff.findUnique({
          where: { id: nextStaffId },
          select: { id: true },
        });

        if (!staffMember) {
          return NextResponse.json(
            { message: "Selected staff member was not found." },
            { status: 404 }
          );
        }
      }

      if (nextBranchId) {
        const branch = await prisma.branch.findUnique({
          where: { id: nextBranchId },
          select: { id: true },
        });

        if (!branch) {
          return NextResponse.json(
            { message: "Selected branch was not found." },
            { status: 404 }
          );
        }
      }

      data.staffId = nextStaffId;
      data.branchId = nextBranchId;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { message: "No valid fields provided for update." },
        { status: 400 }
      );
    }

    const weeklyOff = await prisma.staffWeeklyOff.update({
      where: { id },
      data,
      include: {
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        message: "Weekly off updated successfully.",
        weeklyOff,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("UPDATE WEEKLY OFF ERROR:", error);

    return NextResponse.json(
      { message: "Unable to update weekly off rule." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await getcurrentuser();

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { message: "Unauthorized access." },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    const existingRule = await prisma.staffWeeklyOff.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existingRule) {
      return NextResponse.json(
        { message: "Weekly off rule not found." },
        { status: 404 }
      );
    }

    await prisma.staffWeeklyOff.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: "Weekly off rule deleted successfully." },
      { status: 200 }
    );
  } catch (error) {
    console.error("DELETE WEEKLY OFF ERROR:", error);

    return NextResponse.json(
      { message: "Unable to delete weekly off rule." },
      { status: 500 }
    );
  }
}
