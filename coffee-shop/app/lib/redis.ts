import{createClient}from"redis";




const redis=createClient({
    url:process.env.REDIS_URL || "redis://localhost:6379",});

redis.on("error",(err)=>{console.error("Redis Client Error",err)

});

export async function connectClient(){
    if(!redis.isOpen){
        await redis.connect();
        console.log("Redis client connected");
    }
    return redis;
}

export default redis;






















