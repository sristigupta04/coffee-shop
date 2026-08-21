import {NextRequest, NextResponse} from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getcurrentuser } from "@/app/lib/auth";


export async function GET(req: NextRequest) {
    try{
        const user = await getcurrentuser(req);
        if(!user){
            return NextResponse.json({success:false,message:"Unauthorized"},{status:401});
        }
        const setting = await prisma.user.findUnique({
            where:{
                id:user.id,
            },
            select:{
                notificationEnabled:true,
                orderUpdates:true,
                promoEmails:true,
                emailNotifications:true,
            }
        });
        return NextResponse.json({success:true,data:setting});
    } catch (error) {
        return NextResponse.json({success:false,message:"Internal Server Error"},{status:500});
    }
}

export async function PUT(req: NextRequest) {
    try{
        const user = await getcurrentuser(req);
        if(!user){
            return NextResponse.json({success:false,message:"Unauthorized"},{status:401});
        }
        const body = await req.json();
        const {notificationEnabled,orderUpdates,promoEmails,emailNotifications} = body; 
        
        const updatedSetting = await prisma.user.update({
            where:{
                id:user.id,
            },
            data:{
                notificationEnabled,
                orderUpdates,
                promoEmails,
                emailNotifications,
            }
        });
        return NextResponse.json({success:true,data:updatedSetting});
            
    } catch (error) {
        return NextResponse.json({success:false,message:"Internal Server Error"},{status:500});
    }
}