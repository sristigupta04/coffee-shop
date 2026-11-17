
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getcurrentuser } from "@/app/lib/auth";
import { LeaveRequestStatus, Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const allowedReviewStatuses: LeaveRequestStatus[] = [
  LeaveRequestStatus.APPROVED,
  LeaveRequestStatus.REJECTED,
];

function formatLeave(leave: any) {
  return {
    ...leave,
    adminRemarks: leave.reviewNote,
    reviewer: leave.reviewedBy,
  };
}

export async function GET(
  _req: NextRequest,
  context: RouteContext
) {
  try {
    const user = await getcurrentuser();

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    const leave = await prisma.staffLeaveRequest.findUnique({
      where: { id },
      include: {
        staff: {
          include: {
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
    });

    if (!leave) {
      return NextResponse.json(
        { success: false, message: "Leave request not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      leave: formatLeave(leave),
    });
  } catch (error) {
    console.error("GET STAFF LEAVE DETAILS ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch leave details." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const user = await getcurrentuser();

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    const body = await req.json();

    const status = body.status as LeaveRequestStatus;
    const adminRemarks =
      typeof body.adminRemarks === "string"
        ? body.adminRemarks.trim()
        : "";

    if (!allowedReviewStatuses.includes(status)) {
      return NextResponse.json(
        {
          success: false,
          message: "Only APPROVED or REJECTED status is allowed.",
        },
        { status: 400 }
      );
    }

    if (status === LeaveRequestStatus.REJECTED && !adminRemarks) {
      return NextResponse.json(
        {
          success: false,
          message: "Remarks are required when rejecting a leave request.",
        },
        { status: 400 }
      );
    }

    const existingLeave = await prisma.staffLeaveRequest.findUnique({
      where: { id },
      select: {
        id: true,
        staffId: true,
        startDate: true,
        endDate: true,
        status: true,
      },
    });

    if (!existingLeave) {
      return NextResponse.json(
        { success: false, message: "Leave request not found." },
        { status: 404 }
      );
    }

    if (existingLeave.status !== LeaveRequestStatus.PENDING) {
      return NextResponse.json(
        {
          success: false,
          message: "This leave request has already been reviewed.",
        },
        { status: 409 }
      );
    }

    if (status === LeaveRequestStatus.APPROVED) {
      const overlappingLeave = await prisma.staffLeaveRequest.findFirst({
        where: {
          staffId: existingLeave.staffId,
          id: { not: id },
          status: LeaveRequestStatus.APPROVED,
          startDate: { lte: existingLeave.endDate },
          endDate: { gte: existingLeave.startDate },
        },
        select: { id: true },
      });

      if (overlappingLeave) {
        return NextResponse.json(
          {
            success: false,
            message:
              "This staff member already has an approved leave during the selected dates.",
          },
          { status: 409 }
        );
      }
    }

    // reviewedBy is a Staff relation in the Prisma schema,
    // so resolve the admin's Staff record instead of assigning a User ID.
    const reviewer = user.email
      ? await prisma.staff.findFirst({
          where: {
            email: user.email,
          },
          select: {
            id: true,
          },
        })
      : null;

    const updatedLeave = await prisma.staffLeaveRequest.update({
      where: { id },
      data: {
        status,
        reviewNote: adminRemarks || null,
        reviewedAt: new Date(),
        reviewedById: reviewer?.id ?? null,
      },
      include: {
        staff: {
          include: {
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
    });

    return NextResponse.json({
      success: true,
      message:
        status === LeaveRequestStatus.APPROVED
          ? "Leave request approved successfully."
          : "Leave request rejected successfully.",
      leave: formatLeave(updatedLeave),
    });
  } catch (error) {
    console.error("UPDATE STAFF LEAVE ERROR:", error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { success: false, message: "Leave request not found." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to update leave request." },
      { status: 500 }
    );
  }
}
