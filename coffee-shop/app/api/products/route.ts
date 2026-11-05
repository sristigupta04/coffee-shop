
import { prisma } from "@/app/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getcurrentuser } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

// GET Products
export async function GET() {
  try {
    const user = await getcurrentuser();
    const isAdmin = user?.role === "ADMIN";

    const products = await prisma.product.findMany({
      where: isAdmin
        ? {}
        : {
            isAvailable: true,
          },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(
      {
        success: true,
        products,
        data: products,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[GET_PRODUCTS_ERROR]", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch products.",
      },
      { status: 500 }
    );
  }
}

// POST Create Product
export async function POST(req: NextRequest) {
  try {
    const user = await getcurrentuser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 }
      );
    }

    if (user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Admin access required." },
        { status: 403 }
      );
    }

    const body = await req.json();

    const name =
      typeof body.name === "string" ? body.name.trim() : "";

    const description =
      typeof body.description === "string"
        ? body.description.trim()
        : "";

    const image =
      typeof body.image === "string" ? body.image.trim() : "";

    const category =
      typeof body.category === "string" ? body.category.trim() : "";

    const price = Number(body.price);
    const stock =
      body.stock === undefined || body.stock === null
        ? 0
        : Number(body.stock);

    if (!name || !description || !image || !category) {
      return NextResponse.json(
        {
          success: false,
          message: "Name, description, image and category are required.",
        },
        { status: 400 }
      );
    }

    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json(
        { success: false, message: "Enter a valid product price." },
        { status: 400 }
      );
    }

    if (!Number.isInteger(stock) || stock < 0) {
      return NextResponse.json(
        { success: false, message: "Stock must be a non-negative integer." },
        { status: 400 }
      );
    }

    const existingProduct = await prisma.product.findFirst({
      where: {
        name: {
          equals: name,
          mode: "insensitive",
        },
      },
    });

    if (existingProduct) {
      return NextResponse.json(
        { success: false, message: "Product already exists." },
        { status: 409 }
      );
    }

    const newProduct = await prisma.product.create({
      data: {
        name,
        description,
        price,
        image,
        category,
        stock,
        isAvailable: body.isAvailable ?? true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Product added successfully.",
        product: newProduct,
        data: newProduct,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[CREATE_PRODUCT_ERROR]", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create product.",
      },
      { status: 500 }
    );
  }
}
