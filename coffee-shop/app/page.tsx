"use client";
import Link from "next/link";
import Navbar from "@/components/navbar";
import Btn from "@/components/Button";
import CartItem from "@/components/CartItem";
import MenuCard from "./menu/page";
import input from "@/components/input";
import login from "./login/page";
import Register from "./register/page";
export default function Home() {

  return (
    <div className="flex flex-col flex-1 items-center justify-center gap-4">
  
<Btn text="Click me" onClick={() => console.log("Button clicked!")} />
   <MenuCard
  image="/coffee/cappuccino.jpg"
  title="Cappuccino"
  category="Espresso"
  description="Rich and creamy coffee."
  price={249}
  rating={4.8}
  isAvailable={true}
  onAddToCart={() => console.log("Added")}
/>
<input 
type="text"
placeholder="Enter your name"
value=""
onChange={(newValue) => console.log("Input changed:", newValue)}
/>
<login
email=""
password=""
/>
<Register/>    </div>
  );
}