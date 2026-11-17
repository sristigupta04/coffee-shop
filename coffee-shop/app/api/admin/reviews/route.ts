
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getcurrentuser } from "@/app/lib/auth";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const PAGE_SIZE_MAX = 100;
const REVIEW_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
type ReviewStatus = (typeof REVIEW_STATUSES)[number];

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ success: false, message }, { status });
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

async function parseBody(request: NextRequest) {
  try {
    const body: unknown = await request.json();

    if (
      typeof body !== "object" ||
      body === null ||
      Array.isArray(body)
    ) {
      return null;
    }

    return body as Record<string, unknown>;
  } catch {
    return null;
  }
}

// GET: Reviews list, search, filters, pagination and summary
export async function GET(request: NextRequest) {
  try {
    const auth = await authorizeAdmin();
    if (!auth.authorized) return auth.response;

    const params = request.nextUrl.searchParams;
    const search = (params.get("search") || "").trim();
    const status = (params.get("status") || "ALL").toUpperCase();
    const pageValue = Number(params.get("page") || 1);
    const limitValue = Number(params.get("limit") || 10);

    if (search.length > 200) {
      return errorResponse("Search cannot exceed 200 characters.");
    }

    if (
      status !== "ALL" &&
      !REVIEW_STATUSES.includes(status as ReviewStatus)
    ) {
      return errorResponse("Invalid review status.");
    }

    if (
      !Number.isSafeInteger(pageValue) ||
      pageValue < 1 ||
      !Number.isSafeInteger(limitValue) ||
      limitValue < 1
    ) {
      return errorResponse("Invalid pagination values.");
    }

    const page = pageValue;
    const limit = Math.min(limitValue, PAGE_SIZE_MAX);

    const where: Prisma.ReviewWhereInput = {
      ...(status !== "ALL"
        ? { status: status as ReviewStatus }
        : {}),
      ...(search
        ? {
            OR: [
              {
                comment: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                user: {
                  is: {
                    name: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                },
              },
              {
                user: {
                  is: {
                    email: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                },
              },
              {
                product: {
                  is: {
                    name: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [
      reviews,
      totalFiltered,
      totalReviews,
      pendingReviews,
      approvedReviews,
      rejectedReviews,
      ratingSummary,
    ] = await Promise.all([
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
        orderBy: [
          { createdAt: "desc" },
          { id: "desc" },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),

      prisma.review.count({ where }),
      prisma.review.count(),
      prisma.review.count({ where: { status: "PENDING" } }),
      prisma.review.count({ where: { status: "APPROVED" } }),
      prisma.review.count({ where: { status: "REJECTED" } }),

      prisma.review.aggregate({
        where: { status: "APPROVED" },
        _avg: { rating: true },
        _count: { rating: true },
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalFiltered / limit));

    return NextResponse.json({
      success: true,
      reviews,
      summary: {
        totalReviews,
        pendingReviews,
        approvedReviews,
        rejectedReviews,
        averageRating: Number(ratingSummary._avg.rating ?? 0),
        ratedReviews: ratingSummary._count.rating,
      },
      pagination: {
        page,
        limit,
        totalRecords: totalFiltered,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Admin reviews GET error:", error);
    return errorResponse("Failed to fetch reviews.", 500);
  }
}

// PATCH: Approve or reject a review
export async function PATCH(request: NextRequest) {
  try {
    const auth = await authorizeAdmin();
    if (!auth.authorized) return auth.response;

    const body = await parseBody(request);

    if (!body) {
      return errorResponse("Invalid JSON request body.");
    }

    const id =
      typeof body.id === "string" ? body.id.trim() : "";

    const status = body.status;

    if (!id) {
      return errorResponse("Review ID is required.");
    }

    if (
      status !== "APPROVED" &&
      status !== "REJECTED"
    ) {
      return errorResponse(
        "Review status must be APPROVED or REJECTED."
      );
    }

    const result = await prisma.review.updateMany({
      where: {
        id,
        status: "PENDING",
      },
      data: {
        status,
      },
    });

    if (result.count === 0) {
      const existing = await prisma.review.findUnique({
        where: { id },
        select: { id: true, status: true },
      });

      if (!existing) {
        return errorResponse("Review not found.", 404);
      }

      return errorResponse(
        `This review is already ${existing.status.toLowerCase()}. Refresh the page and try again.`,
        409
      );
    }

    const review = await prisma.review.findUnique({
      where: { id },
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
    console.error("Admin reviews PATCH error:", error);
    return errorResponse("Failed to update review.", 500);
  }
}
