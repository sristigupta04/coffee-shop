"use client";
import Link from "next/link";
import Navbar from "@/components/navbar";
import Btn from "@/components/Button";
export default function Home() {

  return (
    <div className="flex flex-col flex-1 items-center justify-center gap-4">
    
    <Navbar />
     
<Btn text="Click me" onClick={() => console.log("Button clicked!")} />
   
    </div>
  );
}