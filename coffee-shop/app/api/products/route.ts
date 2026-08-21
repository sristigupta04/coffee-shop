import { prisma } from "@/app/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getcurrentuser } from "@/app/lib/auth";
// GET All Products

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where:{
        isAvailable:true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

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
    const user = await getcurrentuser();
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }
if(!user.role || user.role !== "ADMIN"){
  return NextResponse.json(
    {
      success: false,
      message: "Forbidden",
    },
    { status: 403 }
  );
}

    const body = await req.json();

    const {
      name,
      description,
      price,
      image,
      category,
      stock
    } = body;

    // Validation
    if (
     !name ||
      !description ||
      price === undefined ||
      price === null ||
      !image ||
      !category
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
        price:Number(price),
        image,
        category,
        stock:Number(stock) ||0,
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
