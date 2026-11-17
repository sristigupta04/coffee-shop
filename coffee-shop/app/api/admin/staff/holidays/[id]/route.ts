
import { NextRequest, NextResponse } from "next/server";
import { HolidayType, Prisma } from "@prisma/client";
import { prisma } from "@/app/lib/prisma";
import { getcurrentuser } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const HOLIDAY_TYPES = Object.values(HolidayType);

async function authorizeAdmin() {
  const user = await getcurrentuser();

  if (!user) return 401;
  if (user.role !== "ADMIN") return 403;

  return 200;
}

function errorResponse(message: string, status = 400) {
  return NextResponse.json(
    { success: false, message },
    { status }
  );
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

export async function PATCH(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const authStatus = await authorizeAdmin();

    if (authStatus !== 200) {
      return errorResponse(
        authStatus === 401 ? "Unauthorized" : "Forbidden",
        authStatus
      );
    }

    const { id } = await context.params;

    const existing = await prisma.staffHoliday.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return errorResponse("Holiday not found.", 404);
    }

    const body = await req.json();
    const data: Prisma.StaffHolidayUpdateInput = {};

    if (body.name !== undefined) {
      if (
        typeof body.name !== "string" ||
        !body.name.trim() ||
        body.name.trim().length > 150
      ) {
        return errorResponse("Enter a valid holiday name (max 150 characters).");
      }

      data.name = body.name.trim();
    }

    if (body.date !== undefined) {
      const date = parseDate(body.date);

      if (!date) {
        return errorResponse("Invalid holiday date.");
      }

      data.date = date;
    }

    if (body.description !== undefined) {
      if (
        body.description !== null &&
        typeof body.description !== "string"
      ) {
        return errorResponse("Invalid description.");
      }

      const description =
        typeof body.description === "string"
          ? body.description.trim()
          : "";

      if (description.length > 1000) {
        return errorResponse("Description cannot exceed 1000 characters.");
      }

      data.description = description || null;
    }

    if (body.type !== undefined) {
      if (!HOLIDAY_TYPES.includes(body.type)) {
        return errorResponse("Invalid holiday type.");
      }

      data.type = body.type;
    }

    if (body.isActive !== undefined) {
      if (typeof body.isActive !== "boolean") {
        return errorResponse("Invalid holiday status.");
      }

      data.isActive = body.isActive;
    }

    if (body.branchId !== undefined) {
      const branchId =
        typeof body.branchId === "string" && body.branchId.trim()
          ? body.branchId.trim()
          : null;

      if (branchId) {
        const branch = await prisma.branch.findUnique({
          where: { id: branchId },
          select: { id: true },
        });

        if (!branch) {
          return errorResponse("Selected branch was not found.", 404);
        }

        data.branch = { connect: { id: branchId } };
      } else {
        data.branch = { disconnect: true };
      }
    }

    if (Object.keys(data).length === 0) {
      return errorResponse("No valid fields provided for update.");
    }

    const holiday = await prisma.staffHoliday.update({
      where: { id },
      data,
      include: {
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Holiday updated successfully.",
      holiday,
    });
  } catch (error) {
    console.error("UPDATE STAFF HOLIDAY ERROR:", error);
    return errorResponse("Failed to update holiday.", 500);
  }
}

export async function DELETE(
  _req: NextRequest,
  context: RouteContext
) {
  try {
    const authStatus = await authorizeAdmin();

    if (authStatus !== 200) {
      return errorResponse(
        authStatus === 401 ? "Unauthorized" : "Forbidden",
        authStatus
      );
    }

    const { id } = await context.params;

    const existing = await prisma.staffHoliday.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return errorResponse("Holiday not found.", 404);
    }

    await prisma.staffHoliday.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Holiday deleted successfully.",
    });
  } catch (error) {
    console.error("DELETE STAFF HOLIDAY ERROR:", error);
    return errorResponse("Failed to delete holiday.", 500);
  }
}
