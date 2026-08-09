import { prisma } from "@/app/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET All Products
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const {id }= await params;
    const products = await prisma.product.findUnique({
      where:{
        id:id,
      }
    });
if(!products){
    return NextResponse.json(
      {
        success: false,
        message: "Product not found",
      },
      { status: 404 }
    );
  }
}catch(error) {
    return NextResponse.json(
      {
        success: false,
        message:"internal server error",
      },
      { status: 500 }
    );
  }

}