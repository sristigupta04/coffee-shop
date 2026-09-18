import { prisma } from "@/app/lib/prisma";
import { auth } from "@/auth";

export async function getcurrentuser() {
  const session = await auth();

  console.log("GETCURRENTUSER SESSION:", session);
  console.log("GETCURRENTUSER USER ID:", session?.user?.id);

  if (!session?.user?.id) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      phone: true,
    },
  });

  console.log("GETCURRENTUSER DB USER:", user);

  return user;
}