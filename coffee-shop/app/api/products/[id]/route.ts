import { prisma } from "@/app/lib/prisma";
import { NextResponse , NextRequest} from "next/server";

// GET All Products
type params ={
  params: Promise<{id:string}>
}
export async function GET(req: NextRequest, {params}:params){
  try{
  const {id} = await params;
  
    const product = await prisma.product.findUnique({
      where:{
        id,
      }
    });

    if(!product){
      return NextResponse.json({
        success:false,
        msg:"product not found",
      },
      {status:404});
    }
    return NextResponse.json({
      success:true,
      msg:"product founded",
      data: product
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

export async function PUT(req: NextRequest, {params}:params){
  try{
    const body = await req.json();
    const {name,description,price,category,image} = body;
    const {id} = await params;
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
      isAvailable:body.isAvailable ?? val.isAvailable,
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

export async function DELETE(req:NextRequest, {params}:params){
try{
  const {id} = await params;
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


