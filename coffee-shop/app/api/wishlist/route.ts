import {NextResponse} from "next/server";
import {auth} from "@/auth";
import {prisma} from "@/app/lib/prisma";


export async function GET(){
    try{
        const session = await auth();
        if(!session?.user?.id){
            return NextResponse.json({message:"Unauthorized"}, {status:401});
        }
        const wishlist = await prisma.wishlistItem.findMany({
            where:{
                userId: session.user.id,
            },
            include:{
                product:true,
            },
            orderBy:{
                createdAt:"desc",
            }
        });
        return NextResponse.json({wishlist}, {status:200});
    } catch (error) {
        console.error("Error fetching wishlist:", error);
        return NextResponse.json({message:"Internal Server Error"}, {status:500});

    }
}
    export async function POST(req:Request){
        try{
            const session = await auth();
            if(!session?.user?.id){
                return NextResponse.json({message:"Unauthorized"}, {status:401});
            }
            const body = await req.json();
            const productId=  String(body.productId || "").trim();
            if(!productId){
                return NextResponse.json({message:"Missing productId"}, {status:400});
            }
            const product  = await prisma.product.findUnique({
                where:{
                    id: productId,
                }
            });
            if(!product){
                return NextResponse.json({message:"Product not found"}, {status:404});
            }
            const existingWishlistItem = await prisma.wishlistItem.findFirst({
                where:{
                    userId: session.user.id,
                    productId: productId,
                }
            });
            if(existingWishlistItem){
                return NextResponse.json({message:"Product already in wishlist"}, {status:400});
            }
            const wishlistItem = await prisma.wishlistItem.create({
                data:{
                    userId: session.user.id,
                    productId: productId,
                }
            });
            return NextResponse.json({wishlistItem}, {status:201});
        } catch (error) {
            console.error("Error adding to wishlist:", error);
            return NextResponse.json({message:"Internal Server Error"}, {status:500});


        }
    }
    export async function DELETE(req:Request){
            try{
                const session = await auth();
                if(!session?.user?.id){
                    return NextResponse.json({message:"Unauthorized"}, {status:401});
                }
                const body = await req.json();
                const {productId} = body;
                if(!productId){
                    return NextResponse.json({message:"Missing productId"}, {status:400});
                }
                const existingItem = await prisma.wishlistItem.findUnique({
                    where:{
                        userId_productId:{
                            userId: session.user.id,
                            productId: productId,
                        }
                    },
                });
                if(!existingItem){
                    return NextResponse.json({message:"Wishlist item not found"}, {status:404});
                }

                const wishlistItem = await prisma.wishlistItem.delete({
                    where:{
                        userId_productId:{
                            userId: session.user.id,
                            productId: productId,
                        }
                    }
                });
                return NextResponse.json({wishlistItem}, {status:200});
            } catch (error) {
                console.error("Error removing from wishlist:", error);
                return NextResponse.json({message:"Internal Server Error"}, {status:500});
            }
        }

    