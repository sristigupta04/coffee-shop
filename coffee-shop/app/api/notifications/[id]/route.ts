import {NextRequest, NextResponse} from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getcurrentuser } from "@/app/lib/auth";
type params ={
    params:Promise<{id:string}>
}

export async function GET(req:NextRequest, {params}:params){
    try{
        const {id} = await params;
        const user = await getcurrentuser(req);
        if(!user){
            return NextResponse.json({message:"Unauthorized"}, {status:401});
        }
        const body = await req.json();
        const {isRead} = body;

        if(typeof isRead === "boolean"){
            return NextResponse.json({message:"Invalid request body"}, {status:400});
        }

            const notifications = await prisma.Notification.FindFirst({
                where:{
                    id,
                    userId:user.id,
                },
            });


      
        if(!notifications){
            return NextResponse.json({message:"Notification not found"}, {status:404});
        }
        const update = await prisma.Notification.update({
            where:{
                id,
            },
            data:{
                isRead,
            },
        });
        return NextResponse.json({data:update}, {status:200});
    }
    catch(error){
        console.error("Error updating notification:", error);
        return NextResponse.json({message:"Internal Server Error"}, {status:500});
    }

}


 export async function DELETE(req:NextRequest, {params}:params){
    try{
        const {id}  = await params;
        const user = await getcurrentuser(req);
        if(!user){
            return NextResponse.json({message:"Unauthorized"}, {status:401});
        }
        const notifications = await prisma.Notification.findFirst({
            where:{
                id,
                userId:user.id,
            },
        });
        if(!notifications){
            return NextResponse.json({message:"Notification not found"}, {status:404});
        }
        await prisma.Notification.delete({
            where:{
                id,
            },
        });
        return NextResponse.json({message:"Notification deleted"}, {status:200});
    }catch(error){
        console.error("Error deleting notification:", error);
        return NextResponse.json({message:"Internal Server Error"}, {status:500});
    }
}