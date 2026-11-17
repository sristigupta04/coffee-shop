
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getcurrentuser } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// ==========================================
// GET: RESERVATION DETAILS
// ==========================================

export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const user = await getcurrentuser();

    if (!user?.id) {
      return NextResponse.json(
        { success: false, message: "Please login first." },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!id || id.length > 100) {
      return NextResponse.json(
        { success: false, message: "Invalid reservation ID." },
        { status: 400 }
      );
    }

    const reservation = await prisma.reservation.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!reservation) {
      return NextResponse.json(
        { success: false, message: "Reservation not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Reservation details fetched successfully.",
      reservation,
    });
  } catch (error) {
    console.error("[GET_RESERVATION_ERROR]", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch reservation details.",
      },
      { status: 500 }
    );
  }
}

// ==========================================
// PATCH: CANCEL RESERVATION
// ==========================================

export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const user = await getcurrentuser();

    if (!user?.id) {
      return NextResponse.json(
        { success: false, message: "Please login first." },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!id || id.length > 100) {
      return NextResponse.json(
        { success: false, message: "Invalid reservation ID." },
        { status: 400 }
      );
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body) ||
      !("action" in body) ||
      body.action !== "CANCEL"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Only the CANCEL action is supported.",
        },
        { status: 400 }
      );
    }

    const existingReservation = await prisma.reservation.findFirst({
      where: {
        id,
        userId: user.id,
      },
      select: {
        id: true,
        status: true,
        reservationDate: true,
        reservationNumber: true,
      },
    });

    if (!existingReservation) {
      return NextResponse.json(
        { success: false, message: "Reservation not found." },
        { status: 404 }
      );
    }

    if (existingReservation.status === "CANCELLED") {
      return NextResponse.json(
        {
          success: false,
          message: "This reservation is already cancelled.",
        },
        { status: 409 }
      );
    }

    if (existingReservation.status !== "PENDING") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Only pending reservations can be cancelled. Please contact the restaurant for assistance.",
        },
        { status: 400 }
      );
    }

    if (existingReservation.reservationDate <= new Date()) {
      return NextResponse.json(
        {
          success: false,
          message: "Past or ongoing reservations cannot be cancelled.",
        },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // Conditional update prevents concurrent cancellation.
      const updatedCount = await tx.reservation.updateMany({
        where: {
          id,
          userId: user.id,
          status: "PENDING",
          reservationDate: {
            gt: new Date(),
          },
        },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
        },
      });

      if (updatedCount.count !== 1) {
        throw new Error("RESERVATION_UPDATE_CONFLICT");
      }

      const reservation = await tx.reservation.findUnique({
        where: { id },
      });

      if (!reservation) {
        throw new Error("RESERVATION_NOT_FOUND");
      }

      await tx.notification.create({
        data: {
          userId: user.id,
          type: "ORDER_UPDATE",
          title: "Reservation Cancelled",
          message: `Your reservation ${reservation.reservationNumber} has been cancelled successfully.`,
        },
      });

      return reservation;
    });

    return NextResponse.json({
      success: true,
      message: "Reservation cancelled successfully.",
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
            "Reservation could not be cancelled. It may have already been updated.",
        },
        { status: 409 }
      );
    }

    console.error("[CANCEL_RESERVATION_ERROR]", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to cancel reservation.",
      },
      { status: 500 }
    );
  }
}
