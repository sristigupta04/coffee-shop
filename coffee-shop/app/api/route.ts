import {NextRequest,NextResponse} from "next/server";
import {prisma} from "@/app/lib/prisma";
import {getcurrentuser} from "@/app/lib/auth";

export async function GET(req:NextRequest){
    try{
        const user = await getcurrentuser(req);
        if(!user){
            return NextResponse.json({success:false,message:"Unauthorized"},{status:401});
        }
        const profile = await prisma.user.findUnique({
            where:{
                id:user.id,
            },
            select:{
                id:true,
                name:true,
                email:true,
                role:true,
                createdAt:true,
                updatedAt:true,
            }
        });
        if(!profile){
            return NextResponse.json({success:false,message:"Profile not found"},{status:404});
        }

        return NextResponse.json({success:true,data:profile},{status:200});
    }
    catch(error){
        console.error("Profile error:",error);
        return NextResponse.json({success:false,message:"Internal server error"},{status:500});
            }
    }



    export async function PUT(req:NextRequest){
        try{
            const user = await getcurrentuser(req);
            if(!user){
                return NextResponse.json({success:false,message:"Unauthorized"},{status:401});
            }
            const body = await req.json();
            const {name,email,password} = body;

            if(!name && !email && !password){
                return NextResponse.json({success:false,message:"Missing required fields"},{status:400});
            }
            if(email && email !== user.email){
                const existingUser = await prisma.user.findUnique({
                    where:{
                        email,
                    }
                });
                if(existingUser){
                    return NextResponse.json({success:false,message:"Email already in use"},{status:400});
                }
                const profile = await prisma.user.update({
                    where:{
                        id:user.id,
                    },
                    data:{
                        name:name ?? user.name,

                        email:email ?? user.email,
                    },
                    select:{
                        id:true,
                        name:true,
                        email:true,
                        role:true,
                        createdAt:true,
                        updatedAt:true,
                    }
                });
                return NextResponse.json({success:true,data:profile},{status:200});
            }
        }catch(error){
                console.error("Profile update error:",error);
                return NextResponse.json({success:false,message:"Internal server error"},{status:500});
            }
        }