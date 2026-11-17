
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getcurrentuser } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

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
): string | null {
  if (value === undefined || value === null) return null;

  if (typeof value !== "string" || value.length > maxLength) {
    throw new Error(`INVALID_FIELD:${field}`);
  }

  return value.trim() || null;
}

// GET: Branch List
export async function GET(request: NextRequest) {
  try {
    const auth = await authorizeAdmin();

    if (!auth.authorized) return auth.response;

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status") || "ALL";

    if (!["ALL", "ACTIVE", "INACTIVE"].includes(status)) {
      return errorResponse("Invalid branch status.");
    }

    if (search.length > 200) {
      return errorResponse("Search cannot exceed 200 characters.");
    }

    const where = {
      ...(status === "ACTIVE" ? { isActive: true } : {}),
      ...(status === "INACTIVE" ? { isActive: false } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { code: { contains: search, mode: "insensitive" as const } },
              { city: { contains: search, mode: "insensitive" as const } },
              { state: { contains: search, mode: "insensitive" as const } },
              { email: { contains: search, mode: "insensitive" as const } },
              { phone: { contains: search } },
            ],
          }
        : {}),
    };

    const [branches, totalBranches, activeBranches] =
      await Promise.all([
        prisma.branch.findMany({
          where,
          include: {
            _count: {
              select: { staff: true },
            },
          },
          orderBy: [
            { createdAt: "desc" },
            { id: "desc" },
          ],
        }),

        prisma.branch.count(),

        prisma.branch.count({
          where: { isActive: true },
        }),
      ]);

    return NextResponse.json({
      success: true,
      branches,
      summary: {
        totalBranches,
        activeBranches,
        inactiveBranches: totalBranches - activeBranches,
      },
    });
  } catch (error) {
    console.error("Branches GET error:", error);
    return errorResponse("Failed to fetch branches.", 500);
  }
}

// POST: Create Branch
export async function POST(request: NextRequest) {
  try {
    const auth = await authorizeAdmin();

    if (!auth.authorized) return auth.response;

    let body: Record<string, unknown>;

    try {
      const parsed: unknown = await request.json();

      if (
        typeof parsed !== "object" ||
        parsed === null ||
        Array.isArray(parsed)
      ) {
        return errorResponse("Invalid request body.");
      }

      body = parsed as Record<string, unknown>;
    } catch {
      return errorResponse("Invalid JSON request body.");
    }

    const name =
      typeof body.name === "string" ? body.name.trim() : "";

    const code =
      typeof body.code === "string"
        ? body.code.trim().toUpperCase()
        : "";

    if (!name || name.length > 150) {
      return errorResponse(
        "Branch name is required (maximum 150 characters)."
      );
    }

    if (!code || code.length > 30) {
      return errorResponse(
        "Branch code is required (maximum 30 characters)."
      );
    }

    if (!/^[A-Z0-9_-]+$/.test(code)) {
      return errorResponse(
        "Branch code can only contain letters, numbers, hyphens and underscores."
      );
    }

    let address: string | null;
    let city: string | null;
    let state: string | null;
    let phone: string | null;
    let email: string | null;

    try {
      address = optionalString(body.address, "address", 500);
      city = optionalString(body.city, "city", 100);
      state = optionalString(body.state, "state", 100);
      phone = optionalString(body.phone, "phone", 30);
      email = optionalString(body.email, "email", 254);
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

    const cleanEmail = email?.toLowerCase() ?? null;

    if (
      cleanEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)
    ) {
      return errorResponse("Invalid email address.");
    }

    if (
      body.isActive !== undefined &&
      typeof body.isActive !== "boolean"
    ) {
      return errorResponse("Invalid branch status value.");
    }

    const existingBranch = await prisma.branch.findFirst({
      where: {
        OR: [
          { code: { equals: code, mode: "insensitive" } },
          { name: { equals: name, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        code: true,
        name: true,
      },
    });

    if (existingBranch) {
      return errorResponse(
        existingBranch.code.toUpperCase() === code
          ? "A branch with this code already exists."
          : "A branch with this name already exists.",
        409
      );
    }

    const branch = await prisma.branch.create({
      data: {
        name,
        code,
        address,
        city,
        state,
        phone,
        email: cleanEmail,
        ...(typeof body.isActive === "boolean"
          ? { isActive: body.isActive }
          : {}),
      },
      include: {
        _count: {
          select: { staff: true },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Branch created successfully.",
        branch,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Branches POST error:", error);

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

    return errorResponse("Failed to create branch.", 500);
  }
}
