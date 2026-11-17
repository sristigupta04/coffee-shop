
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getcurrentuser } from "@/app/lib/auth";
import { BreakType, Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const TIME_ZONE = "Asia/Kolkata";

const VALID_BREAK_TYPES: BreakType[] = [
  "TEA",
  "LUNCH",
  "PERSONAL",
  "OTHER",
];

async function authorizeAdmin() {
  const user = await getcurrentuser();

  if (!user) {
    return {
      success: false as const,
      status: 401,
      message: "Unauthorized",
    };
  }

  if (user.role !== "ADMIN") {
    return {
      success: false as const,
      status: 403,
      message: "Admin access required",
    };
  }

  return { success: true as const };
}

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

function toDatabaseDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    return null;
  }

  return date;
}

function getNextDate(value: string) {
  const date = toDatabaseDate(value);

  if (!date) return null;

  date.setUTCDate(date.getUTCDate() + 1);

  return date;
}

function getIndiaDateRange(date: Date) {
  const dateString = getIndiaDateString(date);
  const start = toDatabaseDate(dateString);
  const end = getNextDate(dateString);

  return { start, end };
}

function errorResponse(message: string, status = 400) {
  return NextResponse.json(
    { success: false, message },
    { status }
  );
}

// -------------------- GET BREAK RECORDS --------------------

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeAdmin();

    if (!auth.success) {
      return errorResponse(auth.message, auth.status);
    }

    const { searchParams } = new URL(req.url);

    const type = searchParams.get("type");
    const date = searchParams.get("date");

    const where: Prisma.StaffBreakWhereInput = {};

    if (type && type !== "ALL") {
      if (!VALID_BREAK_TYPES.includes(type as BreakType)) {
        return errorResponse("Invalid break type");
      }

      where.type = type as BreakType;
    }

    if (date) {
      const start = toDatabaseDate(date);
      const end = getNextDate(date);

      if (!start || !end) {
        return errorResponse(
          "Invalid date. Use YYYY-MM-DD."
        );
      }

      where.startAt = {
        gte: start,
        lt: end,
      };
    }

    const breaks = await prisma.staffBreak.findMany({
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
      },
      orderBy: {
        startAt: "desc",
      },
    });

    const now = new Date();

    // Calculate live duration for ongoing breaks.
    const formattedBreaks = breaks.map((record) => {
      const durationMinutes = record.endAt
        ? record.durationMinutes
        : Math.max(
            0,
            Math.floor(
              (now.getTime() - record.startAt.getTime()) /
                60000
            )
          );

      return {
        ...record,
        durationMinutes,
      };
    });

    return NextResponse.json({
      success: true,
      timezone: TIME_ZONE,
      breaks: formattedBreaks,
      total: formattedBreaks.length,
    });
  } catch (error) {
    console.error("GET STAFF BREAKS ERROR:", error);

    return errorResponse(
      "Failed to fetch break records",
      500
    );
  }
}

// -------------------- POST: CREATE BREAK --------------------

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeAdmin();

    if (!auth.success) {
      return errorResponse(auth.message, auth.status);
    }

    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return errorResponse("Invalid request body");
    }

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return errorResponse("Invalid request body");
    }

    const {
      staffId,
      type,
      startAt,
      endAt,
      notes,
    } = body as {
      staffId?: unknown;
      type?: unknown;
      startAt?: unknown;
      endAt?: unknown;
      notes?: unknown;
    };

    if (
      typeof staffId !== "string" ||
      !staffId.trim()
    ) {
      return errorResponse("Staff member is required");
    }

    if (
      typeof type !== "string" ||
      !VALID_BREAK_TYPES.includes(type as BreakType)
    ) {
      return errorResponse("Invalid break type");
    }

    if (typeof startAt !== "string") {
      return errorResponse("Break start time is required");
    }

    const parsedStart = new Date(startAt);

    if (Number.isNaN(parsedStart.getTime())) {
      return errorResponse("Invalid break start time");
    }

    let parsedEnd: Date | null = null;

    if (endAt !== undefined && endAt !== null && endAt !== "") {
      if (typeof endAt !== "string") {
        return errorResponse("Invalid break end time");
      }

      parsedEnd = new Date(endAt);

      if (Number.isNaN(parsedEnd.getTime())) {
        return errorResponse("Invalid break end time");
      }

      if (parsedEnd <= parsedStart) {
        return errorResponse(
          "Break end time must be after start time"
        );
      }
    }

    if (
      notes !== undefined &&
      notes !== null &&
      (
        typeof notes !== "string" ||
        notes.length > 500
      )
    ) {
      return errorResponse(
        "Notes must not exceed 500 characters"
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
      return errorResponse(
        "Staff member not found",
        404
      );
    }

    if (!staff.isActive) {
      return errorResponse(
        "Cannot create a break for inactive staff"
      );
    }

    // Do not allow multiple simultaneous ongoing breaks.
    if (!parsedEnd) {
      const ongoingBreak = await prisma.staffBreak.findFirst({
        where: {
          staffId,
          endAt: null,
        },
        select: {
          id: true,
        },
      });

      if (ongoingBreak) {
        return errorResponse(
          "This staff member already has an ongoing break"
        );
      }
    }

    // Find attendance for the same India calendar date.
    const { start: attendanceStart, end: attendanceEnd } =
      getIndiaDateRange(parsedStart);

    if (!attendanceStart || !attendanceEnd) {
      return errorResponse("Unable to determine attendance date");
    }

    const attendance = await prisma.staffAttendance.findFirst({
      where: {
        staffId,
        date: {
          gte: attendanceStart,
          lt: attendanceEnd,
        },
      },
      select: {
        id: true,
      },
    });

    const durationMinutes = parsedEnd
      ? Math.floor(
          (parsedEnd.getTime() - parsedStart.getTime()) /
            60000
        )
      : 0;

    const createdBreak = await prisma.staffBreak.create({
      data: {
        staffId,
        attendanceId: attendance?.id ?? null,
        type: type as BreakType,
        startAt: parsedStart,
        endAt: parsedEnd,
        durationMinutes,
        notes:
          typeof notes === "string"
            ? notes.trim() || null
            : null,
      },
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
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Break record created successfully",
        break: createdBreak,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("CREATE STAFF BREAK ERROR:", error);

    return errorResponse(
      "Failed to create break record",
      500
    );
  }
}
