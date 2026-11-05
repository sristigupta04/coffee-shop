
import { prisma } from "@/app/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getcurrentuser } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// Admin authorization
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

  return {
    authorized: true,
    status: 200,
    message: "Authorized",
  };
}

// GET Single Category
export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Category ID is required." },
        { status: 400 }
      );
    }

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    if (!category) {
      return NextResponse.json(
        { success: false, message: "Category not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      category,
      data: category,
    });
  } catch (error) {
    console.error("[GET_CATEGORY_ERROR]", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch category." },
      { status: 500 }
    );
  }
}

// UPDATE Category + Activate/Deactivate
export async function PUT(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const auth = await authorizeAdmin();

    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, message: auth.message },
        { status: auth.status }
      );
    }

    const { id } = await params;
    const body = await request.json();

    const existingCategory = await prisma.category.findUnique({
      where: { id },
    });

    if (!existingCategory) {
      return NextResponse.json(
        { success: false, message: "Category not found." },
        { status: 404 }
      );
    }

    // Name
    const name =
      body.name !== undefined
        ? typeof body.name === "string"
          ? body.name.trim()
          : ""
        : existingCategory.name;

    // Description
    const description =
      body.description !== undefined
        ? typeof body.description === "string"
          ? body.description.trim() || null
          : null
        : existingCategory.description;

    // Image
    const image =
      body.image !== undefined
        ? typeof body.image === "string"
          ? body.image.trim() || null
          : null
        : existingCategory.image;

    // Category status
    const isActive =
      body.isActive !== undefined
        ? body.isActive
        : existingCategory.isActive;

    if (typeof isActive !== "boolean") {
      return NextResponse.json(
        { success: false, message: "Invalid category status." },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { success: false, message: "Category name is required." },
        { status: 400 }
      );
    }

    // Generate slug
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    if (!slug) {
      return NextResponse.json(
        { success: false, message: "Invalid category name." },
        { status: 400 }
      );
    }

    // Check duplicate category
    const duplicate = await prisma.category.findFirst({
      where: {
        id: { not: id },
        OR: [
          {
            name: {
              equals: name,
              mode: "insensitive",
            },
          },
          { slug },
        ],
      },
    });

    if (duplicate) {
      return NextResponse.json(
        {
          success: false,
          message: "Another category already uses this name.",
        },
        { status: 409 }
      );
    }

    // Update category
    const updatedCategory = await prisma.category.update({
      where: { id },
      data: {
        name,
        slug,
        description,
        image,
        isActive,
      },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: isActive
        ? "Category updated/activated successfully."
        : "Category updated/deactivated successfully.",
      category: updatedCategory,
      data: updatedCategory,
    });
  } catch (error) {
    console.error("[UPDATE_CATEGORY_ERROR]", error);

    return NextResponse.json(
      { success: false, message: "Failed to update category." },
      { status: 500 }
    );
  }
}

// DELETE Category - Safe Deactivation
export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const auth = await authorizeAdmin();

    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, message: auth.message },
        { status: auth.status }
      );
    }

    const { id } = await params;

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    if (!category) {
      return NextResponse.json(
        { success: false, message: "Category not found." },
        { status: 404 }
      );
    }

    if (!category.isActive) {
      return NextResponse.json({
        success: true,
        message: "Category is already inactive.",
        category,
      });
    }

    // Prevent deactivation if products are assigned
    if (category._count.products > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `This category has ${category._count.products} products. Reassign those products before deactivating it.`,
        },
        { status: 409 }
      );
    }

    const updatedCategory = await prisma.category.update({
      where: { id },
      data: {
        isActive: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Category deactivated successfully.",
      category: updatedCategory,
      data: updatedCategory,
    });
  } catch (error) {
    console.error("[DEACTIVATE_CATEGORY_ERROR]", error);

    return NextResponse.json(
      { success: false, message: "Unable to deactivate category." },
      { status: 500 }
    );
  }
}
