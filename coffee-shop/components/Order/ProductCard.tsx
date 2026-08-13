"use client"

import {useState} from "react";

type product = {
    image:string;
    name:string;
    description:string;
    price:string;
}


type categoryProduct ={
    product:product
}

export default function Product({
    product
}:categoryProduct){
    const [quant,setquant] = useState(0);
 const {image,name, description,price} = product;

 const increase = ()=>{
    setquant((prev)=>Math.min(100,prev+1))
 }
const decrease = ()=>{
    setquant((prev)=>Math.max(10,prev+1))
};


}