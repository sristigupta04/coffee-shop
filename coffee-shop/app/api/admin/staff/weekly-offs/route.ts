
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getcurrentuser } from "@/app/lib/auth";

const isValidDay = (value: unknown): value is number =>
  Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 6;

export async function GET() {
  try {
    const user = await getcurrentuser();

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { message: "Unauthorized access." },
        { status: 401 }
      );
    }

    const weeklyOffs = await prisma.staffWeeklyOff.findMany({
      include: {
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ dayOfWeek: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ weeklyOffs }, { status: 200 });
  } catch (error) {
    console.error("GET WEEKLY OFFS ERROR:", error);

    return NextResponse.json(
      { message: "Unable to fetch weekly off rules." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getcurrentuser();

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { message: "Unauthorized access." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const { dayOfWeek, staffId, branchId, isActive } = body;

    if (!isValidDay(dayOfWeek)) {
      return NextResponse.json(
        { message: "Day of week must be between 0 and 6." },
        { status: 400 }
      );
    }

    if (
      staffId !== undefined &&
      staffId !== null &&
      typeof staffId !== "string"
    ) {
      return NextResponse.json(
        { message: "Invalid staff selection." },
        { status: 400 }
      );
    }

    if (
      branchId !== undefined &&
      branchId !== null &&
      typeof branchId !== "string"
    ) {
      return NextResponse.json(
        { message: "Invalid branch selection." },
        { status: 400 }
      );
    }

    const normalizedStaffId = staffId || null;
    const normalizedBranchId = branchId || null;

    if (normalizedStaffId && normalizedBranchId) {
      return NextResponse.json(
        { message: "Select either a staff member or a branch, not both." },
        { status: 400 }
      );
    }

    if (isActive !== undefined && typeof isActive !== "boolean") {
      return NextResponse.json(
        { message: "Invalid active status." },
        { status: 400 }
      );
    }

    if (normalizedStaffId) {
      const staffMember = await prisma.staff.findUnique({
        where: { id: normalizedStaffId },
        select: { id: true },
      });

      if (!staffMember) {
        return NextResponse.json(
          { message: "Selected staff member was not found." },
          { status: 404 }
        );
      }
    }

    if (normalizedBranchId) {
      const branch = await prisma.branch.findUnique({
        where: { id: normalizedBranchId },
        select: { id: true },
      });

      if (!branch) {
        return NextResponse.json(
          { message: "Selected branch was not found." },
          { status: 404 }
        );
      }
    }

    const weeklyOff = await prisma.staffWeeklyOff.create({
      data: {
        dayOfWeek,
        staffId: normalizedStaffId,
        branchId: normalizedBranchId,
        isActive: isActive ?? true,
      },
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
        message: "Weekly off created successfully.",
        weeklyOff,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("CREATE WEEKLY OFF ERROR:", error);

    return NextResponse.json(
      { message: "Unable to create weekly off rule." },
      { status: 500 }
    );
  }
}
