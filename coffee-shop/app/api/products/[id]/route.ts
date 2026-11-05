
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

// GET Single Product
export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Product ID is required." },
        { status: 400 }
      );
    }

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        customizationGroups: {
          where: { isActive: true },
          include: {
            options: {
              where: { isAvailable: true },
              orderBy: { sortOrder: "asc" },
            },
          },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, message: "Product not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Product fetched successfully.",
      product,
      data: product,
    });
  } catch (error) {
    console.error("[GET_PRODUCT_ERROR]", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch product." },
      { status: 500 }
    );
  }
}

// UPDATE Product
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

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Product ID is required." },
        { status: 400 }
      );
    }

    const body = await request.json();

    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { success: false, message: "Product not found." },
        { status: 404 }
      );
    }

    const name =
      body.name !== undefined
        ? typeof body.name === "string"
          ? body.name.trim()
          : ""
        : existingProduct.name;

    const description =
      body.description !== undefined
        ? typeof body.description === "string"
          ? body.description.trim()
          : ""
        : existingProduct.description;

    const image =
      body.image !== undefined
        ? typeof body.image === "string"
          ? body.image.trim()
          : ""
        : existingProduct.image;

    const categoryId =
      body.categoryId !== undefined
        ? typeof body.categoryId === "string"
          ? body.categoryId.trim()
          : ""
        : existingProduct.categoryId;

    const price =
      body.price !== undefined
        ? Number(body.price)
        : existingProduct.price;

    const stock =
      body.stock !== undefined
        ? Number(body.stock)
        : existingProduct.stock;

    const isAvailable =
      body.isAvailable !== undefined
        ? body.isAvailable
        : existingProduct.isAvailable;

    // Required field validation
    if (!name || !description || !image || !categoryId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Name, description, image and category are required.",
        },
        { status: 400 }
      );
    }

    // Price validation
    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json(
        { success: false, message: "Enter a valid product price." },
        { status: 400 }
      );
    }

    // Stock validation
    if (!Number.isInteger(stock) || stock < 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Stock must be a non-negative integer.",
        },
        { status: 400 }
      );
    }

    if (typeof isAvailable !== "boolean") {
      return NextResponse.json(
        { success: false, message: "Invalid availability value." },
        { status: 400 }
      );
    }

    // Check category exists
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category || !category.isActive) {
      return NextResponse.json(
        {
          success: false,
          message: "Selected category does not exist or is inactive.",
        },
        { status: 400 }
      );
    }

    // Check duplicate product name
    const duplicate = await prisma.product.findFirst({
      where: {
        id: { not: id },
        name: {
          equals: name,
          mode: "insensitive",
        },
      },
    });

    if (duplicate) {
      return NextResponse.json(
        {
          success: false,
          message: "Another product uses this name.",
        },
        { status: 409 }
      );
    }

    // Update product
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        name,
        description,
        image,
        categoryId,
        price,
        stock,
        isAvailable,
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Product updated successfully.",
      product: updatedProduct,
      data: updatedProduct,
    });
  } catch (error) {
    console.error("[UPDATE_PRODUCT_ERROR]", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update product.",
      },
      { status: 500 }
    );
  }
}

// DELETE Product (Soft Delete)
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

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Product ID is required." },
        { status: 400 }
      );
    }

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, message: "Product not found." },
        { status: 404 }
      );
    }

    if (!product.isAvailable) {
      return NextResponse.json(
        {
          success: true,
          message: "Product is already deactivated.",
          product,
        }
      );
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        isAvailable: false,
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Product deactivated successfully.",
      product: updatedProduct,
      data: updatedProduct,
    });
  } catch (error) {
    console.error("[DEACTIVATE_PRODUCT_ERROR]", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to deactivate product.",
      },
      { status: 500 }
    );
  }
}
