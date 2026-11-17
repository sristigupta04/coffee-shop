
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getcurrentuser } from "@/app/lib/auth";
import { AttendanceStatus } from "@prisma/client";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const TIME_ZONE = "Asia/Kolkata";

const VALID_STATUSES = [
  "PRESENT",
  "ABSENT",
  "LATE",
  "HALF_DAY",
  "LEAVE",
] as const;

type ValidStatus = (typeof VALID_STATUSES)[number];

// -------------------- ADMIN AUTHORIZATION --------------------

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

  return {
    success: true as const,
    user,
  };
}

// -------------------- HELPERS --------------------

function isValidStatus(value: unknown): value is ValidStatus {
  return (
    typeof value === "string" &&
    VALID_STATUSES.includes(value as ValidStatus)
  );
}

// Convert HH:mm from Asia/Kolkata into UTC Date.
// Attendance date is stored as UTC midnight representing
// the India calendar date.
function parseAttendanceTime(
  value: unknown,
  attendanceDate: Date
) {
  if (value === undefined) {
    return {
      valid: true,
      value: undefined as Date | null | undefined,
    };
  }

  if (value === null || value === "") {
    return {
      valid: true,
      value: null,
    };
  }

  if (typeof value !== "string") {
    return {
      valid: false,
      value: null,
    };
  }

  const timeMatch = value.match(
    /^([01]\d|2[0-3]):([0-5]\d)$/
  );

  if (timeMatch) {
    const hours = Number(timeMatch[1]);
    const minutes = Number(timeMatch[2]);

    const year = attendanceDate.getUTCFullYear();
    const month = attendanceDate.getUTCMonth();
    const day = attendanceDate.getUTCDate();

    // IST = UTC + 05:30
    const utcDate = new Date(
      Date.UTC(
        year,
        month,
        day,
        hours - 5,
        minutes - 30
      )
    );

    return {
      valid: true,
      value: utcDate,
    };
  }

  // Allow valid ISO date strings as well.
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return {
      valid: false,
      value: null,
    };
  }

  return {
    valid: true,
    value: parsedDate,
  };
}

function errorResponse(
  message: string,
  status = 400
) {
  return NextResponse.json(
    {
      success: false,
      message,
    },
    { status }
  );
}

// -------------------- GET ATTENDANCE DETAILS --------------------

export async function GET(
  _req: NextRequest,
  { params }: RouteContext
) {
  try {
    const auth = await authorizeAdmin();

    if (!auth.success) {
      return errorResponse(
        auth.message,
        auth.status
      );
    }

    const { id } = await params;

    const attendance =
      await prisma.staffAttendance.findUnique({
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
              isActive: true,
            },
          },
        },
      });

    if (!attendance) {
      return errorResponse(
        "Attendance record not found",
        404
      );
    }

    return NextResponse.json({
      success: true,
      timezone: TIME_ZONE,
      attendance,
    });
  } catch (error) {
    console.error(
      "GET ATTENDANCE DETAILS ERROR:",
      error
    );

    return errorResponse(
      "Failed to fetch attendance details",
      500
    );
  }
}

// -------------------- PATCH: CORRECT ATTENDANCE --------------------

export async function PATCH(
  req: NextRequest,
  { params }: RouteContext
) {
  try {
    const auth = await authorizeAdmin();

    if (!auth.success) {
      return errorResponse(
        auth.message,
        auth.status
      );
    }

    const { id } = await params;

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
      status,
      checkIn,
      checkOut,
      notes,
    } = body as {
      status?: unknown;
      checkIn?: unknown;
      checkOut?: unknown;
      notes?: unknown;
    };

    const existing =
      await prisma.staffAttendance.findUnique({
        where: { id },
      });

    if (!existing) {
      return errorResponse(
        "Attendance record not found",
        404
      );
    }

    // Validate status only when supplied.
    if (
      status !== undefined &&
      !isValidStatus(status)
    ) {
      return errorResponse(
        "Invalid attendance status"
      );
    }

    // Validate notes.
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

    // Parse times using the attendance record's date.
    const parsedCheckIn = parseAttendanceTime(
      checkIn,
      existing.date
    );

    const parsedCheckOut = parseAttendanceTime(
      checkOut,
      existing.date
    );

    if (
      !parsedCheckIn.valid ||
      !parsedCheckOut.valid
    ) {
      return errorResponse(
        "Invalid check-in or check-out time. Use HH:mm format."
      );
    }

    // Preserve existing values when omitted.
    const finalCheckIn =
      parsedCheckIn.value === undefined
        ? existing.checkIn
        : parsedCheckIn.value;

    const finalCheckOut =
      parsedCheckOut.value === undefined
        ? existing.checkOut
        : parsedCheckOut.value;

    // Validate check-in / check-out order.
    if (
      finalCheckIn &&
      finalCheckOut &&
      finalCheckOut <= finalCheckIn
    ) {
      return errorResponse(
        "Check-out must be after check-in"
      );
    }

    // Build update data.
    const updateData = {
      ...(status !== undefined && {
        status: status as AttendanceStatus,
      }),

      ...(checkIn !== undefined && {
        checkIn: finalCheckIn,
      }),

      ...(checkOut !== undefined && {
        checkOut: finalCheckOut,
      }),

      ...(notes !== undefined && {
        notes:
          typeof notes === "string"
            ? notes.trim() || null
            : null,
      }),
    };

    const updatedAttendance =
      await prisma.staffAttendance.update({
        where: { id },
        data: updateData,
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

    return NextResponse.json({
      success: true,
      message: "Attendance corrected successfully",
      timezone: TIME_ZONE,
      attendance: updatedAttendance,
    });
  } catch (error) {
    console.error(
      "UPDATE ATTENDANCE ERROR:",
      error
    );

    return errorResponse(
      "Failed to correct attendance",
      500
    );
  }
}

// -------------------- DELETE ATTENDANCE --------------------

export async function DELETE(
  _req: NextRequest,
  { params }: RouteContext
) {
  try {
    const auth = await authorizeAdmin();

    if (!auth.success) {
      return errorResponse(
        auth.message,
        auth.status
      );
    }

    const { id } = await params;

    const existing =
      await prisma.staffAttendance.findUnique({
        where: { id },
        select: { id: true },
      });

    if (!existing) {
      return errorResponse(
        "Attendance record not found",
        404
      );
    }

    await prisma.staffAttendance.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Attendance record deleted successfully",
    });
  } catch (error) {
    console.error(
      "DELETE ATTENDANCE ERROR:",
      error
    );

    return errorResponse(
      "Failed to delete attendance",
      500
    );
  }
}
