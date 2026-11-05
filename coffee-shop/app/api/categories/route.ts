
import { prisma } from "@/app/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getcurrentuser } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

// GET Categories
export async function GET() {
  try {
    const user = await getcurrentuser();

    const categories = await prisma.category.findMany({
      where:
        user?.role === "ADMIN"
          ? {}
          : { isActive: true },
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      categories,
      data: categories,
    });
  } catch (error) {
    console.error("[GET_CATEGORIES_ERROR]", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch categories." },
      { status: 500 }
    );
  }
}
// POST Category (Admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await getcurrentuser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Authentication required." },
        { status: 401 }
      );
    }

    if (user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Admin access required." },
        { status: 403 }
      );
    }

    const body = await request.json();

    const name =
      typeof body.name === "string" ? body.name.trim() : "";

    const description =
      typeof body.description === "string"
        ? body.description.trim()
        : null;

    const image =
      typeof body.image === "string" ? body.image.trim() : null;

    if (!name) {
      return NextResponse.json(
        { success: false, message: "Category name is required." },
        { status: 400 }
      );
    }

    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    if (!slug) {
      return NextResponse.json(
        { success: false, message: "Invalid category name." },
        { status: 400 }
      );
    }

    const existing = await prisma.category.findFirst({
      where: {
        OR: [
          { name: { equals: name, mode: "insensitive" } },
          { slug },
        ],
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, message: "Category already exists." },
        { status: 409 }
      );
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        description,
        image,
        isActive: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Category created successfully.",
        category,
        data: category,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[CREATE_CATEGORY_ERROR]", error);

    return NextResponse.json(
      { success: false, message: "Failed to create category." },
      { status: 500 }
    );
  }
}
