
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getcurrentuser } from "@/app/lib/auth";
import {
  AttendanceStatus,
  Prisma,
} from "@prisma/client";

export const dynamic = "force-dynamic";

const TIME_ZONE = "Asia/Kolkata";

const VALID_STATUSES: AttendanceStatus[] = [
  "PRESENT",
  "ABSENT",
  "LATE",
  "HALF_DAY",
  "LEAVE",
];

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

function getDateDifference(from: Date, to: Date) {
  return Math.floor(
    (to.getTime() - from.getTime()) /
      (24 * 60 * 60 * 1000)
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
        { success: false, message: "Admin access required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);

    const today = getIndiaDateString();

    const defaultFrom = (() => {
      const date = new Date(`${today}T00:00:00.000Z`);
      date.setUTCDate(1);
      return date.toISOString().slice(0, 10);
    })();

    const fromParam =
      searchParams.get("from") || defaultFrom;

    const toParam =
      searchParams.get("to") || today;

    const department =
      searchParams.get("department")?.trim() || "";

    const search =
      searchParams.get("search")?.trim() || "";

    const statusParam =
      searchParams.get("status") || "";

    const from = toDatabaseDate(fromParam);
    const to = getNextDate(toParam);

    if (!from || !to) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid date range. Use YYYY-MM-DD.",
        },
        { status: 400 }
      );
    }

    if (from > to) {
      return NextResponse.json(
        {
          success: false,
          message: "Start date cannot be after end date.",
        },
        { status: 400 }
      );
    }

    const totalDays = getDateDifference(from, to);

    if (totalDays > 366) {
      return NextResponse.json(
        {
          success: false,
          message: "Report range cannot exceed 366 days.",
        },
        { status: 400 }
      );
    }

    if (
      statusParam &&
      !VALID_STATUSES.includes(statusParam as AttendanceStatus)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid attendance status.",
        },
        { status: 400 }
      );
    }

    // Fetch departments independently of active filters.
    const departments = await prisma.staff.findMany({
      where: {
        department: {
          not: null,
        },
      },
      select: {
        department: true,
      },
      distinct: ["department"],
      orderBy: {
        department: "asc",
      },
    });

    const departmentOptions = departments
      .map((item) => item.department)
      .filter(
        (value): value is string =>
          Boolean(value && value.trim())
      );

    const staffWhere: Prisma.StaffWhereInput = {
      isActive: true,

      ...(department && {
        department,
      }),

      ...(search && {
        OR: [
          {
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            email: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            phone: {
              contains: search,
            },
          },
        ],
      }),
    };

    const staff = await prisma.staff.findMany({
      where: staffWhere,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        designation: true,
        department: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    const staffIds = staff.map((item) => item.id);

    const attendanceWhere: Prisma.StaffAttendanceWhereInput = {
      date: {
        gte: from,
        lt: to,
      },

      ...(staffIds.length > 0
        ? {
            staffId: {
              in: staffIds,
            },
          }
        : {
            staffId: "__NO_MATCHING_STAFF__",
          }),

      ...(statusParam && {
        status: statusParam as AttendanceStatus,
      }),
    };

    const attendance =
      await prisma.staffAttendance.findMany({
        where: attendanceWhere,
        select: {
          id: true,
          staffId: true,
          date: true,
          status: true,
          checkIn: true,
          checkOut: true,
          notes: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: [
          {
            date: "asc",
          },
          {
            createdAt: "asc",
          },
        ],
      });

    const attendanceByStaff = new Map<
      string,
      typeof attendance
    >();

    for (const record of attendance) {
      const records =
        attendanceByStaff.get(record.staffId) || [];

      records.push(record);

      attendanceByStaff.set(
        record.staffId,
        records
      );
    }

    const staffRecords = staff.map((member) => {
      const records =
        attendanceByStaff.get(member.id) || [];

      const counts = {
        present: 0,
        absent: 0,
        late: 0,
        halfDay: 0,
        leave: 0,
      };

      for (const record of records) {
        switch (record.status) {
          case "PRESENT":
            counts.present++;
            break;
          case "ABSENT":
            counts.absent++;
            break;
          case "LATE":
            counts.late++;
            break;
          case "HALF_DAY":
            counts.halfDay++;
            break;
          case "LEAVE":
            counts.leave++;
            break;
        }
      }

      const recordedDays = records.length;

      const presentEquivalent =
        counts.present +
        counts.late +
        counts.halfDay * 0.5;

      const attendanceRate =
        recordedDays > 0
          ? Number(
              (
                (presentEquivalent / recordedDays) *
                100
              ).toFixed(2)
            )
          : 0;

      return {
        ...member,
        totalRecords: recordedDays,
        ...counts,
        attendanceRate,
        attendance: records,
      };
    });

    // Daily report breakdown.
    const dailyMap = new Map<
      string,
      {
        date: string;
        present: number;
        absent: number;
        late: number;
        halfDay: number;
        leave: number;
        total: number;
      }
    >();

    for (const record of attendance) {
      const date = record.date
        .toISOString()
        .slice(0, 10);

      const day = dailyMap.get(date) || {
        date,
        present: 0,
        absent: 0,
        late: 0,
        halfDay: 0,
        leave: 0,
        total: 0,
      };

      day.total++;

      switch (record.status) {
        case "PRESENT":
          day.present++;
          break;
        case "ABSENT":
          day.absent++;
          break;
        case "LATE":
          day.late++;
          break;
        case "HALF_DAY":
          day.halfDay++;
          break;
        case "LEAVE":
          day.leave++;
          break;
      }

      dailyMap.set(date, day);
    }

    const dailyRecords = Array.from(
      dailyMap.values()
    ).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    const summary = {
      totalStaff: staff.length,
      totalRecords: attendance.length,

      present: attendance.filter(
        (item) => item.status === "PRESENT"
      ).length,

      absent: attendance.filter(
        (item) => item.status === "ABSENT"
      ).length,

      late: attendance.filter(
        (item) => item.status === "LATE"
      ).length,

      halfDay: attendance.filter(
        (item) => item.status === "HALF_DAY"
      ).length,

      leave: attendance.filter(
        (item) => item.status === "LEAVE"
      ).length,

      averageAttendanceRate:
        staffRecords.length > 0
          ? Number(
              (
                staffRecords.reduce(
                  (sum, item) =>
                    sum + item.attendanceRate,
                  0
                ) / staffRecords.length
              ).toFixed(2)
            )
          : 0,
    };

    return NextResponse.json({
      success: true,
      timezone: TIME_ZONE,
      filters: {
        from: fromParam,
        to: toParam,
        department,
        search,
        status: statusParam,
      },
      departments: departmentOptions,
      summary,
      staffRecords,
      dailyRecords,
    });
  } catch (error) {
    console.error(
      "ATTENDANCE REPORT ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to generate attendance report.",
      },
      { status: 500 }
    );
  }
}
