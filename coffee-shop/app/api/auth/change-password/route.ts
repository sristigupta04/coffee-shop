import {  prisma } from "@/app/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getcurrentuser } from "@/app/lib/auth";
import bcrypt from "bcrypt";
import { createactive} from "@/app/lib/activity";


export async function POST(req: NextRequest) {
    try{
const user = await getcurrentuser();
if(!user){
    return NextResponse.json({success:false,message:"Unauthorized"},{status:401});
}
const body = await req.json();
const {currentPassword,newPassword} = body;
if(typeof currentPassword !== "string" ||
  typeof newPassword !== "string" ||
  !currentPassword ||
  !newPassword){
    return NextResponse.json({success:false,message:"Missing required fields"},{status:400});
}
if(newPassword.length < 6){
    return NextResponse.json({success:false,message:"Password must be at least 6 characters"},{status:400});}

    const userData = await prisma.user.findUnique({
        where:{
            id:user.id,
        },
    });
    if(!userData){
        return NextResponse.json({success:false,message:"User not found"},{status:404});
    }
    const isMatch = await bcrypt.compare(currentPassword, userData.password);
    if(!isMatch){
        return NextResponse.json({success:false,message:"Current password is incorrect"},{status:400});
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
        where:{
            id:user.id,
        },
        data:{
            password:hashedPassword,
        },
    });
    await createactive(user.id,"Changed password", "User changed their password successfully");
    return NextResponse.json({success:true,message:"Password changed successfully"},{status:200});
    }
    catch(error){
        console.error("Change password error:",error);
        return NextResponse.json({success:false,message:"Internal server error"},{status:500});
    }
}