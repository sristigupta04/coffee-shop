import {    NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";


export async  function getcurrentuser(req:NextRequest){
    const userId = req.cookies.get("userId")?.value;
    if(!userId){
        return null;
    }
    const user = await prisma.user.findUnique({
        where:{
            id:userId,  
        },
        select:{
            id:true,
            email:true,
            name:true,
            role:true,
        }
    });
    return user;

}