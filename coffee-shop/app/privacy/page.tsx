"use client";

import { useState } from "react";



type Data ={
    id:number;
    name:string;
    description:string;
    Phone:string;
    Address:string;
    Information:string;
}

type DataProp ={
    Info:Data[];
}
export default function Privacy({ Info }:DataProp){
           const [data] = useState<Data[]>([
            {
                id:1,
                name:"Privacy Policy",
                description:"We value your privacy and are committe to protecting your personal information. This Privacy Policy outlines how we collect, use, and safeguard your data when you interact with our coffee shop.",
                Phone:"123-456-7890",
                Address:"123 Coffee Street, Brewtown, USA",
                Information:"We collect personal information such as your name, email address, and payment details when you make a purchase or sign up for our newsletter. This information is used solely for processing orders and providing a personalized experience."
            }
           ])

const [pay, setpay] = useState(false);
const [order, setorder] = useState(false);
const [download, setdownload] = useState(false);
const [contact, setcontact] = useState(false);
const [cookies, setcookies] = useState(false);
const [security, setsecurity] = useState(false);
const [deletee, setdeletee] = useState(false);
const [view , setview] = useState(false);


const handleDelete =(id:number)=>{
    if(data.id === id){
        setdeletee(false);
    }

}
const handleview =(id:number)=>{
    if(data[0].id === id){
        setview(false);
    }

}