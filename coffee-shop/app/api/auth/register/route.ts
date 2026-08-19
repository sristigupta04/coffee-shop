
import {NextResponse, NextRequest} from "next/server";
import { prisma } from "@/app/lib/prisma";

import bcrypt from "bcrypt";


export async function POST(req:NextRequest){
    try{
        const body = await req.json();
        const {email, password, name} = body;
        if(!email || !password || !name){
            return NextResponse.json({message:"Missing required fields"}, {status:400});
        }

        if(password.length < 6){
            return NextResponse.json({message:"Password must be at least 6 characters long"}, {status:400});
        }

        const existingUser = await prisma.user.findUnique({
            where:{
                email,
            }
        });
        if(existingUser){
            return NextResponse.json({message:"User already exists"}, {status:400});
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data:{
                email,
                name,
                password:hashedPassword,
            }
        });

        return NextResponse.json({message:"User created successfully", data:user}, {status:201});
    }catch(error){
        console.error("Registration error:", error);
        return NextResponse.json({message:"Internal server error"}, {status:500})
    }
    }
