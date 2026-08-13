type storeBar ={
    location:string;
    takeaway:string;
    dineIn:string;
}
import { useState } from "react";
export default function StoreBar({location, takeaway, dineIn}:storeBar) {
const [coords, setCoords] = useState({ lat: 0, lng: 0 });
const [error, setError] = useState("");
const [order,orderchange] = useState("dineIn");
const store =["location", "takeaway","dine-in"];
const geolocation =() =>{
    if(!navigator.geolocation){
        setError("your location not found");
        return;
    }
     navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (err) => {
        setError(`Error: ${err.message}`);
      }
    );
};

    
  
   
return(
    <div>
  <nav className="contain-content">
<div onClick={geolocation} className="flex"
> getLocation</div>

        {coords.lat !== 0 && (
          <p className="mt-2 text-sm text-gray-600">
            Location: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
          </p>
        )}

        {error && (
          <p className="mt-2 text-sm text-red-500">
            {error}
          </p>
        )}
        </div>

    {/* //   {ordertype?} */}

    <div>
<select 
value={order}
onChange={(e)=>orderchange(e.target.value)}
>
    <option value="dineIn">{dineIn}</option>
    <option value="takeaway">{takeaway}</option>
</select>
    </div>
  </nav>
  </div>
//   </main>?
)

}