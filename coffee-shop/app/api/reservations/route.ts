
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getcurrentuser } from "@/app/lib/auth";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const VALID_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "CANCELLED",
  "COMPLETED",
  "NO_SHOW",
] as const;

type ReservationStatus = (typeof VALID_STATUSES)[number];

const ALLOWED_TRANSITIONS: Record<
  ReservationStatus,
  ReservationStatus[]
> = {
  PENDING: ["CONFIRMED", "CANCELLED", "NO_SHOW"],
  CONFIRMED: ["CANCELLED", "COMPLETED", "NO_SHOW"],
  CANCELLED: [],
  COMPLETED: [],
  NO_SHOW: [],
};

async function authorizeAdmin() {
  const user = await getcurrentuser();

  if (!user) {
    return {
      authorized: false as const,
      response: NextResponse.json(
        { success: false, message: "Please login first." },
        { status: 401 }
      ),
    };
  }

  if (user.role !== "ADMIN") {
    return {
      authorized: false as const,
      response: NextResponse.json(
        { success: false, message: "Admin access required." },
        { status: 403 }
      ),
    };
  }

  return {
    authorized: true as const,
    user,
  };
}

// ==========================================
// GET: ADMIN RESERVATION LIST
// ==========================================

export async function GET(request: NextRequest) {
  try {
    const auth = await authorizeAdmin();

    if (!auth.authorized) {
      return auth.response;
    }

    const params = request.nextUrl.searchParams;

    const rawPage = params.get("page") ?? "1";
    const rawLimit = params.get("limit") ?? "10";

    const page = Number(rawPage);
    const limit = Number(rawLimit);

    if (
      !Number.isSafeInteger(page) ||
      page < 1 ||
      page > 1_000_000
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid page number." },
        { status: 400 }
      );
    }

    if (
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 100
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Limit must be between 1 and 100.",
        },
        { status: 400 }
      );
    }

    const search = params.get("search")?.trim() ?? "";
    const rawStatus = params.get("status")?.toUpperCase() ?? "ALL";
    const from = params.get("from");
    const to = params.get("to");

    if (search.length > 200) {
      return NextResponse.json(
        { success: false, message: "Search is too long." },
        { status: 400 }
      );
    }

    if (
      rawStatus !== "ALL" &&
      !VALID_STATUSES.includes(rawStatus as ReservationStatus)
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid reservation status." },
        { status: 400 }
      );
    }

    const dateFilter: Prisma.DateTimeFilter = {};

    if (from) {
      const fromDate = new Date(from);

      if (Number.isNaN(fromDate.getTime())) {
        return NextResponse.json(
          { success: false, message: "Invalid start date." },
          { status: 400 }
        );
      }

      dateFilter.gte = fromDate;
    }

    if (to) {
      const toDate = new Date(to);

      if (Number.isNaN(toDate.getTime())) {
        return NextResponse.json(
          { success: false, message: "Invalid end date." },
          { status: 400 }
        );
      }

      if (/^\d{4}-\d{2}-\d{2}$/.test(to)) {
        toDate.setHours(23, 59, 59, 999);
      }

      dateFilter.lte = toDate;
    }

    if (
      dateFilter.gte &&
      dateFilter.lte &&
      dateFilter.gte > dateFilter.lte
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Start date cannot be after end date.",
        },
        { status: 400 }
      );
    }

    const where: Prisma.ReservationWhereInput = {
      ...(rawStatus !== "ALL"
        ? { status: rawStatus as ReservationStatus }
        : {}),
      ...(from || to
        ? { reservationDate: dateFilter }
        : {}),
      ...(search
        ? {
            OR: [
              {
                reservationNumber: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                guestName: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                guestEmail: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                guestPhone: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            ],
          }
        : {}),
    };

    const [
      reservations,
      totalRecords,
      statusCounts,
      totalGuests,
    ] = await prisma.$transaction([
      prisma.reservation.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
        },
        orderBy: [
          { reservationDate: "desc" },
          { createdAt: "desc" },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),

      prisma.reservation.count({ where }),

      prisma.reservation.groupBy({
        by: ["status"],
        where,
        orderBy: {
          status: "asc",
        },
        _count: {
          _all: true,
        },
      }),

      prisma.reservation.aggregate({
        where,
        _sum: {
          partySize: true,
        },
      }),
    ]);

    const summary = {
      totalReservations: totalRecords,
      totalGuests: totalGuests._sum.partySize ?? 0,
      pending: 0,
      confirmed: 0,
      cancelled: 0,
      completed: 0,
      noShow: 0,
    };

    for (const item of statusCounts) {
const count: number =
  typeof item._count === "object" &&
  item._count !== null &&
  "_all" in item._count
    ? Number(item._count._all ?? 0)
    : 0;
      switch (item.status) {
        case "PENDING":
          summary.pending = count;
          break;

        case "CONFIRMED":
          summary.confirmed = count;
          break;

        case "CANCELLED":
          summary.cancelled = count;
          break;

        case "COMPLETED":
          summary.completed = count;
          break;

        case "NO_SHOW":
          summary.noShow = count;
          break;
      }
    }

    return NextResponse.json({
      success: true,
      message: "Reservations fetched successfully.",
      reservations,
      summary,
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages: Math.ceil(totalRecords / limit),
        hasNextPage: page * limit < totalRecords,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error("[ADMIN_GET_RESERVATIONS_ERROR]", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch reservations.",
      },
      { status: 500 }
    );
  }
}

