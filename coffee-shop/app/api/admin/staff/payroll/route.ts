
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getcurrentuser } from "@/app/lib/auth";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const PAYROLL_STATUSES = [
  "DRAFT",
  "PROCESSING",
  "APPROVED",
  "PAID",
  "PARTIALLY_PAID",
  "CANCELLED",
] as const;

export async function GET(req: NextRequest) {
  try {
    const user = await getcurrentuser();

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );
    }

    const params = req.nextUrl.searchParams;
    const status = params.get("status");
    const startDate = params.get("startDate");
    const endDate = params.get("endDate");
    const search = params.get("search")?.trim();

    if (
      status &&
      !PAYROLL_STATUSES.includes(
        status as (typeof PAYROLL_STATUSES)[number]
      )
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid payroll status" },
        { status: 400 }
      );
    }

    if (
      (startDate && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) ||
      (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate))
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid date format" },
        { status: 400 }
      );
    }

    const start = startDate ? new Date(`${startDate}T00:00:00.000Z`) : null;
    const end = endDate ? new Date(`${endDate}T23:59:59.999Z`) : null;

    if (start && end && start > end) {
      return NextResponse.json(
        { success: false, message: "Start date cannot be after end date" },
        { status: 400 }
      );
    }

    const where: Prisma.StaffPayrollWhereInput = {};

    if (status) {
      where.status = status as (typeof PAYROLL_STATUSES)[number];
    }

    // Find payroll periods that overlap the selected date range.
    if (start || end) {
      where.AND = [
        ...(start ? [{ periodEnd: { gte: start } }] : []),
        ...(end ? [{ periodStart: { lte: end } }] : []),
      ];
    }

    if (search) {
      where.OR = [
        { payrollNumber: { contains: search, mode: "insensitive" } },
        {
          staff: {
            is: {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
                { department: { contains: search, mode: "insensitive" } },
                {
                  branch: {
                    is: {
                      name: { contains: search, mode: "insensitive" },
                    },
                  },
                },
              ],
            },
          },
        },
      ];
    }

    const payrolls = await prisma.staffPayroll.findMany({
      where,
      include: {
        staff: {
          select: {
            id: true,
            name: true,
            email: true,
            designation: true,
            department: true,
            branch: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: [{ periodStart: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({
      success: true,
      payrolls,
      total: payrolls.length,
    });
  } catch (error) {
    console.error("Admin payroll GET error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch payroll records" },
      { status: 500 }
    );
  }
}
