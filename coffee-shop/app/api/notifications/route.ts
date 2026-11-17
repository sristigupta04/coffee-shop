
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getcurrentuser } from "@/app/lib/auth";
import { NotificationType, Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const notificationTypes = Object.values(NotificationType);

async function authorizeAdmin() {
  const user = await getcurrentuser();

  if (!user) {
    return {
      authorized: false as const,
      status: 401,
      message: "Unauthorized",
    };
  }

  if (user.role !== "ADMIN") {
    return {
      authorized: false as const,
      status: 403,
      message: "Forbidden",
    };
  }

  return { authorized: true as const };
}

// GET ALL NOTIFICATIONS
export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeAdmin();

    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, message: auth.message },
        { status: auth.status }
      );
    }

    const params = req.nextUrl.searchParams;

    const page = Math.max(1, Number(params.get("page")) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number(params.get("limit")) || 10)
    );

    const search = params.get("search")?.trim() || "";
    const readStatus = params.get("readStatus") || "ALL";
    const type = params.get("type") || "ALL";

    const where: Prisma.NotificationWhereInput = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { message: { contains: search, mode: "insensitive" } },
        {
          user: {
            is: {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
              ],
            },
          },
        },
      ];
    }

    if (readStatus === "READ") {
      where.isRead = true;
    } else if (readStatus === "UNREAD") {
      where.isRead = false;
    } else if (readStatus !== "ALL") {
      return NextResponse.json(
        { success: false, message: "Invalid read status" },
        { status: 400 }
      );
    }

    if (type !== "ALL") {
      if (!notificationTypes.includes(type as NotificationType)) {
        return NextResponse.json(
          { success: false, message: "Invalid notification type" },
          { status: 400 }
        );
      }

      where.type = type as NotificationType;
    }

    const [
      notifications,
      total,
      totalNotifications,
      unreadCount,
      readCount,
      typeCounts,
    ] = await Promise.all([
      prisma.notification.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count(),
      prisma.notification.count({ where: { isRead: false } }),
      prisma.notification.count({ where: { isRead: true } }),
      prisma.notification.groupBy({
        by: ["type"],
        _count: { _all: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: notifications,
      summary: {
        totalNotifications,
        unreadCount,
        readCount,
        typeCounts: typeCounts.map((item) => ({
          type: item.type,
          count: item._count._all,
        })),
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Admin notifications GET error:", error);

    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// SEND NOTIFICATION TO CUSTOMER
export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeAdmin();

    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, message: auth.message },
        { status: auth.status }
      );
    }

    const body = await req.json();

    const userId =
      typeof body.userId === "string" ? body.userId.trim() : "";
    const title =
      typeof body.title === "string" ? body.title.trim() : "";
    const message =
      typeof body.message === "string" ? body.message.trim() : "";
    const type = body.type || "SYSTEM";

    if (!userId || !title || !message) {
      return NextResponse.json(
        {
          success: false,
          message: "User ID, title and message are required",
        },
        { status: 400 }
      );
    }

    if (title.length > 150 || message.length > 2000) {
      return NextResponse.json(
        {
          success: false,
          message: "Title or message exceeds the allowed length",
        },
        { status: 400 }
      );
    }

    if (!notificationTypes.includes(type as NotificationType)) {
      return NextResponse.json(
        { success: false, message: "Invalid notification type" },
        { status: 400 }
      );
    }

    const customer = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, message: "Customer not found" },
        { status: 404 }
      );
    }

    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type: type as NotificationType,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Notification sent successfully",
        data: notification,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Admin notifications POST error:", error);

    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
