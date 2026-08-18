

"use client";

import { useState } from "react";
import Offer from "../../components/offers/card";



type Guide ={
    id:number;
    description:string;
    time:string;
    difficulty:string;
    steps:string[];
}

export default  function  Guide(){
    const [guides] = useState<Guide[]>([
        {
            id:1,
            description:"How to Brew the Perfect Cup of Coffee",
            time:"10 minutes",
            difficulty:"Easy",
            steps:[
                "Start with fresh, cold water.",
                "Use the right coffee-to-water ratio.",
                "Grind your coffee beans just before brewing.",
                "Use the right brewing method for your coffee type.",
                "Enjoy your perfect cup of coffee!"
            ]
        },
        {
            id:2,
            description:"How to Make a Latte at Home",
            time:"15 minutes",
            difficulty:"Medium",
            steps:[

                "Brew a shot of espresso.",
                "Steam milk until it's frothy.",
                "Pour the steamed milk over the espresso.",
                "Add any desired flavorings or sweeteners.",
                "Enjoy your homemade latte!"
            ]
        }
    ]);

    const [view, setView] = useState<Guide | null>(null);
        
           return (
<main className="min-h-screen w-full  bg-[#f7f1e8] px-4 py-8 text-[#3e2416]">
    <div className="mx-auto w-full max-w-2xl">
<div>
        <h1 className="text-3xl font-bold">
             your guide to blend with brewing </h1>
        <p className="mt-2 text-sm text-[#7b6252]">
            Learn how to brew the perfect cup of coffee and make delicious lattes at home with our step-by-step guides. 
        </p>
        </div>


        <div className="mt-8 space-y-4">
            {guides.map((guide) => (
                <div key={guide.id} className="rounded-xl bg-[#f7f7f7] p-4">
                    <h2 className="text-lg font-semibold">{guide.description}</h2>
                    <p className="mt-2 text-sm text-[#6B7280]">Time: {guide.time}</p>
                    <p className="mt-2 text-sm text-[#6B7280]">Difficulty: {guide.difficulty}</p>

                    
            <button
  onClick={() => setView(guide)}
  className="mt-4 rounded-xl bg-[#6f472f] px-5 py-2 text-sm font-medium text-white"
>
  View Guide
</button>
</div>
            ))}
            </div>

        {view && (
            <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
<div className="flex items-start justify-between gap-4">
    <h2 className="text-lg font-semibold">{view.description}</h2>

    <button  onClick={()=> setView(null)} className=" shrink-0 text-sm font-medium text-red-600  hover:underline">
        Close
    </button>
</div>



<div className="mt-4 flex gap-4 text-sm text-{#7b6252]">
    <span>Time: {view.time}</span>
    <span>Difficulty: {view.difficulty}</span>
</div>


<h3 className="mt-6 font-semibold">Brewing Steps</h3>

<ol className="mt-2 list-decimal pl-5 text-sm text-[#6B7280]">
    {view.steps.map((step, index) => (
        <li key={index} className="mt-1">{step}</li>
    ))}     
    </ol>
</div>
        )}


    </div>
    </main>
    )
}
