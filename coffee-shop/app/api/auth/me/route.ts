import {NextRequest,NextResponse} from "next/server";
import {prisma} from "@/app/lib/prisma";


export async function GET(req:NextRequest){
    try{
        const userId = req.cookies.get("userId")?.value;
        if(!userId){
            return NextResponse.json({
                success:false,
                message:"userId is required in header",
            },{status:400});
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
            createdAt:true,
        }
    });

    if(!user){
        return NextResponse.json({
            success:false,
            message:"user not found",
        },{status:404});
    }
    return NextResponse.json({
        success:true,
        message:"user found",
        data:user,
    },{status:200});
}catch(error){
    console.error("GET USER ERROR:", error);
    return NextResponse.json({
        success:false,
        message:"internal server error",
    },{status:500});
}
}