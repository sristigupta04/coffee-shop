
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/app/lib/prisma";
import { getcurrentuser } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

function getISTDateBoundary(value: string, nextDay = false) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  // Reject invalid dates such as 2026-02-30.
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  if (nextDay) {
    date.setUTCDate(date.getUTCDate() + 1);
  }

  const nextYear = date.getUTCFullYear();
  const nextMonth = String(date.getUTCMonth() + 1).padStart(2, "0");
  const nextDate = String(date.getUTCDate()).padStart(2, "0");

  // IST is UTC+05:30.
  return new Date(
    `${nextYear}-${nextMonth}-${nextDate}T00:00:00.000+05:30`
  );
}

export async function GET(req: NextRequest) {
  try {
    const user = await getcurrentuser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    if (user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    const params = req.nextUrl.searchParams;

    const startDate = params.get("startDate");
    const endDate = params.get("endDate");
    const action = params.get("action");
    const entity = params.get("entity");

    const where: Prisma.StaffAuditLogWhereInput = {};

    if (startDate || endDate) {
      const createdAt: Prisma.DateTimeFilter = {};

      if (startDate) {
        const start = getISTDateBoundary(startDate);

        if (!start) {
          return NextResponse.json(
            { success: false, message: "Invalid start date" },
            { status: 400 }
          );
        }

        createdAt.gte = start;
      }

      if (endDate) {
        const end = getISTDateBoundary(endDate, true);

        if (!end) {
          return NextResponse.json(
            { success: false, message: "Invalid end date" },
            { status: 400 }
          );
        }

        createdAt.lt = end;
      }

      if (
        startDate &&
        endDate &&
        startDate > endDate
      ) {
        return NextResponse.json(
          { success: false, message: "Start date cannot be after end date" },
          { status: 400 }
        );
      }

      where.createdAt = createdAt;
    }

    if (action && action !== "ALL") {
      where.action = action;
    }

    if (entity && entity !== "ALL") {
      where.entity = entity;
    }

    const logs = await prisma.staffAuditLog.findMany({
      where,
      include: {
        staff: {
          select: {
            id: true,
            name: true,
            email: true,
            designation: true,
            department: true,
          },
        },
        actorUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        actorStaff: {
          select: {
            id: true,
            name: true,
            email: true,
            designation: true,
            department: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      logs,
      total: logs.length,
    });
  } catch (error) {
    console.error("GET STAFF AUDIT LOGS ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch audit logs",
      },
      { status: 500 }
    );
  }
}
