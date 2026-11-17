
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/app/lib/prisma";
import { getcurrentuser } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

const RESERVATION_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "CANCELLED",
  "COMPLETED",
  "NO_SHOW",
] as const;

type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

async function authorizeAdmin() {
  const user = await getcurrentuser();

  if (!user) {
    return {
      authorized: false as const,
      status: 401,
      message: "Authentication required.",
    };
  }

  if (user.role !== "ADMIN") {
    return {
      authorized: false as const,
      status: 403,
      message: "Admin access required.",
    };
  }

  return { authorized: true as const };
}

function isReservationStatus(
  value: unknown
): value is ReservationStatus {
  return (
    typeof value === "string" &&
    RESERVATION_STATUSES.includes(value as ReservationStatus)
  );
}

function parseDate(value: string | null): Date | null {
  if (!value) return null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

// GET: Fetch reservations with filters, pagination and summary
export async function GET(request: NextRequest) {
  try {
    const auth = await authorizeAdmin();

    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, message: auth.message },
        { status: auth.status }
      );
    }

    const params = request.nextUrl.searchParams;

    const search = params.get("search")?.trim() || "";
    const statusFilter = params.get("status") || "ALL";

    const parsedPage = Number.parseInt(params.get("page") || "1", 10);
    const parsedLimit = Number.parseInt(params.get("limit") || "10", 10);

    const page = Math.max(
      1,
      Number.isFinite(parsedPage) ? parsedPage : 1
    );

    const limit = Math.min(
      50,
      Math.max(1, Number.isFinite(parsedLimit) ? parsedLimit : 10)
    );

    if (
      statusFilter !== "ALL" &&
      !isReservationStatus(statusFilter)
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid reservation status." },
        { status: 400 }
      );
    }

    const fromDate = parseDate(params.get("from"));
    const toDate = parseDate(params.get("to"));

    if (params.get("from") && !fromDate) {
      return NextResponse.json(
        { success: false, message: "Invalid start date." },
        { status: 400 }
      );
    }

    if (params.get("to") && !toDate) {
      return NextResponse.json(
        { success: false, message: "Invalid end date." },
        { status: 400 }
      );
    }

    if (fromDate && toDate && fromDate > toDate) {
      return NextResponse.json(
        { success: false, message: "Start date cannot be after end date." },
        { status: 400 }
      );
    }

    const where: Prisma.ReservationWhereInput = {};

    if (search) {
      where.OR = [
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
      ];
    }

    if (statusFilter !== "ALL") {
      where.status = statusFilter as ReservationStatus;
    }

    if (fromDate || toDate) {
      where.reservationDate = {
        ...(fromDate ? { gte: fromDate } : {}),
        ...(toDate
          ? {
              lt: new Date(toDate.getTime() + 24 * 60 * 60 * 1000),
            }
          : {}),
      };
    }

    const [
      reservations,
      totalRecords,
      totalReservations,
      guestAggregate,
      pending,
      confirmed,
      cancelled,
      completed,
      noShow,
    ] = await Promise.all([
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
        orderBy: {
          reservationDate: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,
      }),

      prisma.reservation.count({ where }),

      prisma.reservation.count(),

      prisma.reservation.aggregate({
        _sum: {
          partySize: true,
        },
      }),

      prisma.reservation.count({
        where: { status: "PENDING" },
      }),

      prisma.reservation.count({
        where: { status: "CONFIRMED" },
      }),

      prisma.reservation.count({
        where: { status: "CANCELLED" },
      }),

      prisma.reservation.count({
        where: { status: "COMPLETED" },
      }),

      prisma.reservation.count({
        where: { status: "NO_SHOW" },
      }),
    ]);

    const totalPages = Math.ceil(totalRecords / limit);

    return NextResponse.json({
      success: true,
      reservations,
      summary: {
        totalReservations,
        totalGuests: guestAggregate._sum.partySize ?? 0,
        pending,
        confirmed,
        cancelled,
        completed,
        noShow,
      },
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error("[ADMIN_RESERVATIONS_GET_ERROR]", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to fetch reservations.",
      },
      { status: 500 }
    );
  }
}

// PATCH: Update reservation status and internal admin notes
export async function PATCH(request: NextRequest) {
  try {
    const auth = await authorizeAdmin();

    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, message: auth.message },
        { status: auth.status }
      );
    }

    const body = await request.json();

    const reservationId =
      typeof body.reservationId === "string"
        ? body.reservationId.trim()
        : "";

    const newStatus = body.status;
    const hasAdminNotes = Object.prototype.hasOwnProperty.call(
      body,
      "adminNotes"
    );

    if (!reservationId || !isReservationStatus(newStatus)) {
      return NextResponse.json(
        {
          success: false,
          message: "Valid reservation ID and status are required.",
        },
        { status: 400 }
      );
    }

    let notes: string | null | undefined;

    if (hasAdminNotes) {
      if (
        body.adminNotes !== null &&
        typeof body.adminNotes !== "string"
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Admin notes must be valid text.",
          },
          { status: 400 }
        );
      }

      notes =
        typeof body.adminNotes === "string"
          ? body.adminNotes.trim()
          : null;

      if (notes && notes.length > 1000) {
        return NextResponse.json(
          {
            success: false,
            message: "Admin notes cannot exceed 1000 characters.",
          },
          { status: 400 }
        );
      }
    }

    const existing = await prisma.reservation.findUnique({
      where: { id: reservationId },
      select: {
        id: true,
        status: true,
        reservationNumber: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Reservation not found." },
        { status: 404 }
      );
    }

    const allowedTransitions: Record<
      ReservationStatus,
      ReservationStatus[]
    > = {
      PENDING: ["CONFIRMED", "CANCELLED"],
      CONFIRMED: ["CANCELLED", "COMPLETED", "NO_SHOW"],
      CANCELLED: [],
      COMPLETED: [],
      NO_SHOW: [],
    };

    const statusChanged = existing.status !== newStatus;

    if (
      statusChanged &&
      !allowedTransitions[
        existing.status as ReservationStatus
      ]?.includes(newStatus)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: `Cannot change reservation from ${existing.status} to ${newStatus}.`,
        },
        { status: 400 }
      );
    }

    const now = new Date();

    const updateData: Prisma.ReservationUpdateInput = {
      ...(statusChanged
        ? {
            status: newStatus,
            ...(newStatus === "CONFIRMED"
              ? { confirmedAt: now }
              : {}),
            ...(newStatus === "CANCELLED"
              ? { cancelledAt: now }
              : {}),
            ...(newStatus === "COMPLETED"
              ? { completedAt: now }
              : {}),
          }
        : {}),
      ...(hasAdminNotes ? { adminNotes: notes } : {}),
    };

    const reservation = await prisma.reservation.update({
      where: { id: reservationId },
      data: updateData,
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
    });

    return NextResponse.json({
      success: true,
      message: "Reservation updated successfully.",
      reservation,
    });
  } catch (error) {
    console.error("[ADMIN_RESERVATIONS_PATCH_ERROR]", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to update reservation.",
      },
      { status: 500 }
    );
  }
}
