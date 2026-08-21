import {prisma} from "@/app/lib/prisma";


export async function createactive (userId:string, action:string, details?:string){
    try{
        await prisma.accountActivity.create({
            data:{
                userId,
                action,
                details:details || "",
            }
        });
    }catch(error){
        console.error("Error creating activity:", error);
    }
            }
 