
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/app/lib/prisma";
import { getcurrentuser } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

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

// GET: Rewards dashboard and customer loyalty accounts
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

    const parsedPage = Number.parseInt(params.get("page") || "1", 10);
    const parsedLimit = Number.parseInt(params.get("limit") || "10", 10);

    const page = Math.max(1, Number.isFinite(parsedPage) ? parsedPage : 1);
    const limit = Math.min(
      50,
      Math.max(1, Number.isFinite(parsedLimit) ? parsedLimit : 10)
    );

    const where = search
      ? {
          user: {
            OR: [
              {
                name: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
              {
                email: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
              {
                phone: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
            ],
          },
        }
      : {};

    const [
      accounts,
      filteredAccounts,
      totalMembers,
      totalPoints,
      earnedTransactions,
      redeemedTransactions,
      expiredTransactions,
      totalTransactions,
    ] = await Promise.all([
      prisma.rewardAccount.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              image: true,
              createdAt: true,
            },
          },
        },
        orderBy: {
          points: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,
      }),

      prisma.rewardAccount.count({ where }),

      prisma.rewardAccount.count(),

      prisma.rewardAccount.aggregate({
        _sum: { points: true },
      }),

      prisma.rewardTransaction.aggregate({
        where: { type: "EARNED" },
        _sum: { points: true },
        _count: { _all: true },
      }),

      prisma.rewardTransaction.aggregate({
        where: { type: "REDEEMED" },
        _sum: { points: true },
        _count: { _all: true },
      }),

      prisma.rewardTransaction.aggregate({
        where: { type: "EXPIRED" },
        _sum: { points: true },
        _count: { _all: true },
      }),

      prisma.rewardTransaction.count(),
    ]);

    return NextResponse.json({
      success: true,
      accounts,
      summary: {
        totalMembers,
        totalPoints: totalPoints._sum.points ?? 0,
        totalEarnedPoints: earnedTransactions._sum.points ?? 0,
        totalRedeemedPoints: redeemedTransactions._sum.points ?? 0,
        totalExpiredPoints: expiredTransactions._sum.points ?? 0,
        earnedTransactions: earnedTransactions._count._all,
        redeemedTransactions: redeemedTransactions._count._all,
        expiredTransactions: expiredTransactions._count._all,
        totalTransactions,
      },
      pagination: {
        page,
        limit,
        total: filteredAccounts,
        totalPages: Math.max(1, Math.ceil(filteredAccounts / limit)),
      },
    });
  } catch (error) {
    console.error("[ADMIN_REWARDS_GET_ERROR]", error);

    return NextResponse.json(
      { success: false, message: "Unable to fetch rewards data." },
      { status: 500 }
    );
  }
}

// POST: Manually adjust customer reward points
export async function POST(request: NextRequest) {
  try {
    const auth = await authorizeAdmin();

    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, message: auth.message },
        { status: auth.status }
      );
    }

    const body = await request.json();

    const userId =
      typeof body.userId === "string" ? body.userId.trim() : "";

    const points = Number(body.points);

    const description =
      typeof body.description === "string"
        ? body.description.trim()
        : "";

    if (!userId || !Number.isSafeInteger(points) || points === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Valid customer ID and non-zero whole points are required.",
        },
        { status: 400 }
      );
    }

    if (Math.abs(points) > 100000) {
      return NextResponse.json(
        {
          success: false,
          message: "Point adjustment exceeds the allowed limit.",
        },
        { status: 400 }
      );
    }

    if (!description || description.length > 500) {
      return NextResponse.json(
        {
          success: false,
          message: "A valid adjustment reason is required (maximum 500 characters).",
        },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Customer not found." },
        { status: 404 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      let account;

      if (points > 0) {
        account = await tx.rewardAccount.upsert({
          where: { userId },
          create: {
            userId,
            points,
          },
          update: {
            points: {
              increment: points,
            },
          },
        });
      } else {
        const deduction = Math.abs(points);

        // Atomic balance check and deduction.
        // Prevents negative balances and concurrent over-deductions.
        const updated = await tx.rewardAccount.updateMany({
          where: {
            userId,
            points: {
              gte: deduction,
            },
          },
          data: {
            points: {
              decrement: deduction,
            },
          },
        });

        if (updated.count === 0) {
          throw new Error("INSUFFICIENT_REWARD_POINTS");
        }

        const updatedAccount = await tx.rewardAccount.findUnique({
          where: { userId },
        });

        if (!updatedAccount) {
          throw new Error("REWARD_ACCOUNT_NOT_FOUND");
        }

        account = updatedAccount;
      }

      const transaction = await tx.rewardTransaction.create({
        data: {
          userId,
          points: Math.abs(points),
          type: "ADJUSTMENT",
          description: `${points > 0 ? "Added" : "Deducted"} ${Math.abs(
            points
          )} points: ${description}`,
        },
      });

      return { account, transaction };
    });

    return NextResponse.json({
      success: true,
      message: "Reward points adjusted successfully.",
      data: result,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "INSUFFICIENT_REWARD_POINTS"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Customer does not have enough points for this deduction.",
        },
        { status: 400 }
      );
    }

    if (
      error instanceof Error &&
      error.message === "REWARD_ACCOUNT_NOT_FOUND"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Customer reward account was not found.",
        },
        { status: 404 }
      );
    }

    console.error("[ADMIN_REWARDS_POST_ERROR]", error);

    return NextResponse.json(
      { success: false, message: "Unable to adjust reward points." },
      { status: 500 }
    );
  }
}
