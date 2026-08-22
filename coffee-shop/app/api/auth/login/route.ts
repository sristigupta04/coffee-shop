
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import bcrypt from "bcryptjs";


export async function POST(req: NextRequest) {
    try{
        const body = await req.json();
        const { email, password } = body;
        if(!email || !password){
            return NextResponse.json({message:"Missing required fields"}, {status:400});
        }
        const user = await prisma.user.findUnique({
            where:{
                email,
            }
        });

        if(!user){
            return NextResponse.json({message:"User not found"}, {status:404});
        }
        const passwordMatch = await bcrypt.compare(password, user.password);
        if(!passwordMatch){
            return NextResponse.json({message:"Invalid credentials"}, {status:401});
        }

        const response = NextResponse.json({message:"Login successful", data:{
            id:user.id,
            email:user.email,
            name:user.name,
            role:user.role,

        }}, {status:200});


        response.cookies.set("userId", user.id,
             {httpOnly:true,
                secure:process.env.NODE_ENV === "production",
                sameSite:"strict",
                maxAge:60*60*24*7, // 7 days
                 path:"/"}
                );
                return response;

    } catch (error) {
        console.error("Login error:", error);
        return NextResponse.json({message:"Internal server error"}, {status:500});
    }

}