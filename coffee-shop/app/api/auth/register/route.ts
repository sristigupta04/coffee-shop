
import {NextResponse, NextRequest} from "next/server";
import { prisma } from "@/app/lib/prisma";

import bcrypt from "bcryptjs";


export async function POST(req:NextRequest){
    try{
        const body = await req.json();
        const {email,phone, password, name } = body;
        if(!name || !password || (!email && !phone)){
            return NextResponse.json({message:"Missing required fields"}, {status:400});
        }

        if(password.length < 6){
            return NextResponse.json({message:"Password must be at least 6 characters long"}, {status:400});
        }

        const cleanName = String(name).trim();
        const cleanEmail = email ? String(email).trim().toLowerCase() : null;
        let cleanPhone = phone ? String(phone).trim() : null;
        if(cleanEmail){
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if(!emailRegex.test(cleanEmail)){
                return NextResponse.json({message:"Invalid email format"}, {status:400});
            }

        }
        if(cleanPhone){
            const phoneRegex = /^\+?[1-9]\d{1,14}$/;
            if(!phoneRegex.test(cleanPhone)){
                return NextResponse.json({message:"Invalid phone format"}, {status:400});
            }
        }
        if(cleanEmail){
            const existingUserByEmail = await prisma.user.findUnique({
                where:{
                    email: cleanEmail,
                }
            });
            if(existingUserByEmail){
                return NextResponse.json({message:"User with this email already exists"}, {status:400});
            }
        }
        if(cleanPhone){
            const existingPhoneUser = await prisma.user.findFirst({
                where:{
                    phone: cleanPhone,
                }
            });
            if(existingPhoneUser){
                return NextResponse.json({message:"User with this phone already exists"}, {status:400});
            }

        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data:{
                email: cleanEmail,
                phone: cleanPhone,
                name: cleanName,
                password: hashedPassword,
            }
        });
        
        return NextResponse.json({message:"User created successfully", data:user}, {status:201});
    }
    catch(error){
        console.error("Registration error:", error);
        return NextResponse.json({message:"Internal server error"}, {status:500})
    }
   
}
        