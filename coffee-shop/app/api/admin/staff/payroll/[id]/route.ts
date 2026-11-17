
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getcurrentuser } from "@/app/lib/auth";
import { PayrollStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _req: NextRequest,
  { params }: RouteContext
) {
  try {
    const user = await getcurrentuser();

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const payroll = await prisma.staffPayroll.findUnique({
      where: { id },
      include: {
        staff: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            designation: true,
            department: true,
            branch: {
              select: { name: true },
            },
          },
        },
        items: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!payroll) {
      return NextResponse.json(
        { success: false, message: "Payroll record not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, payroll });
  } catch (error) {
    console.error("Payroll details GET error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch payroll details" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: RouteContext
) {
  try {
    const user = await getcurrentuser();

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const status = body.status as PayrollStatus;

    const allowedStatuses = Object.values(PayrollStatus);

    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, message: "Invalid payroll status" },
        { status: 400 }
      );
    }

    const payroll = await prisma.staffPayroll.findUnique({
      where: { id },
    });

    if (!payroll) {
      return NextResponse.json(
        { success: false, message: "Payroll record not found" },
        { status: 404 }
      );
    }

    const allowedTransitions: Record<string, string[]> = {
      DRAFT: ["PROCESSING", "CANCELLED"],
      PROCESSING: ["APPROVED", "CANCELLED"],
      APPROVED: ["PAID"],
      PARTIALLY_PAID: [],
      PAID: [],
      CANCELLED: [],
    };

    if (!allowedTransitions[payroll.status]?.includes(status)) {
      return NextResponse.json(
        {
          success: false,
          message: `Cannot change payroll from ${payroll.status} to ${status}`,
        },
        { status: 400 }
      );
    }

    if (status === "PAID" && payroll.paidAmount < payroll.netSalary) {
      return NextResponse.json(
        {
          success: false,
          message: "Outstanding payroll amount must be zero before marking as paid",
        },
        { status: 400 }
      );
    }

    const updated = await prisma.staffPayroll.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({
      success: true,
      message: "Payroll status updated successfully",
      payroll: updated,
    });
  } catch (error) {
    console.error("Payroll details PATCH error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to update payroll status" },
      { status: 500 }
    );
  }
}
