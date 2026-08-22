"use client";
import { useEffect, useState } from "react";
import Setting from "../../../components/setting/Setting";
    
export default function Personal(){
          const [notification, setNotification] = useState(true);
          const [order, setorder] = useState(true);
          const [promo, setpromo] = useState(true);
          const[saved , setsaved] = useState(false);
          const [email, setemail] = useState(true);

          useEffect(()=>{
              const fetching = async () =>{
            try{
          
                const res = await fetch("/api/settings/personal", {
                    credentials:"include",
                });
        
                const data = await res.json();
                if(!res.ok){
                    throw new Error(data.message || "Failed to fetch settings");
                }
                setNotification(data.data.notificationEnabled);
                setorder(data.data.orderUpdates);
                setpromo(data.data.promoEmails);
                setemail(data.data.emailNotifications);
            
             } catch(error) {
                console.error("Error fetching settings:", error);}
             }
            fetching();
          }, []);


const handle = async () =>{
    try{
        const res = await fetch("/api/settings/personal", {
            method:"PUT",
            headers:{
                "Content-Type":"application/json",
            },
            body:JSON.stringify({
                notificationEnabled:notification,
                orderUpdates:order,
                promoEmails:promo,
                emailNotifications:email,
            }),
            credentials:"include",
        });
        const data = await res.json();
        if(!res.ok){
            throw new Error(data.message || "Failed to update settings");
        }
        setsaved(true);
        setTimeout(() => {
            setsaved(false);
        }, 3000);
    }catch(error){
        console.error("Error updating settings:", error);
    }
}
   

    return(
<main className="min-h-screen w-full bg-[#f7f1e8] px-4 py-8 text-[#3e2416]">
<div className="mx-auto w-full max-w-2xl">
{/* header */}

<div className="mb-8">
    <h1 className="text-3xl font-bold">Personal Settings</h1>
    <p className="mt-2 text-sm text-[#7b6252]">Manage your personal settings and preferences.</p>

</div>
<div className="space-y-4">
    <Setting title="notification" description="Receive notifications about your account activity." checked={notification} onChange={() => setNotification(!notification)} />
    <Setting title="order" description="Receive updates about your orders and deliveries." checked={order} onChange={() => setorder(!order)} />
    <Setting title="promo" description="Receive promotional offers and discounts." checked={promo} onChange={() => setpromo(!promo)} />
    <Setting title="email" description="Receive updates about your email notifications." checked={email} onChange={() => setemail(!email)} />
</div>
<div className="mt-8">
    <button onClick={handle} className="rounded bg-[#3e2416] px-4 py-2 text-white hover:bg-[#5a3b2c]">Save Changes</button>
    {saved && <p className="mt-2 text-sm text-green-600">Changes saved successfully!</p>}


</div>
</div>

</main>
    )
}