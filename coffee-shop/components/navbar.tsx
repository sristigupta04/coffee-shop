"use client";

import Link from "next/link";
export default function Navbar(){
    return(
        <nav>
            <Link href="/">Home</Link>
            <Link href="/menu">Menu</Link>
            <Link href="/contact">Contact</Link>
            <Link href='/login'>Login</Link>
            <Link href='/orders'>Orders</Link>
        </nav>
    )
}
   
