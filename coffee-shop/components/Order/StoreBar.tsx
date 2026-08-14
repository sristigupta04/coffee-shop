

import { useState } from "react";

type store ={
  location:string;
  DineIn:string;
  Takeway:string;
}

export default function Store({
  location, DineIn,Takeway
}:store){
  const [error, seterror] = useState("");
  const [cord,setcord] =useState({lat:0 ,lng:0});
  const [order,setorder] = useState("dineIn");

  const storage = ["location","DineIn","Takeway"];
  const geoLocation =()=>{
    if(!navigator.geolocation){
      seterror("your location is invalid");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setcord({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (err) => {
        seterror(`Error: ${err.message}`);
      }
    )}
    
  return(
<div className="flex items-center justify-between gap-4 rounded-xl bg-white p-4 shadow-sm">
<button onClick={geoLocation} 
className="flex item-center gap-2 rounded-e-2xl bg-[#6f4e37] px-4 py-2"
> Location

</button>


  {cord.lat !== 0 && (
    <p className="mt-2 text-sm text-gray-600">
      Location:{cord.lat.toFixed(4) },{cord.lng.toFixed(4)}</p>

  )}


<div className="flex  rounded-2xl bg-[$f5eee8] p-1">
  {error && (
    <p className="mt-2 text-sm text-red-500">
      {error}
    </p>
  )}
</div>

 <div className="flex rouned-lg- bg-[#f5eee8] p-1">
<button onClick={()=>setorder("dineIn")}
className={`rounded-2xl px-4 py-2 text-sm ${
  order === "dineIn"?"*:bg-[#6f4e37] text-white":"bg-[#f5eee8] text-gray-700"
}`}>{DineIn}</button>
<button onClick={()=>setorder("takeway")}
className={`rounded-2xl px-4 py-2 text-sm ${
  order === "takeway"?"bg-[#6f4e37] text-white":"bg-[#f5eee8] text-gray-700"
}`}>{Takeway}</button>
</div></div>
  )

}