
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/app/lib/prisma";
import { getcurrentuser } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

const REVIEW_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;

async function authorizeAdmin() {
  const user = await getcurrentuser();

  if (!user) {
    return {
      authorized: false,
      status: 401,
      message: "Authentication required.",
    };
  }

  if (user.role !== "ADMIN") {
    return {
      authorized: false,
      status: 403,
      message: "Admin access required.",
    };
  }

  return { authorized: true };
}

// GET: List reviews with filters and summary
export async function GET(request: NextRequest) {
  try {
    const auth = await authorizeAdmin();

    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, message: auth.message },
        { status: auth.status }
      );
    }

    const searchParams = request.nextUrl.searchParams;

    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status") || "ALL";

    const page = Math.max(
      1,
      Number.parseInt(searchParams.get("page") || "1", 10) || 1
    );

    const limit = Math.min(
      50,
      Math.max(
        1,
        Number.parseInt(searchParams.get("limit") || "10", 10) || 10
      )
    );

    if (
      status !== "ALL" &&
      !REVIEW_STATUSES.includes(
        status as (typeof REVIEW_STATUSES)[number]
      )
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid review status." },
        { status: 400 }
      );
    }

    const where = {
      ...(status !== "ALL" ? { status: status as (typeof REVIEW_STATUSES)[number] } : {}),
      ...(search
        ? {
            OR: [
              {
                comment: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
              {
                user: {
                  name: {
                    contains: search,
                    mode: "insensitive" as const,
                  },
                },
              },
              {
                product: {
                  name: {
                    contains: search,
                    mode: "insensitive" as const,
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [reviews, total, totalReviews, pendingReviews, approvedReviews, rejectedReviews, ratingStats] =
      await Promise.all([
        prisma.review.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
            product: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          skip: (page - 1) * limit,
          take: limit,
        }),

        prisma.review.count({ where }),

        prisma.review.count(),

        prisma.review.count({
          where: { status: "PENDING" },
        }),

        prisma.review.count({
          where: { status: "APPROVED" },
        }),

        prisma.review.count({
          where: { status: "REJECTED" },
        }),

        prisma.review.aggregate({
          _avg: {
            rating: true,
          },
          _count: {
            rating: true,
          },
        }),
      ]);

    return NextResponse.json({
      success: true,
      reviews,
      summary: {
        totalReviews,
        pendingReviews,
        approvedReviews,
        rejectedReviews,
        averageRating: Number(
          (ratingStats._avg.rating ?? 0).toFixed(1)
        ),
        ratedReviews: ratingStats._count.rating,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.error("[ADMIN_REVIEWS_GET_ERROR]", error);

    return NextResponse.json(
      { success: false, message: "Unable to fetch reviews." },
      { status: 500 }
    );
  }
}

// PATCH: Approve or reject a review
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

    const id =
      typeof body.id === "string" ? body.id.trim() : "";

    const status = body.status;

    if (!id || !["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json(
        {
          success: false,
          message: "Review ID and valid status are required.",
        },
        { status: 400 }
      );
    }

    const existingReview = await prisma.review.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!existingReview) {
      return NextResponse.json(
        { success: false, message: "Review not found." },
        { status: 404 }
      );
    }

    const review = await prisma.review.update({
      where: { id },
      data: { status },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message:
        status === "APPROVED"
          ? "Review approved successfully."
          : "Review rejected successfully.",
      review,
    });
  } catch (error) {
    console.error("[ADMIN_REVIEWS_PATCH_ERROR]", error);

    return NextResponse.json(
      { success: false, message: "Unable to update review." },
      { status: 500 }
    );
  }
}
