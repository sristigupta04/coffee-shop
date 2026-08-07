import { prisma } from "@/app/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET All Products
export async function GET() {
  try {
    const products = await prisma.product.findMany();

    return NextResponse.json(
      {
        success: true,
        data: products,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Internal Server Error",
      },
      { status: 500 }
    );
  }
}

// Add Product
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      name,
      description,
      price,
      imageUrl,
      categoryId,
    } = body;

    // Validation
    if (
      !name ||
      !description ||
      !price ||
      !imageUrl ||
      !categoryId
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "All fields are required",
        },
        { status: 400 }
      );
    }

    // Check Duplicate
    const existingProduct = await prisma.product.findFirst({
      where: {
        name,
      },
    });

    if (existingProduct) {
      return NextResponse.json(
        {
          success: false,
          message: "Product already exists",
        },
        { status: 409 }
      );
    }

    // Create Product
    const newProduct = await prisma.product.create({
      data: {
        name,
        description,
        price,
        imageUrl,
        categoryId,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Product added successfully",
        data: newProduct,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Internal Server Error",
      },
      { status: 500 }
    );
  }
}