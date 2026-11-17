
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getcurrentuser } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

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

function errorResponse(message: string, status = 400) {
  return NextResponse.json(
    { success: false, message },
    { status }
  );
}

// -------------------- GET SINGLE BREAK --------------------

export async function GET(
  _req: NextRequest,
  { params }: RouteContext
) {
  try {
    const auth = await authorizeAdmin();

    if (!auth.success) {
      return errorResponse(auth.message, auth.status);
    }

    const { id } = await params;

    const breakRecord = await prisma.staffBreak.findUnique({
      where: { id },
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

    if (!breakRecord) {
      return errorResponse(
        "Break record not found",
        404
      );
    }

    const durationMinutes = breakRecord.endAt
      ? breakRecord.durationMinutes
      : Math.max(
          0,
          Math.floor(
            (Date.now() - breakRecord.startAt.getTime()) /
              60000
          )
        );

    return NextResponse.json({
      success: true,
      break: {
        ...breakRecord,
        durationMinutes,
      },
    });
  } catch (error) {
    console.error("GET STAFF BREAK ERROR:", error);

    return errorResponse(
      "Failed to fetch break record",
      500
    );
  }
}

// -------------------- PATCH: END BREAK --------------------

export async function PATCH(
  req: NextRequest,
  { params }: RouteContext
) {
  try {
    const auth = await authorizeAdmin();

    if (!auth.success) {
      return errorResponse(auth.message, auth.status);
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

    const { action } = body as {
      action?: unknown;
    };

    if (action !== "END") {
      return errorResponse("Invalid break action");
    }

    const existing = await prisma.staffBreak.findUnique({
      where: { id },
    });

    if (!existing) {
      return errorResponse(
        "Break record not found",
        404
      );
    }

    if (existing.endAt) {
      return errorResponse(
        "This break has already ended"
      );
    }

    const endAt = new Date();

    const durationMinutes = Math.max(
      0,
      Math.floor(
        (endAt.getTime() - existing.startAt.getTime()) /
          60000
      )
    );

    // Conditional update prevents ending the same break twice.
    const result = await prisma.staffBreak.updateMany({
      where: {
        id,
        endAt: null,
      },
      data: {
        endAt,
        durationMinutes,
      },
    });

    if (result.count === 0) {
      return errorResponse(
        "This break has already ended"
      );
    }

    const updatedBreak = await prisma.staffBreak.findUnique({
      where: { id },
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

    return NextResponse.json({
      success: true,
      message: "Break ended successfully",
      break: updatedBreak,
    });
  } catch (error) {
    console.error("END STAFF BREAK ERROR:", error);

    return errorResponse(
      "Failed to end break",
      500
    );
  }
}
