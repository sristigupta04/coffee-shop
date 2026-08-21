import { prisma } from "@/app/lib/prisma";
import { auth } from "@/auth";


export async  function getcurrentuser(){
  const session = await auth();
  if(!session?.user?.id){
    return null;
  }
    const user = await prisma.user.findUnique({
        where:{
            id:session.user.id,  
        },
        select:{
            id:true,
            email:true,





            
            name:true,
            role:true,
            phone: true,
      image: true
        }
    });
    return user;

}