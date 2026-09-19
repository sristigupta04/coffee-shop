import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/app/lib/prisma";


// GET — Product ke reviews
export async function GET(req: NextRequest) {
  try {
    const productId = req.nextUrl.searchParams.get("productId");

    if (!productId) {
      return NextResponse.json(
        {
          success: false,
          message: "Product ID is required",
        },
        { status: 400 }
      );
    }

    const reviews = await prisma.review.findMany({
      where: {
        productId,
        status: "APPROVED",
      },
      include: {
        user: {
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
      data: reviews,
    });
  } catch (error) {
    console.error("Error fetching reviews:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch reviews",
      },
      { status: 500 }
    );
  }
}


// POST — Review submit
export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Please login to submit a review",
        },
        { status: 401 }
      );
    }

    const body = await req.json();

    const { productId, rating, comment } = body;

    if (!productId || rating === undefined) {
      return NextResponse.json(
        {
          success: false,
          message: "Product ID and rating are required",
        },
        { status: 400 }
      );
    }

    const reviewRating = Number(rating);

    if (
      !Number.isInteger(reviewRating) ||
      reviewRating < 1 ||
      reviewRating > 5
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Rating must be between 1 and 5",
        },
        { status: 400 }
      );
    }

    // Check product
    const product = await prisma.product.findUnique({
      where: {
        id: productId,
      },
    });

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          message: "Product not found",
        },
        { status: 404 }
      );
    }

    // Check duplicate review
    const existingReview = await prisma.review.findUnique({
      where: {
        userId_productId: {
          userId: session.user.id,
          productId,
        },
      },
    });

    if (existingReview) {
      return NextResponse.json(
        {
          success: false,
          message: "You have already reviewed this product",
        },
        { status: 409 }
      );
    }

    const review = await prisma.review.create({
      data: {
        userId: session.user.id,
        productId,
        rating: reviewRating,
        comment: comment?.trim() || null,
        status: "PENDING",
      },
      include: {
        user: {
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
        message: "Review submitted successfully",
        data: review,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating review:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to submit review",
      },
      { status: 500 }
    );
  }
}