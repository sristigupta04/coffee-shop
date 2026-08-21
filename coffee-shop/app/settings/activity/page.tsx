
"use client";
import { useEffect, useState } from "react";
import Activegrp from "../../../components/activity/Activegrp";

type Activity = {
    id:string;
    title:string;
    description:string;
    time:string;
    date:string;
    createdAt:string;
}
export default function Activity(){
const[ active , setactive] = useState<Activity[]>([]);
const [loading , setloading] = useState<boolean>(false);
const [error , seterror] = useState<string | null>(null);
const [clear, setclear] = useState<boolean>(false);
useEffect(()=>{
    const fetchActivity = async()=>{
        setloading(true);
        try{
            const res = await fetch("/api/settings/activity",{
                credentials:"include",
            });
            const data = await res.json();
            if(!res.ok){
                throw new Error(data.message || "Failed to fetch activity");
            }
            const formatted = (data.data || []).map((activity:any)=>{
                const activityDate = new Date(activity.createdAt);
                return {
                    id:activity.id,
                    title:activity.title,
                    description:activity.description,
                    time:activityDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                    date:activityDate.toLocaleDateString([], {weekday:'long', month:'long', day:'numeric'}),
                    createdAt:activity.createdAt,
                }
            });
            setactive(formatted);
            
        }catch(error){
            seterror("Error fetching activity");
            console.error("Error fetching activity:", error);
        }
        finally{
            setloading(false);
        }
    }   
        fetchActivity();

            
        },[]);

const handleClear = async ()=>{
    const confirm = window.confirm("Are you sure you want to clear all activities?");
    if(!confirm){
        return;
    }
    try{
        setclear(true);
        const res = await fetch("/api/settings/activity",{
            method:"DELETE",
            credentials:"include",
        });
        const data  = await res.json();
        if(!res.ok){
            throw new Error(data.message || "Failed to clear activities");
        }
        setactive([]);
    }catch(error){
        seterror("Error clearing activities");
        console.error("Error clearing activities:", error);
        alert(error instanceof Error ? error.message : "An unknown error occurred");
    }finally{
        setclear(false);
    }

    const today = new Date();
    const todayactive = active.filter((act)=> {const date = new Date(act.createdAt); 
        return(
            date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear()
        )
    });
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayactive = active.filter((act)=> {const date = new Date(act.createdAt);
        return(
            date.getDate() === yesterday.getDate() &&
            date.getMonth() === yesterday.getMonth() &&

            date.getFullYear() === yesterday.getFullYear()
        )
    });
const yesterdaystart = new Date(yesterday);
yesterdaystart.setHours(0,0,0,0);

    const olderactive = active.filter((act)=> {const date = new Date(act.createdAt);
        
      
       

return date < yesterdaystart ;
    });

return(
  <main className="min-h-screen w-full bg-[#f7f1e8] px-4 py-8 text-[#3e2416]">
      <div className="mx-auto w-full max-w-2xl">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              Account Activity
            </h1>

            <p className="mt-2 text-sm text-[#7b6252]">
              Review recent activity on your account
            </p>
          </div>

          {active.length > 0 && (
            <button
              onClick={handleClear}
              disabled={clear}
              className="text-sm font-medium text-red-600 hover:underline disabled:opacity-50"
            >
              {clear? "Clearing..." : "Clear All"}
            </button>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-[#7b6252]">
              Loading activity...
            </p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="rounded-2xl bg-red-50 p-6 text-center text-red-600">
            {error}
          </div>
        )}

        {/* Empty */}
        {!loading && !error && active.length === 0 && (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <div className="text-4xl">🛡️</div>

            <h2 className="mt-4 font-semibold">
              No Recent Activity
            </h2>

            <p className="mt-2 text-sm text-[#7b6252]">
              Your account activity will appear here when
              available.
            </p>
          </div>
        )}

        {/* Activities */}
        {!loading && !error && active.length > 0 && (
          <div className="space-y-8">

            {todayactive.length > 0 && (
              <Activegrp
                title="Today"
                activities={todayactive}
              />
            )}

            {yesterdayactive.length > 0 && (
              <Activegrp
                title="Yesterday"
                activities={yesterdayactive}
              />
            )}

            {olderactive.length > 0 && (
              <Activegrp
                title="Older"
                activities={olderactive}
              />
            )}

          </div>
        )}
      </div>
    </main>
  );

}