
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getcurrentuser } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function errorResponse(message: string, status = 400) {
  return NextResponse.json(
    { success: false, message },
    { status }
  );
}

async function authorizeAdmin() {
  const user = await getcurrentuser();

  if (!user?.id) {
    return {
      authorized: false as const,
      response: errorResponse("Please login first.", 401),
    };
  }

  if (user.role !== "ADMIN") {
    return {
      authorized: false as const,
      response: errorResponse("Admin access required.", 403),
    };
  }

  return { authorized: true as const };
}

function optionalString(
  value: unknown,
  field: string,
  maxLength = 500
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;

  if (typeof value !== "string" || value.length > maxLength) {
    throw new Error(`INVALID_FIELD:${field}`);
  }

  return value.trim() || null;
}

async function parseBody(request: NextRequest) {
  try {
    const parsed: unknown = await request.json();

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return null;
    }

    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

// GET: Single Branch Details
export async function GET(
  _request: NextRequest,
  { params }: RouteContext
) {
  try {
    const auth = await authorizeAdmin();

    if (!auth.authorized) return auth.response;

    const { id } = await params;

    if (!id?.trim()) {
      return errorResponse("Branch ID is required.");
    }

    const branch = await prisma.branch.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            staff: true,
            shifts: true,
            holidays: true,
            weeklyOffs: true,
          },
        },
      },
    });

    if (!branch) {
      return errorResponse("Branch not found.", 404);
    }

    return NextResponse.json({
      success: true,
      branch,
    });
  } catch (error) {
    console.error("Branch GET error:", error);
    return errorResponse("Failed to fetch branch.", 500);
  }
}

// PATCH: Update Branch
export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const auth = await authorizeAdmin();

    if (!auth.authorized) return auth.response;

    const { id } = await params;

    if (!id?.trim()) {
      return errorResponse("Branch ID is required.");
    }

    const existingBranch = await prisma.branch.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existingBranch) {
      return errorResponse("Branch not found.", 404);
    }

    const body = await parseBody(request);

    if (!body) {
      return errorResponse("Invalid JSON request body.");
    }

    const data: {
      name?: string;
      code?: string;
      address?: string | null;
      city?: string | null;
      state?: string | null;
      phone?: string | null;
      email?: string | null;
      isActive?: boolean;
    } = {};

    if (body.name !== undefined) {
      if (
        typeof body.name !== "string" ||
        !body.name.trim() ||
        body.name.trim().length > 150
      ) {
        return errorResponse("Invalid branch name.");
      }

      data.name = body.name.trim();
    }

    if (body.code !== undefined) {
      if (
        typeof body.code !== "string" ||
        !body.code.trim() ||
        body.code.trim().length > 30
      ) {
        return errorResponse("Invalid branch code.");
      }

      const code = body.code.trim().toUpperCase();

      if (!/^[A-Z0-9_-]+$/.test(code)) {
        return errorResponse(
          "Branch code can only contain letters, numbers, hyphens and underscores."
        );
      }

      data.code = code;
    }

    try {
      const address = optionalString(body.address, "address", 500);
      const city = optionalString(body.city, "city", 100);
      const state = optionalString(body.state, "state", 100);
      const phone = optionalString(body.phone, "phone", 30);
      const email = optionalString(body.email, "email", 254);

      if (address !== undefined) data.address = address;
      if (city !== undefined) data.city = city;
      if (state !== undefined) data.state = state;
      if (phone !== undefined) data.phone = phone;
      if (email !== undefined) data.email = email?.toLowerCase() ?? null;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "";

      if (message.startsWith("INVALID_FIELD:")) {
        return errorResponse(
          `Invalid ${message.split(":")[1]} value.`
        );
      }

      throw error;
    }

    if (
      data.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)
    ) {
      return errorResponse("Invalid email address.");
    }

    if (body.isActive !== undefined) {
      if (typeof body.isActive !== "boolean") {
        return errorResponse("Invalid branch status value.");
      }

      data.isActive = body.isActive;
    }

    if (Object.keys(data).length === 0) {
      return errorResponse("No valid fields provided for update.");
    }

    if (data.name || data.code) {
      const duplicate = await prisma.branch.findFirst({
        where: {
          id: { not: id },
          OR: [
            ...(data.name
              ? [
                  {
                    name: {
                      equals: data.name,
                      mode: "insensitive" as const,
                    },
                  },
                ]
              : []),
            ...(data.code
              ? [
                  {
                    code: {
                      equals: data.code,
                      mode: "insensitive" as const,
                    },
                  },
                ]
              : []),
          ],
        },
        select: { id: true, name: true, code: true },
      });

      if (duplicate) {
        return errorResponse(
          data.code &&
            duplicate.code.toUpperCase() === data.code
            ? "Another branch already uses this code."
            : "Another branch already uses this name.",
          409
        );
      }
    }

    const branch = await prisma.branch.update({
      where: { id },
      data,
      include: {
        _count: {
          select: {
            staff: true,
            shifts: true,
            holidays: true,
            weeklyOffs: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Branch updated successfully.",
      branch,
    });
  } catch (error) {
    console.error("Branch PATCH error:", error);

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return errorResponse(
        "A branch with these unique details already exists.",
        409
      );
    }

    return errorResponse("Failed to update branch.", 500);
  }
}

// DELETE: Delete Branch
export async function DELETE(
  _request: NextRequest,
  { params }: RouteContext
) {
  try {
    const auth = await authorizeAdmin();

    if (!auth.authorized) return auth.response;

    const { id } = await params;

    if (!id?.trim()) {
      return errorResponse("Branch ID is required.");
    }

    const branch = await prisma.branch.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            staff: true,
            shifts: true,
            holidays: true,
            weeklyOffs: true,
          },
        },
      },
    });

    if (!branch) {
      return errorResponse("Branch not found.", 404);
    }

    if (
      branch._count.staff > 0 ||
      branch._count.shifts > 0 ||
      branch._count.holidays > 0 ||
      branch._count.weeklyOffs > 0
    ) {
      return errorResponse(
        "This branch has linked staff or attendance records. Deactivate it instead of deleting.",
        409
      );
    }

    await prisma.branch.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Branch deleted successfully.",
    });
  } catch (error) {
    console.error("Branch DELETE error:", error);
    return errorResponse("Failed to delete branch.", 500);
  }
}
