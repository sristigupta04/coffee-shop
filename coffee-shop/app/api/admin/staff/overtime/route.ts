
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getcurrentuser } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

function getIndiaDayStart(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day) - 330 * 60 * 1000);
}

function getIndiaDateString(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getTodayIndia() {
  return getIndiaDateString(new Date());
}

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
    const today = getTodayIndia();

    const from = params.get("from") || today.slice(0, 7) + "-01";
    const to = params.get("to") || today;
    const search = params.get("search")?.trim() || "";

    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      return NextResponse.json(
        { success: false, message: "Invalid date range" },
        { status: 400 }
      );
    }

    const startDate = getIndiaDayStart(from);
    const endDate = getIndiaDayStart(to);

    if (startDate > endDate) {
      return NextResponse.json(
        { success: false, message: "From date cannot be after to date" },
        { status: 400 }
      );
    }

    const where: any = {
      date: {
        gte: startDate,
        lt: new Date(endDate.getTime() + 24 * 60 * 60 * 1000),
      },
    };

    if (search) {
      where.staff = {
        is: {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
            { designation: { contains: search, mode: "insensitive" } },
          ],
        },
      };
    }

    const records = await prisma.staffAttendance.findMany({
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
          },
        },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });

    const summary = {
      totalRecords: records.length,
      totalOvertimeMinutes: records.reduce(
        (sum, record) => sum + (record.overtimeMinutes || 0),
        0
      ),
      overtimeRecords: records.filter(
        (record) => (record.overtimeMinutes || 0) > 0
      ).length,
      totalStaff: new Set(records.map((record) => record.staffId)).size,
    };

    return NextResponse.json({
      success: true,
      records,
      summary,
    });
  } catch (error) {
    console.error("Overtime GET error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch overtime records" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getcurrentuser();

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const attendanceId = body.attendanceId;
    const overtimeMinutes = Number(body.overtimeMinutes);

    if (!attendanceId || typeof attendanceId !== "string") {
      return NextResponse.json(
        { success: false, message: "Attendance ID is required" },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(overtimeMinutes) ||
      overtimeMinutes < 0 ||
      overtimeMinutes > 1440
    ) {
      return NextResponse.json(
        { success: false, message: "Overtime must be between 0 and 1440 minutes" },
        { status: 400 }
      );
    }

    const existing = await prisma.staffAttendance.findUnique({
      where: { id: attendanceId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Attendance record not found" },
        { status: 404 }
      );
    }

    const updated = await prisma.staffAttendance.update({
      where: { id: attendanceId },
      data: { overtimeMinutes },
      include: {
        staff: {
          select: {
            id: true,
            name: true,
            designation: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Overtime updated successfully",
      record: updated,
    });
  } catch (error) {
    console.error("Overtime PATCH error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to update overtime" },
      { status: 500 }
    );
  }
}
