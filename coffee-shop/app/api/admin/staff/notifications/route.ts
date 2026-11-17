
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getcurrentuser } from "@/app/lib/auth";
import {
  Prisma,
  StaffNotificationType,
} from "@prisma/client";

export const dynamic = "force-dynamic";

const notificationTypes = Object.values(StaffNotificationType);

function errorResponse(message: string, status = 400) {
  return NextResponse.json(
    { success: false, message },
    { status }
  );
}

// GET: Fetch all staff notifications
export async function GET() {
  try {
    const user = await getcurrentuser();

    if (!user || user.role !== "ADMIN") {
      return errorResponse("Unauthorized", 401);
    }

    const notifications = await prisma.staffNotification.findMany({
      include: {
        staff: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      notifications,
      total: notifications.length,
    });
  } catch (error) {
    console.error("GET STAFF NOTIFICATIONS ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch staff notifications.",
      },
      { status: 500 }
    );
  }
}

// POST: Send a notification to a staff member
export async function POST(req: NextRequest) {
  try {
    const user = await getcurrentuser();

    if (!user || user.role !== "ADMIN") {
      return errorResponse("Unauthorized", 401);
    }

    const body = await req.json();

    const staffId =
      typeof body.staffId === "string" ? body.staffId.trim() : "";

    const title =
      typeof body.title === "string" ? body.title.trim() : "";

    const message =
      typeof body.message === "string" ? body.message.trim() : "";

    const type =
      typeof body.type === "string" ? body.type : "SYSTEM";

    if (!staffId || !title || !message) {
      return errorResponse(
        "Staff member, title and message are required."
      );
    }

    if (title.length > 150) {
      return errorResponse("Title cannot exceed 150 characters.");
    }

    if (message.length > 2000) {
      return errorResponse("Message cannot exceed 2000 characters.");
    }

    if (!notificationTypes.includes(type as StaffNotificationType)) {
      return errorResponse("Invalid notification type.");
    }

    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
      select: {
        id: true,
        name: true,
      },
    });

    if (!staff) {
      return errorResponse("Staff member not found.", 404);
    }

    const notification = await prisma.staffNotification.create({
      data: {
        staffId,
        title,
        message,
        type: type as StaffNotificationType,
      },
      include: {
        staff: {
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
        message: "Notification sent successfully.",
        notification,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("CREATE STAFF NOTIFICATION ERROR:", error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return errorResponse("Invalid staff member.", 404);
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to send staff notification.",
      },
      { status: 500 }
    );
  }
}
