import {prisma} from "@/app/lib/prisma";

export async function GET(userId:string, title:string, message:string , type?:string){


    try{
        const notifications = await prisma.Notification.create({
                data:{
                    userId,
                    title,
                    message,
                    type:type|| "GENERAL",
                },
            });
            return notifications;
    }
    catch(error){
        console.error("Error creating notification:", error);
      
    
    return null;
                }
            }