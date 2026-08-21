import {NextRequest, NextResponse} from "next/server";

import {connectClient} from "@/app/lib/redis";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const redis = await connectClient();
    
await redis.lPush("coffee-jobs", JSON.stringify(body));
        return NextResponse.json({status: "success"});
    } catch (error) {
        console.error("Error occurred while enqueuing message:", error);
        return NextResponse.json({status: "error"}, {status: 500});
    }
}

