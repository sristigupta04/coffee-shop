import {NextResponse, NextRequest} from "next/server";
import { getcurrentuser } from "@/app/lib/auth";
import {prisma} from "@/app/lib/prisma";

import { createactive } from "@/app/lib/activity";

export async function GET (request:NextRequest){
    try{
        const user =await getcurrentuser(request);
        if(!user){
            return NextResponse.json({message:"Unauthorized"}, {status:401});

        }
        const payment = await prisma.paymentMethod.findMany({
            where:{
                userId:user.id
            }
        });
        return NextResponse.json({
            success:true,
            data:payment,

        },{status:200});
    }catch(error){
        console.log(error);
        return NextResponse.json({message:"Internal Server Error"}, {status:500});
            }
    }

    export async function POST(req:NextRequest){
        try{
            const user = await getcurrentuser(req);
            if(!user){
                return NextResponse.json({message:"Unauthorized"}, {status:401});
            
            }
            const body = await req.json();
            const {type, name, details} = body;
            if(!type || !name || !details){
                return NextResponse.json({message:"Missing required fields"}, {status:400});
            }

            const allowed = ['UPI','CARD','CASH'];
            if(!allowed.includes(type)){
                return NextResponse.json({message:"Invalid payment method"}, {status:400});
            }   

            const exist = await prisma.paymentMethod.count({
                where:{
                    userId:user.id,
                }
            })

            const payment = await prisma.paymentMethod.create({
                data:{
                     userId:user.id,
                    type,
                    name,
                    details,
                   
                    isActive:exist === 0 ? true : false,
                }
            });
            await createactive(user.id,"Added payment method", `User added a new payment method: ${type} - ${name}`);

            return NextResponse.json({
                success:true,
                data:payment,
            },{status:201});
        }catch(error){
            console.log(error);
            return NextResponse.json({message:"Internal Server Error"}, {status:500});
        }
                }