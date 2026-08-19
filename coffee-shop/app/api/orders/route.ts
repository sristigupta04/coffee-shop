import { prisma } from "@/app/lib/prisma";
import { NextResponse , NextRequest} from "next/server";
import { getcurrentuser } from "@/app/lib/auth";


export async function GET(req: NextRequest) {
  try {
    const user = await getcurrentuser(req);
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const orders = await prisma.order.findMany({
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: orders,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Orders fetch error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Internal Server Error",
      },
      { status: 500 }
    );
  }
}


export async function POST(req: NextRequest) {
  try{
    const user = await getcurrentuser(req);
    if(!user){
      return NextResponse.json({success:false,message:"Unauthorized"},{status:401});
    }
    const cart = await prisma.cart.findUnique({
      where:{
        userId:user.id,
      },
      include:{
        items:{
          include:{
            product:true,
          },
        },
      },
    });


    if(!cart || cart.items.length === 0){
      return NextResponse.json({success:false,message:"Cart is empty"},{status:400});
    }
    for (const item of cart.items){
      if(!item.product.isAvailable){
        return NextResponse.json({success:false,message:`Product ${item.product.name} is not available`},{status:400});
      }

      if(item.quantity > item.product.stock){
        return NextResponse.json({success:false,message:`Product ${item.product.name} does not have enough stock`},{status:400});
      }
      const totalPrice = cart.items.reduce((acc, item) => acc + item.quantity * item.product.price, 0);
      const order = await prisma.$transaction(async(tx)=>{
        const neworder = await tx.order.create({
          data:{
            userId:user.id,
            totalPrice,
            status:"pending",
            items:{
              create:cart.items.map((item)=>({
              productId:item.productId,
              quantity:item.quantity,
              price:item.product.price
            })),
          },
          },
        include:{
          items:{
            include:{
              product:true,
            }
          }
        }
      });

      for (const item of cart.items){
      await tx.product.update({
        where:{
           id:item.productId
        },
        data:{
          stock:{
            decrement:item.quantity,
          }
        }
      });
    }
  
    await tx.cartItem.deleteMany({
      where:{
        cartId:cart.id,
      },
    });
    return neworder;
  });
  return NextResponse.json({success:true,data:order},{status:201});
  } catch (error) {
    console.error("Order creation error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
}