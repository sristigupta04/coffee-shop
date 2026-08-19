"use client";

import { useEffect, useState } from "react";



type Pro ={
  name:string;
  email:string;
  phone:string;
  image:string;
}
export  default  function Profile(){
  const [page, setPage] = useState<Pro | null>(null);

const [load ,setload] = useState(true);

  useEffect( () => {

    const handle = async () => {

      try{
  const res = await fetch("http://localhost:3000/api/profile");

  if(!res.ok){
    throw new Error("Failed to fetch profile data");
  }
const data = await res.json();


setPage({
  name:data.data.name,
  email:data.data.email,
  phone:data.data.phone,
  image:data.data.image
});
      }catch(err){
  console.error("Error fetching products:", err);
  setload(false);
}finally{
  setload(false);
}
    };
    handle();
  },[]);

  return(
    <main className="min-h-screen bg-[#f8f3ed] px-4 py-8 md:px-10 lg:px-16">
      <div className="mx-auto max-w-3xl">
        <a href="/settings"
        className="text-sm font-medium text-[#806654] hover:text-[#3b2115]">
          back to setting
        </a>

        <h1 className="mt-5 text-3xl font-bold text-[#3b2115] md:text-4xl">Profile</h1>
        <p className="mt-2 text-sm font-medium text-[#806654]">
          Manage your profile information and settings.
        </p>

      </div>


      {/* profile card baao */}


      <div className="rounded-3xl bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col items-center border-b border-[#eee4da] pb-8">
          {page?.image ?(
            <img src={page.image} alt="Profile" className="h-24 w-24 rounded-full object-cover" />
          ):(
            <div className=" flex h-24  w-24 items-center rounded-full bg-[#dfe9dc]
            justify-center text-4xl"> iconf</div>
          )}
        </div>

 <button
            type="button"
            className="mt-4 rounded-xl bg-[#dfe9dc] px-5 py-2 text-sm font-semibold text-[#3b2115] transition hover:bg-[#cfdcc9]"
          >
            Change Photo
          </button>
        

        {/* Personal Information */}
        <div className="mt-8 space-y-6">

          {/* Name */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#3b2115]">
              Full Name
            </label>

            <input
              type="text"
              value={page?.name || ""}
              readOnly
              className="w-full rounded-xl border border-[#dfd2c5] bg-[#faf7f3] px-4 py-3 text-[#3b2115] outline-none"
            />
          </div>

          {/* Email */}
 <div>
            <label className="mb-2 block text-sm font-semibold text-[#3b2115]">
              Email Address
            </label>

            <input
              type="email"
              value={page?.email || ""}
              readOnly
              className="w-full rounded-xl border border-[#dfd2c5] bg-[#faf7f3] px-4 py-3 text-[#3b2115] outline-none"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#3b2115]">
              Phone Number
            </label>

            <input
              type="tel"
              value={page?.phone || ""}
              readOnly
              className="w-full rounded-xl border border-[#dfd2c5] bg-[#faf7f3] px-4 py-3 text-[#3b2115] outline-none"
            />
          </div>
           </div>

        {/* Actions */}
        <div className="mt-8 flex flex-col gap-3 border-t border-[#eee4da] pt-6 sm:flex-row sm:justify-end">

          <button
            type="button"
            className="rounded-xl border border-[#cdbba9] px-6 py-3 text-sm font-semibold text-[#3b2115] transition hover:bg-[#f8f3ed]"
          >
            Edit Profile
          </button>

          <button
            type="button"
            className="rounded-xl bg-[#3b2115] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#542f20]"
          >
            Save Changes
          </button>

        </div>

     
    
    </div>
  </main>
);
}