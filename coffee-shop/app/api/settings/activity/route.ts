import {NextRequest, NextResponse} from "next/server";
import { getcurrentuser } from "@/app/lib/auth";
import {prisma} from "@/app/lib/prisma";

export async function GET(req:NextRequest){

try{
    const user = await getcurrentuser(req);
    if(!user){
        return NextResponse.json({message:"Unauthorized"}, {status:401});
    }
    const activities = await prisma.accountActivity.findMany({
        where:{
            userId:user.id,
        },
        orderBy:{
            createdAt:"desc",
        },
        take:50,
    });
    return NextResponse.json({
        success:true,
        data:activities,
    },{status:200});
}catch(error){
    console.log(error);
    return NextResponse.json({message:"Internal Server Error"}, {status:500});
}

}


export async function DELETE(req:NextRequest){
    try{
        const user = await getcurrentuser(req);
        if(!user){
            return NextResponse.json({message:"Unauthorized"}, {status:401});
        }
        await prisma.accountActivity.deleteMany({
            where:{
                userId:user.id,
            },
        });
        return NextResponse.json({success:true, message:"Activities deleted successfully"}, {status:200});
    }catch(error){
        console.log(error);
        return NextResponse.json({message:"Internal Server Error"}, {status:500});  
    }
}