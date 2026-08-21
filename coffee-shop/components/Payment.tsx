"use client";

import { useState , useEffect} from "react";


type Pay ={
    id:string;
    type:"UPI" | "CARD" | "CASH";
    name:string;
    details:string;
    isActive:boolean;
}

export default function Payment(){
const [page, setPage] = useState<Pay[]>([]);
  const [show, setShow] = useState(false);
  const [type, setType] = useState<"UPI" | "Card" | "Cash">("UPI");
  const [name, setName] = useState("");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);


  useEffect(() => {
    const fetchData = async () => {
        try{
            const res = await fetch("/api/settings/payment",{
                credentials:"include",
            });
            const data = await res.json();
            if(!res.ok){
                throw new Error(data.message || "Something went wrong");
            }
            setPage(data.data);
        }catch(error){
            console.log(error);
        }finally{
            setLoading(false);
        }
            }
            fetchData();
  }, []);
  const handlebtn = async () =>{
    if(!name.trim() || !details.trim()){
        alert("Please fill all the fields");
        return;
    }
    try{
        setSaving(true);
        const res = await fetch("/api/settings/payment",{
            method:"POST",
            headers:{
                "Content-Type":"application/json",
            },
            credentials:"include",
            body:JSON.stringify({type,name,details}),
        });
        const data = await res.json();
        if(!res.ok){
            throw new Error(data.message || "Something went wrong");
        }
        setPage([...page, data.data]);
        setName("");
        setDetails("");
        setShow(false);
    }catch(error){
        console.log(error);
        alert(error instanceof Error ? error.message : "Something went wrong");
    }finally{
        setSaving(false);
    }


    const handleActive = async(id:string) =>{
        try{
            const res = await fetch(`/api/settings/payment/${id}`,{
                method:"PATCH",
                credentials:"include",
            });
            const data = await res.json();
            if(!res.ok){
                throw new Error(data.message || "Something went wrong");
            }
            setPage((prev)=>prev.map((pay)=>({
                ...pay,
                isActive:pay.id === id ? true : false,
            })));

        }catch(error){
            console.log(error);
            alert(error instanceof Error ? error.message : "Something went wrong");
        }
    }


    const deletepage = async(id:string) =>{
        try{
            const res = await fetch(`/api/settings/payment/${id}`,{
                method:"DELETE",
                credentials:"include",
            });
            const data = await res.json();
            if(!res.ok){
                throw new Error(data.message || "Something went wrong");
            }
            setPage((prev)=>prev.filter((pay)=>pay.id !== id));

        }catch(error){
            console.log(error);
            alert(error instanceof Error ? error.message : "Something went wrong");
        }
    }
    return (
    <main className="min-h-screen w-full bg-[#f7f1e8] px-4 py-8 text-[#3e2416]">
      <div className="mx-auto w-full max-w-2xl">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">
            Payment Methods
          </h1>

          <p className="text-sm text-[#3e2416]/70">
            Manage your payment methods and preferences.
          </p>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="rounded-xl bg-white p-6 text-center">
            Loading payment methods...
          </div>
        ) : (
          <div className="space-y-4">

            {/* Payment Methods */}
            {page.length === 0 ? (
              <div className="rounded-xl bg-white p-6 text-center text-sm text-[#806654]">
                No payment methods added yet.
              </div>
            ) : (
              page.map((pay) => (
                <div
                  key={pay.id}
                  className="flex items-center justify-between rounded-lg border border-[#3e2416]/20 bg-[#3e2416]/5 p-4"
                >
                  <div>
                    <div className="text-sm font-medium text-[#8b6b55]">
                      {pay.type}
                    </div>

                    <h2 className="text-sm font-medium text-[#3e2416]">
                      {pay.name}
                    </h2>

                    <p className="text-sm text-[#3e2416]/70">
                      {pay.details}
                    </p>

                    {pay.isActive && (
                      <span className="mt-2 inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                        Active
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    {!pay.isActive && (
                      <button
                        onClick={() => handleActive(pay.id)}
                        className="text-sm text-[#8b6b55] hover:underline"
                      >
                        Set Active
                      </button>
                    )}

                    <button
                      onClick={() => deletepage(pay.id)}
                      className="text-sm text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Add Button */}
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
                setType(
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
              onChange={(e) => setName(e.target.value)}
              placeholder="Payment name"
              className="mt-4 w-full rounded-lg border p-3"
            />

            {/* Details */}
            <input
              type="text"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="UPI ID / Card details"
              className="mt-4 w-full rounded-lg border p-3"
            />

            {/* Buttons */}
            <div className="mt-5 flex gap-3">
              <button
                onClick={handlebtn}
                disabled={saving}
                className="rounded-lg bg-[#3e2416] px-5 py-2 text-white disabled:opacity-50"
              >
                {saving ? "Adding..." : "Add"}
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