// ==========================================
// PATCH: UPDATE RESERVATION STATUS
// ==========================================

export async function PATCH(request: NextRequest) {
  try {
    const auth = await authorizeAdmin();

    if (!auth.authorized) {
      return auth.response;
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid JSON request body.",
        },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { success: false, message: "Invalid request data." },
        { status: 400 }
      );
    }

    const data = body as Record<string, unknown>;

    const reservationId =
      typeof data.reservationId === "string"
        ? data.reservationId.trim()
        : "";

    const nextStatus =
      typeof data.status === "string"
        ? data.status.toUpperCase()
        : "";

    const adminNotes =
      typeof data.adminNotes === "string"
        ? data.adminNotes.trim()
        : undefined;

    if (!reservationId || reservationId.length > 100) {
      return NextResponse.json(
        {
          success: false,
          message: "Valid reservation ID is required.",
        },
        { status: 400 }
      );
    }

    if (!VALID_STATUSES.includes(nextStatus as ReservationStatus)) {
      return NextResponse.json(
        { success: false, message: "Invalid reservation status." },
        { status: 400 }
      );
    }

    if (adminNotes !== undefined && adminNotes.length > 1000) {
      return NextResponse.json(
        {
          success: false,
          message: "Admin notes cannot exceed 1000 characters.",
        },
        { status: 400 }
      );
    }

    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
    });

    if (!reservation) {
      return NextResponse.json(
        { success: false, message: "Reservation not found." },
        { status: 404 }
      );
    }

    const currentStatus = reservation.status as ReservationStatus;
    const targetStatus = nextStatus as ReservationStatus;

    if (currentStatus === targetStatus) {
      return NextResponse.json(
        {
          success: false,
          message: "Reservation already has this status.",
        },
        { status: 409 }
      );
    }

    if (!ALLOWED_TRANSITIONS[currentStatus].includes(targetStatus)) {
      return NextResponse.json(
        {
          success: false,
          message: `Cannot change reservation from ${currentStatus} to ${targetStatus}.`,
        },
        { status: 400 }
      );
    }

    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const updatedCount = await tx.reservation.updateMany({
        where: {
          id: reservationId,
          status: currentStatus,
        },
        data: {
          status: targetStatus,
          ...(targetStatus === "CONFIRMED"
            ? { confirmedAt: now }
            : {}),
          ...(targetStatus === "CANCELLED"
            ? { cancelledAt: now }
            : {}),
          ...(targetStatus === "COMPLETED"
            ? { completedAt: now }
            : {}),
          ...(adminNotes !== undefined ? { adminNotes } : {}),
        },
      });

      if (updatedCount.count !== 1) {
        throw new Error("RESERVATION_UPDATE_CONFLICT");
      }

      const updatedReservation = await tx.reservation.findUnique({
        where: { id: reservationId },
      });

      if (!updatedReservation) {
        throw new Error("RESERVATION_NOT_FOUND");
      }

      const messages: Record<ReservationStatus, string> = {
        PENDING: "Your reservation is pending confirmation.",
        CONFIRMED: "Your reservation has been confirmed.",
        CANCELLED: "Your reservation has been cancelled.",
        COMPLETED:
          "Your reservation has been completed. Thank you for visiting!",
        NO_SHOW: "Your reservation was marked as no-show.",
      };

      await tx.notification.create({
        data: {
          userId: reservation.userId,
          type: "ORDER_UPDATE",
          title: `Reservation ${targetStatus.replaceAll("_", " ")}`,
          message: `${reservation.reservationNumber}: ${messages[targetStatus]}`,
        },
      });

      return updatedReservation;
    });

    return NextResponse.json({
      success: true,
      message: "Reservation status updated successfully.",
      reservation: result,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "RESERVATION_UPDATE_CONFLICT"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Reservation was updated by another request. Refresh and try again.",
        },
        { status: 409 }
      );
    }

    console.error("[ADMIN_UPDATE_RESERVATION_ERROR]", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update reservation.",
      },
      { status: 500 }
    );
  }
}
