import { prisma } from "@/app/lib/prisma";
import { NextResponse } from "next/server";

// GET All Products
export async function GET() {
  try{
    const product = await prisma.product.findMany({
      orderBy:{
        createdAt:"desc"
      }
    });
    return NextResponse.json({
      success:true,
      msg:"product founded",
      products: product
    },
      {status:200});

  }
 
catch(error) {
    return NextResponse.json(
      {
        success: false,
        message:"internal server error",
      },
      { status: 500 }
    );
  }

}