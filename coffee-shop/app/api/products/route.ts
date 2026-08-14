import { prisma } from "@/app/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET All Products
export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where:{
        isAvailable:true,
      }
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
      !price ||
      !image||
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
        price,
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

export async function DELETE(req:NextRequest){
try{
  const body = await req.json();
  const {id } = body ;
  if(!id){
    return NextResponse.json(
      {
        success: false,
        message: "Product ID is required",
      },
      { status: 400 }
    );
  }
  const val = await prisma.product.delete({
    where:{
      id:id,
    }
  });
   return NextResponse.json(
    {
      success:true,
      data:val
    },
    {status:200}
   )
}

catch(error){
  return NextResponse.json(
    {
      success:false,
      message:"failed to delete product"
},{status:500}
  )}
   
}


export async function PUT(req: NextRequest) {
    const body = await req.json();
    const {id,name,description,price,category,image} = body;
    try{
      if(!id){
        return NextResponse.json(
          {
            success: false,
            message: "Product ID is required",
          },
          { status: 400 }
        );
      }

      
      const val = await prisma.product.findUnique({
        where:{
          id:id
        }
      });
      if(!val){
        return NextResponse.json(
          {
            success: false,
            message: "Product not found",
          },
          { status: 404 }
        );
      }

          
        const update = await prisma.product.update({
    where:{
      id:id
    },
    data:{
      name:name,
      description:description,
      price: Number(price),
      category:category,
      image:image,
      stock:Number(body.stock) || val.stock,
    }});

    return NextResponse.json({
      success:true,
      message:"product updated",
      data:update
    },{
      status:200
    })

  }catch(error){
    return NextResponse.json(
      {
        success:false,
        message:"Failed to update product"
      },
      {status:500}
    )
  }

}