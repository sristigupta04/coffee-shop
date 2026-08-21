import {NextRequest, NextResponse} from "next/server";

import {connectClient} from "@/app/lib/redis";


export async function POST(req: NextRequest) {
    try{
        const body = await req.json();
        const redis = await connectClient();
await redis.lPush("coffee-jobs", JSON.stringify(body));
        return NextResponse.json({message: "Request enqueued successfully"}, {status: 200});    
    }catch(error){
        console.error("Error enqueuing request:", error);
        return NextResponse.json({message: "Failed to enqueue request"}, {status: 500});
    }
}