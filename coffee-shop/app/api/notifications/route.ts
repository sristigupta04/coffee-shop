import {NextRequest, NextResponse} from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getcurrentuser } from "@/app/lib/auth";


export async function GET(req: NextRequest) {
    try{
        const user = await getcurrentuser();
        if(!user){
            return NextResponse.json({message:"Unauthorized"}, {status:401});
        }
        const notifications = await prisma.notification.findMany({
            where:{
                userId:user.id,
            },
            orderBy:{
                createdAt:"desc",
            },
        });
        const unreadCount = await prisma.notification.count({
            where:{
                userId:user.id,
                isRead:false,
            },
        });
        return NextResponse.json({data:notifications, unreadCount}, {status:200});
    }   
    catch(error){
        console.error("Error fetching notifications:", error);
        return NextResponse.json({message:"Internal Server Error"}, {status:500});
    }
        
}


export async function POST(req: NextRequest) {
    try{
        const user = await getcurrentuser();
        if(!user){
            return NextResponse.json({message:"Unauthorized"}, {status:401});
        }
        if (user.role !== "ADMIN") {
            return NextResponse.json(
                { message: "Forbidden" },
                { status: 403 }
            );
        }
        const body = await req.json();
        const {title, message, userId, type} = body;
        
    if ( !userId || !title?.trim() || !message?.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Title and message are required",
        },
        { status: 400 }
      );
    }
        const notification = await prisma.notification.create({
            data:{
                userId,
                title : title.trim(),
                message : message.trim(),
                ...(type ? {type}: {}),
            },
              
        });
        return NextResponse.json({data:notification}, {status:201});
            }
    
    catch(error){
        console.error("Error creating notification:", error);
        return NextResponse.json({message:"Internal Server Error"}, {status:500});
    }
}

