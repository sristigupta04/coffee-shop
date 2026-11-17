
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getcurrentuser } from "@/app/lib/auth";
import { AttendanceStatus, Prisma } from "@prisma/client";

const TIME_ZONE = "Asia/Kolkata";

const VALID_STATUSES = [
  "PRESENT",
  "ABSENT",
  "LATE",
  "HALF_DAY",
  "LEAVE",
] as const;

type ValidStatus = (typeof VALID_STATUSES)[number];

// -------------------- HELPERS --------------------

async function authorizeAdmin() {
  const user = await getcurrentuser();

  if (!user) {
    return {
      success: false,
      status: 401,
      message: "Unauthorized",
    };
  }

  if (user.role !== "ADMIN") {
    return {
      success: false,
      status: 403,
      message: "Admin access required",
    };
  }

  return { success: true };
}

// Get current date in Asia/Kolkata
function getIndiaDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((p) => p.type === "year")!.value;
  const month = parts.find((p) => p.type === "month")!.value;
  const day = parts.find((p) => p.type === "day")!.value;

  return `${year}-${month}-${day}`;
}

// Store date-only values consistently as UTC midnight.
// The date string represents the India calendar date.
function toDatabaseDate(dateString: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return null;
  }

  const date = new Date(`${dateString}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== dateString
  ) {
    return null;
  }

  return date;
}

function getNextDate(dateString: string) {
  const date = toDatabaseDate(dateString);

  if (!date) return null;

  date.setUTCDate(date.getUTCDate() + 1);

  return date;
}

function isValidStatus(value: unknown): value is ValidStatus {
  return (
    typeof value === "string" &&
    VALID_STATUSES.includes(value as ValidStatus)
  );
}

function parseOptionalDate(value: unknown) {
  if (value === undefined) {
    return { valid: true, value: undefined };
  }

  if (value === null || value === "") {
    return { valid: true, value: null };
  }

  if (typeof value !== "string") {
    return { valid: false, value: null };
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return { valid: false, value: null };
  }

  return { valid: true, value: parsed };
}

// -------------------- GET ATTENDANCE --------------------

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeAdmin();

    if (!auth.success) {
      return NextResponse.json(
        { success: false, message: auth.message },
        { status: auth.status }
      );
    }

    const { searchParams } = new URL(req.url);

    const dateParam = searchParams.get("date");
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const staffId = searchParams.get("staffId");
    const status = searchParams.get("status");
    const search = searchParams.get("search")?.trim();

    const page = Math.max(
      1,
      Number(searchParams.get("page")) || 1
    );

    const limit = Math.min(
      100,
      Math.max(1, Number(searchParams.get("limit")) || 20)
    );

    const where: Prisma.StaffAttendanceWhereInput = {};

    // Single date filter
    if (dateParam) {
      const start = toDatabaseDate(dateParam);
      const end = getNextDate(dateParam);

      if (!start || !end) {
        return NextResponse.json(
          { success: false, message: "Invalid date format. Use YYYY-MM-DD." },
          { status: 400 }
        );
      }

      where.date = {
        gte: start,
        lt: end,
      };
    } else {
      // Date range filter
      if (fromParam || toParam) {
        const from = fromParam
          ? toDatabaseDate(fromParam)
          : null;

        const to = toParam
          ? getNextDate(toParam)
          : null;

        if ((fromParam && !from) || (toParam && !to)) {
          return NextResponse.json(
            { success: false, message: "Invalid date range" },
            { status: 400 }
          );
        }

        where.date = {
          ...(from && { gte: from }),
          ...(to && { lt: to }),
        };
      }
    }

    if (staffId) {
      where.staffId = staffId;
    }

    if (status) {
      if (!isValidStatus(status)) {
        return NextResponse.json(
          { success: false, message: "Invalid attendance status" },
          { status: 400 }
        );
      }

      where.status = status as AttendanceStatus;
    }

    if (search) {
      where.staff = {
        name: {
          contains: search,
          mode: "insensitive",
        },
      };
    }

    const [
      attendance,
      total,
      grouped,
      activeStaffCount,
    ] = await Promise.all([
      prisma.staffAttendance.findMany({
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
              isActive: true,
            },
          },
        },
        orderBy: [
          { date: "desc" },
          { createdAt: "desc" },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),

      prisma.staffAttendance.count({ where }),

      prisma.staffAttendance.groupBy({
        by: ["status"],
        where,
        _count: {
          _all: true,
        },
      }),

      prisma.staff.count({
        where: { isActive: true },
      }),
    ]);

    const summary = {
      total: 0,
      present: 0,
      absent: 0,
      late: 0,
      halfDay: 0,
      leave: 0,
    };

    for (const item of grouped) {
      const count = item._count._all;

      summary.total += count;

      switch (item.status) {
        case "PRESENT":
          summary.present = count;
          break;
        case "ABSENT":
          summary.absent = count;
          break;
        case "LATE":
          summary.late = count;
          break;
        case "HALF_DAY":
          summary.halfDay = count;
          break;
        case "LEAVE":
          summary.leave = count;
          break;
      }
    }

    return NextResponse.json({
      success: true,
      timezone: TIME_ZONE,
      currentDate: getIndiaDateString(),
      attendance,
      summary,
      activeStaffCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET ATTENDANCE ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch attendance" },
      { status: 500 }
    );
  }
}

// -------------------- CREATE / UPDATE ATTENDANCE --------------------

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeAdmin();

    if (!auth.success) {
      return NextResponse.json(
        { success: false, message: auth.message },
        { status: auth.status }
      );
    }

    const body = await req.json();

    const {
      staffId,
      date,
      status,
      checkIn,
      checkOut,
      notes,
    } = body;

    if (!staffId || typeof staffId !== "string") {
      return NextResponse.json(
        { success: false, message: "Staff ID is required" },
        { status: 400 }
      );
    }

    if (typeof date !== "string") {
      return NextResponse.json(
        { success: false, message: "Attendance date is required" },
        { status: 400 }
      );
    }

    const attendanceDate = toDatabaseDate(date);

    if (!attendanceDate) {
      return NextResponse.json(
        { success: false, message: "Invalid date. Use YYYY-MM-DD." },
        { status: 400 }
      );
    }

    if (!isValidStatus(status)) {
      return NextResponse.json(
        { success: false, message: "Invalid attendance status" },
        { status: 400 }
      );
    }

    if (
      notes !== undefined &&
      notes !== null &&
      (typeof notes !== "string" || notes.length > 500)
    ) {
      return NextResponse.json(
        { success: false, message: "Notes must not exceed 500 characters" },
        { status: 400 }
      );
    }

    const parsedCheckIn = parseOptionalDate(checkIn);
    const parsedCheckOut = parseOptionalDate(checkOut);

    if (!parsedCheckIn.valid || !parsedCheckOut.valid) {
      return NextResponse.json(
        { success: false, message: "Invalid check-in or check-out time" },
        { status: 400 }
      );
    }

    if (
      parsedCheckIn.value instanceof Date &&
      parsedCheckOut.value instanceof Date &&
      parsedCheckOut.value <= parsedCheckIn.value
    ) {
      return NextResponse.json(
        { success: false, message: "Check-out must be after check-in" },
        { status: 400 }
      );
    }

    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
      select: {
        id: true,
        name: true,
        isActive: true,
      },
    });

    if (!staff) {
      return NextResponse.json(
        { success: false, message: "Staff member not found" },
        { status: 404 }
      );
    }

    if (!staff.isActive) {
      return NextResponse.json(
        { success: false, message: "Staff member is inactive" },
        { status: 400 }
      );
    }

    const existing = await prisma.staffAttendance.findUnique({
      where: {
        staffId_date: {
          staffId,
          date: attendanceDate,
        },
      },
    });

    // Preserve existing check-in/check-out when omitted.
    const finalCheckIn =
      parsedCheckIn.value === undefined
        ? existing?.checkIn ?? null
        : parsedCheckIn.value;

    const finalCheckOut =
      parsedCheckOut.value === undefined
        ? existing?.checkOut ?? null
        : parsedCheckOut.value;

    if (
      finalCheckIn &&
      finalCheckOut &&
      finalCheckOut <= finalCheckIn
    ) {
      return NextResponse.json(
        { success: false, message: "Check-out must be after check-in" },
        { status: 400 }
      );
    }

    const attendance = await prisma.staffAttendance.upsert({
      where: {
        staffId_date: {
          staffId,
          date: attendanceDate,
        },
      },
      create: {
        staffId,
        date: attendanceDate,
        status: status as AttendanceStatus,
        checkIn: finalCheckIn,
        checkOut: finalCheckOut,
        notes: notes?.trim() || null,
      },
      update: {
        status: status as AttendanceStatus,
        checkIn: finalCheckIn,
        checkOut: finalCheckOut,
        ...(notes !== undefined && {
          notes: notes?.trim() || null,
        }),
      },
      include: {
        staff: {
          select: {
            id: true,
            name: true,
            designation: true,
            department: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: existing
          ? "Attendance updated successfully"
          : "Attendance marked successfully",
        attendance,
      },
      { status: existing ? 200 : 201 }
    );
  } catch (error) {
    console.error("SAVE ATTENDANCE ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Failed to save attendance" },
      { status: 500 }
    );
  }
}
