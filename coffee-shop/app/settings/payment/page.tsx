
"use client";
import { useState } from "react";
 type  Pay ={
        id:number;
        type:"UPI"|"Card"|"Cash";
        name:string;
        details:string;
        isActive:boolean;
 }


export  default function Payment(){
const [page, setPage] = useState<Pay[]>([]);
  const [ show, setShow] = useState(false);
  const [type , settype] = useState<"UPI"|"Card"|"Cash">("UPI");

  const [name , setname] = useState("");
  const [details , setdetails] = useState("");


  const  handlebtn =()=>{
        if(!name.trim() || !details.trim()){
                return;
        }

        const pay :Pay = {
        id:Date.now(),
        type:type,
        name:name,
        details:details,
        isActive:page.length === 0,
        }


        setPage([...page,pay]);
        setname("");
        setdetails("");
        settype("UPI");
        setShow(false);
  }
  

const handleActive = (id:number)=>{
        setPage(
                page.map((pay)=>({
                        ...pay,
                        isActive:pay.id === id
                }))
        );
}

const deletepage = (id:number)=>{
        setPage(page.filter((pay)=> pay.id !== id))
}

        return(


<main className="min-h-screen w-full  bg-[#f7f1e8] px-4 py-8 text-[#3e2416]">

        <div className="mx-auto w-full max-w-2xl">


                {/* header part */}
                <div className="mb-8">
                        <h1 className="text-3xl font-bold">
                                Payment Methods
                        </h1>

                        <p className="text-sm text-[#3e2416]/70">
                                Manage your payment methods and preferences.
                        </p>
                </div>


                {/* payment ways to decide area  */}


                <div className="space-y-4">
                        {page.map((pay)=>(

                                <div 
                                key={pay.id} className="flex items-center justify-between rounded-lg border border-[#3e2416]/20 bg-[#3e2416]/5 p-4">

                        <div>

                                <div className="text-sm font-medium text-[#8b6b55]"> {pay.type}</div>

                                <h2 className="text-sm font-medium text-[#3e2416]">{pay.name}</h2>
                                <p className="text-sm text-[#3e2416]/70">{pay.details}</p>
                                {pay.isActive && (
                                        <span className="flex-shrink-0">
                                           Active
                                        </span>
                                )  }
                                </div>




                                {/* action button  */}


                                <div className="flex flex-col gap-2">

                {!pay.isActive && (
                        <button onClick={()=>
        handleActive(pay.id)} className="text-sm text-[#8b6b55] hover:underline">
                                                Set Active
                                        </button>
                                )}


                                <button onClick={()=> deletepage(pay.id)} className="text-sm text-[#8b6b55] hover:underline">
                                                Delete
                                        </button>
                                </div>
                        </div>
                        ))}
                </div>




                {/* add btton input  */}


                 {!show && (
          <button
            onClick={() => setShow(true)}
            className="mt-6 w-full rounded-xl bg-[#3e2416] px-4 py-3 font-medium text-white hover:bg-[#5a3b2c]"
          >
            + Add Payment Method
          </button>
        )}

        {/* Add Form */}
        {show && (
          <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm">

            <h2 className="text-xl font-semibold">
              Add Payment Method
            </h2>

            {/* Type */}
            <select
              value={type}
              onChange={(e) =>
                settype(
                  e.target.value as "UPI" | "Card" | "Cash"
                )
              }
              className="mt-4 w-full rounded-lg border p-3"
            >
              <option value="UPI">UPI</option>
              <option value="Card">Card</option>
              <option value="Cash">Cash</option>
            </select>

            {/* Name */}
            <input
              type="text"
              value={name}
              onChange={(e) => setname(e.target.value)}
              placeholder="Payment name"
              className="mt-4 w-full rounded-lg border p-3"
            />

            {/* Details */}
            <input
              type="text"
              value={details}
              onChange={(e) => setdetails(e.target.value)}
              placeholder="UPI ID / Card details"
              className="mt-4 w-full rounded-lg border p-3"
            />

            {/* Buttons */}
            <div className="mt-5 flex gap-3">

              <button
                onClick={handlebtn}
                className="rounded-lg bg-[#3e2416] px-5 py-2 text-white"
              >
                Add
              </button>

              <button
                onClick={() => setShow(false)}
                className="rounded-lg border px-5 py-2"
              >
                Cancel
              </button>

            </div>

          </div>
        )}

      </div>

    </main>
  );
}