import {prisma} from "@/app/lib/prisma";

export async function GET(userId:string, title:string, message:string , type?:string){


    try{
        const notifications = await prisma.notification.create({
                data:{
                    userId,
                    title,
                    message,
                
                },
            });
            return notifications;
    }
    catch(error){
        console.error("Error creating notification:", error);
      
    
    return null;
                }
            }