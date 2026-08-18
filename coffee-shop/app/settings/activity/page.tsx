
"use client";
import { useState } from "react";
import Activegrp from "../../../components/activity/Activegrp";

type Activity = {
    id:number;
    title:string;
    description:string;
    time:string;
    date:string;
}
export default function Activity(){
const[ active , setactive] = useState<Activity[]>([
 {
    id: 1,
    title: "Logged in",
    description: "Chrome • Windows",
    time: "3:42 PM",
    date: "today",
  },
  {
    id: 2,
    title: "Profile updated",
    description: "Personal information changed",
    time: "2:15 PM",
    date: "today",
  },
  {
    id: 3,
    title: "Payment method added",
    description: "Google Pay",
    time: "1:40 PM",
    date: "today",
  },
])

const handle =()=>{
    setactive([]);
}




return(
 <main className="min-h-screen w-full bg-[#f7f1e8] px-4 py-8 text-[#3e2416]">

    <div className="mx-auto w-full max-w-2xl">



        <div className="mb-8 flex items-center justify-between">
            <div >


                <h1 className="text-3xl font-bold">
                    Account Activity
                </h1>
                <p className="mt-2 text-sm text-[#7b6252]">
                    Review recent activity on your account
                </p>
            </div>

                

                {active.length >0 && (
                    <button onClick={handle} 
                    className="text-sm font-medium text-red-600 hover:underline">
                        Clear All
                    </button>
                )}
        </div>

            {active.length === 0 ? (
                <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
                    <h2 className="font-semibold">
                        No Recent Activity
                    </h2>
                    <p className="mt-2 text-sm text-[#7b6252]">
                        your account activity will appear here when available.
                    </p>
                </div>
            ) : (
                <div className="space-y-8">
                    <Activegrp 
                     title="today" 
                    activities={active.filter((act)=> act.date === "today")} />
                    <Activegrp  title="yesterday" 
                    activities={active.filter((act)=> act.date === "yesterday")} />
                </div>
            )}
            </div>
        
    
    </main>
)



}