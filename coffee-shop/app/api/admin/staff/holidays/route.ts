
import { NextRequest, NextResponse } from "next/server";
import { HolidayType, Prisma } from "@prisma/client";
import { prisma } from "@/app/lib/prisma";
import { getcurrentuser } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

const HOLIDAY_TYPES = Object.values(HolidayType);

async function authorizeAdmin() {
  const user = await getcurrentuser();

  if (!user) return 401;
  if (user.role !== "ADMIN") return 403;

  return 200;
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
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

function errorResponse(message: string, status = 400) {
  return NextResponse.json(
    { success: false, message },
    { status }
  );
}

export async function GET() {
  try {
    const authStatus = await authorizeAdmin();

    if (authStatus !== 200) {
      return errorResponse(
        authStatus === 401 ? "Unauthorized" : "Forbidden",
        authStatus
      );
    }

    const holidays = await prisma.staffHoliday.findMany({
      include: {
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { date: "asc" },
        { name: "asc" },
      ],
    });

    return NextResponse.json({
      success: true,
      holidays,
      total: holidays.length,
    });
  } catch (error) {
    console.error("GET STAFF HOLIDAYS ERROR:", error);
    return errorResponse("Failed to fetch holidays.", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const authStatus = await authorizeAdmin();

    if (authStatus !== 200) {
      return errorResponse(
        authStatus === 401 ? "Unauthorized" : "Forbidden",
        authStatus
      );
    }

    const body = await req.json();

    const name =
      typeof body.name === "string" ? body.name.trim() : "";

    const date = parseDate(body.date);
    const description =
      typeof body.description === "string"
        ? body.description.trim()
        : "";

    const type = body.type || "PUBLIC";
    const branchId =
      typeof body.branchId === "string" && body.branchId.trim()
        ? body.branchId.trim()
        : null;

    const isActive =
      body.isActive === undefined ? true : body.isActive;

    if (!name || !date) {
      return errorResponse("Holiday name and valid date are required.");
    }

    if (name.length > 150) {
      return errorResponse("Holiday name cannot exceed 150 characters.");
    }

    if (description.length > 1000) {
      return errorResponse("Description cannot exceed 1000 characters.");
    }

    if (!HOLIDAY_TYPES.includes(type)) {
      return errorResponse("Invalid holiday type.");
    }

    if (typeof isActive !== "boolean") {
      return errorResponse("Invalid holiday status.");
    }

    if (branchId) {
      const branch = await prisma.branch.findUnique({
        where: { id: branchId },
        select: { id: true },
      });

      if (!branch) {
        return errorResponse("Selected branch was not found.", 404);
      }
    }

    const holiday = await prisma.staffHoliday.create({
      data: {
        name,
        date,
        description: description || null,
        type,
        isActive,
        branchId,
      },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Holiday created successfully.",
        holiday,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("CREATE STAFF HOLIDAY ERROR:", error);
    return errorResponse("Failed to create holiday.", 500);
  }
}
