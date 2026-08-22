
"use client";
import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";

function SettingsContent() {
    const [page ,setpage] = useState("profile");
   
  const param = useSearchParams();

    useEffect(()=>{
       
         const page = param.get("page");

         if(page){
            setpage(page);

         }
        
    },[param]);


    return(
        <main className="min-h-screen bg-[#f8f3ed] px-4 py-8 md:px-10 lg:px-16">

            {/* header part */}
<div className="mx-auto max-w-5xl">

<h1 className="text-3xl font-bold text-[#3b2115] md:text-4xl">Settings  </h1> 

<p className="mt-2 text-sm text-[#806654] md:text-base">Manage your account settings and preferences.</p>

{/* acaccount section banapo */}

<section className="mt-8">


    <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#806654]">
        Account 
    </h2>


    <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        {/* {profile} */}
        <a href="/profile" className="flex items-center justify-between border-b border-[#eee4da] px-5 py-5 transition hover:bg-[#faf7f3]">
        <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e6eee5] text-xl">
                profile
            </div>
            <div>
                <h1 className="font-semibold text-[#3b2115]">
                    Profile
                </h1>
                <p className="text-sm text-[#806654]">
                    Details of your profile
                </p>
                <p className="mt-1 text-sm text-[#806654]">
                    Manage your personal information, contact details </p>
            </div></div>
            <span className="text-xl text-[#806654]">
                &gt;
            </span>
        </a>
 



{/* orders detiails  */}

<a href="/orders"
className="flex items-center justify-between border-b border-[#eee4da] px-5 py-5 transition hover:bg-[#faf7f3]">   

<div className="flex items-center gap-4">
    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e6eee5] text-xl">
        orders
        </div>

        <div className="font-semibold text-[#3b2115]">
            <h3 className="font-semibold text-[#3b2115]">
                orders history </h3>
                <p className="mt-1 text-sm text-[#806654]">
                    view your past orders  </p>
        </div>
</div>

 <span className="text-xl text-[#806654]">
    &gt;
 </span>
</a>
 </div>
</section>


<section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#806654]">
            Preferences
          </h2>

          <div className="overflow-hidden rounded-2xl bg-white shadow-sm">

            {/* Personal Settings */}
            <a
              href="/settings/personal"
              className="flex items-center justify-between border-b border-[#eee4da] px-5 py-5 transition hover:bg-[#faf7f3]"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e6eee5] text-xl">
                  🔔
                </div>

                <div>
                  <h3 className="font-semibold text-[#3b2115]">
                    Personal Settings
                  </h3>
                  <p className="mt-1 text-sm text-[#806654]">
                    Notifications and order updates
                  </p>
                </div>
              </div>

              <span className="text-xl text-[#806654]">›</span>
            </a>

            {/* Payment */}
            <a
              href="/settings/payment"
              className="flex items-center justify-between px-5 py-5 transition hover:bg-[#faf7f3]"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e6eee5] text-xl">
                  💳
                </div>

                <div>
                  <h3 className="font-semibold text-[#3b2115]">
                    Payment Methods
                  </h3>
                  <p className="mt-1 text-sm text-[#806654]">
                    Manage your payment options
                  </p>
                </div>
              </div>

              <span className="text-xl text-[#806654]">›</span>
            </a>

          </div>
        </section>

        {/* Security */}
      {/* Security */}
<section className="mt-8">
  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#806654]">
    Security
  </h2>

  <div className="overflow-hidden rounded-2xl bg-white shadow-sm">

    {/* Account Activity */}
    <a
      href="/settings/activity"
      className="flex items-center justify-between border-b border-[#eee4da] px-5 py-5 transition hover:bg-[#faf7f3]"
    >
      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e6eee5] text-xl">
          🛡️
        </div>

        <div>
          <h3 className="font-semibold text-[#3b2115]">
            Account Activity
          </h3>

          <p className="mt-1 text-sm text-[#806654]">
            View recent account activity
          </p>
        </div>
      </div>

      <span className="text-xl text-[#806654]">
        ›
      </span>
    </a>

    {/* Change Password */}
    <a
      href="/settings/password"
      className="flex items-center justify-between px-5 py-5 transition hover:bg-[#faf7f3]"
    >
      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e6eee5] text-xl">
          🔐
        </div>

        <div>
          <h3 className="font-semibold text-[#3b2115]">
            Change Password
          </h3>

          <p className="mt-1 text-sm text-[#806654]">
            Update your account password
          </p>
        </div>
      </div>

      <span className="text-xl text-[#806654]">
        ›
      </span>
    </a>

  </div>
</section>

        {/* Featured */}
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#806654]">
            Featured
          </h2>

          <div className="grid grid-cols-2 gap-3">

            <a
              href="/offers"
              className="rounded-2xl bg-[#dfe9dc] p-5 transition hover:-translate-y-1"
            >
              <span className="text-2xl">🎁</span>
              <h3 className="mt-3 font-semibold text-[#3b2115]">
                Offers
              </h3>
              <p className="mt-1 text-xs text-[#806654]">
                Discover latest offers
              </p>
            </a>

            <a
              href="/menu"
              className="rounded-2xl bg-[#dfe9dc] p-5 transition hover:-translate-y-1"
            >
              <span className="text-2xl">☕</span>
              <h3 className="mt-3 font-semibold text-[#3b2115]">
                Our Menu
              </h3>
              <p className="mt-1 text-xs text-[#806654]">
                Explore our coffee
              </p>
            </a>

            <a
              href="/brew"
              className="rounded-2xl bg-[#dfe9dc] p-5 transition hover:-translate-y-1"
            >
              <span className="text-2xl">📖</span>
              <h3 className="mt-3 font-semibold text-[#3b2115]">
                Brew
              </h3>
              <p className="mt-1 text-xs text-[#806654]">
                Coffee brewing guide
              </p>
            </a>

            <a
              href="/support"
              className="rounded-2xl bg-[#dfe9dc] p-5 transition hover:-translate-y-1"
            >
              <span className="text-2xl">💬</span>
              <h3 className="mt-3 font-semibold text-[#3b2115]">
                Support
              </h3>
              <p className="mt-1 text-xs text-[#806654]">
                Need some help?
              </p>
            </a>

          </div>
        </section>

        {/* Bottom Links */}
        <section className="mt-8 border-t border-[#dfd2c5] pt-6">

          <a
            href="/privacy"
            className="block py-3 text-sm font-medium text-[#5c3b2a]"
          >
            Privacy Policy
          </a>

          <a
            href="/terms"
            className="block py-3 text-sm font-medium text-[#5c3b2a]"
          >
            Terms & Conditions
          </a>

          <button
  type="button"
  onClick={() => signOut({ callbackUrl: "/login" })}
  className="mt-2 w-full rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-left text-sm font-semibold text-red-600 transition hover:bg-red-100"
>
  Logout
</button>
        </section>
      </div>
    </main>
  );
}


export default function Settings() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SettingsContent />
    </Suspense>
  );
}