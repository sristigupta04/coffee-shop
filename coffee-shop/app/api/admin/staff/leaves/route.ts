
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getcurrentuser } from "@/app/lib/auth";
import { LeaveRequestStatus, LeaveType, Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const leaveStatuses = Object.values(LeaveRequestStatus);
const leaveTypes = Object.values(LeaveType);

function istDateStart(value: string) {
  return new Date(`${value}T00:00:00+05:30`);
}

function istDateEndExclusive(value: string) {
  const date = istDateStart(value);
  date.setDate(date.getDate() + 1);
  return date;
}

function isValidDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(istDateStart(value).getTime());
}

export async function GET(req: NextRequest) {
  try {
    const user = await getcurrentuser();

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const params = req.nextUrl.searchParams;

    const status = params.get("status");
    const leaveType = params.get("leaveType");
    const startDate = params.get("startDate");
    const endDate = params.get("endDate");

    if (status && !leaveStatuses.includes(status as LeaveRequestStatus)) {
      return NextResponse.json(
        { success: false, message: "Invalid leave status" },
        { status: 400 }
      );
    }

    if (leaveType && !leaveTypes.includes(leaveType as LeaveType)) {
      return NextResponse.json(
        { success: false, message: "Invalid leave type" },
        { status: 400 }
      );
    }

    if (
      (startDate && !isValidDate(startDate)) ||
      (endDate && !isValidDate(endDate))
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid date format. Use YYYY-MM-DD." },
        { status: 400 }
      );
    }

    if (startDate && endDate && startDate > endDate) {
      return NextResponse.json(
        { success: false, message: "Start date cannot be after end date." },
        { status: 400 }
      );
    }

    const where: Prisma.StaffLeaveRequestWhereInput = {};

    if (status) {
      where.status = status as LeaveRequestStatus;
    }

    if (leaveType) {
      where.leaveType = leaveType as LeaveType;
    }

    // Include every leave that overlaps the requested date range.
    if (startDate) {
      where.endDate = {
        gte: istDateStart(startDate),
      };
    }

    if (endDate) {
      where.startDate = {
        lt: istDateEndExclusive(endDate),
      };
    }

    const leaves = await prisma.staffLeaveRequest.findMany({
      where,
      include: {
        staff: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            designation: true,
            department: true,
            joiningDate: true,
            branch: {
              select: {
                name: true,
              },
            },
          },
        },
        reviewedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [
        { startDate: "desc" },
        { createdAt: "desc" },
      ],
    });

    const formattedLeaves = leaves.map((leave) => ({
      ...leave,
      adminRemarks: leave.reviewNote,
      reviewer: leave.reviewedBy,
    }));

    return NextResponse.json({
      success: true,
      leaves: formattedLeaves,
      total: formattedLeaves.length,
    });
  } catch (error) {
    console.error("GET STAFF LEAVES ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch leave requests." },
      { status: 500 }
    );
  }
}
