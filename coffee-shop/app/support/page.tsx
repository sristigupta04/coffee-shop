

"use client";

import { useState } from "react";

type Support ={
    id:number;
    category:string;
    question:string;
    answer:string;
}



export default function Support(){
    const [support] = useState<Support[]>([
        {
            id:1,
            category:"Brewing",
            question:"How do I brew the perfect cup of coffee?",
            answer:"To brew the perfect cup of coffee, start with fresh, cold water and use the right coffee-to-water ratio. Grind your coffee beans just before brewing and use the right brewing method for your coffee type."
        },
        {
            id:2,
            category:"Latte",
            question:"How do I make a latte at home?",
            answer:"To make a latte at home, brew a shot of espresso and steam milk until it's frothy. Pour the steamed milk over the espresso and add any desired flavorings or sweeteners."
        }
    ]);
const [search, setSearch] = useState("");
const [open , setOpen] = useState<number | null>(null);
const [contact,setcontact] = useState({
    name:"",
    email:"",
    message:""
})
const [sent , setsent] = useState(false);
const [showContact, setShowContact] = useState(false);

const filteredSupport = support.filter((item) =>
    item.question.toLowerCase().includes(search.toLowerCase()) ||
    item.answer.toLowerCase().includes(search.toLowerCase()) ||
    item.category.toLowerCase().includes(search.toLowerCase())
);
const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setcontact({
        ...contact,
        [e.target.name]: e.target.value
    })
};
const send = (e: React.FormEvent<HTMLFormElement>)=>{
    e.preventDefault();
    if(!contact.name || !contact.email || !contact.message){
        alert("Please fill all the fields");
        return;
    }

    setsent(true);
    setcontact({
        name:"",
        email:"",
        message:""
    });
    setTimeout(() => {
        setsent(false);
    }, 3000);   
}
return (
<main className="min-h-screen w-full  bg-[#f7f1e8] px-4 py-8 text-[#3e2416]">
    <div className="mx-auto w-full max-w-2xl">


        <h1 className="text-3xl font-bold">
             Support </h1>
        <p className="mt-2 text-sm text-[#7b6252]">
            Find answers to common questions about brewing and making lattes at home. 
        </p>
        </div>

        <div className="mt-6">
  <input
    type="text"
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    placeholder="Search your question..."
    className="w-full rounded-xl border border-[#d8c7b5] bg-white px-4 py-3 outline-none"
  />

</div>


<div className="mt-8 space-y-4">

    {filteredSupport.length === 0? (
        <div className="rounded-xl bg-white p-5 text-center">
            <p className="text-sm text-[#7b6252]">No results found for your search.</p>
        </div>
    ):(
       
        <div className="mt-8 space-y-4">
        {filteredSupport.map((item)=>(
            <div key={item.id} className="bg-[#fff] p-4 rounded-lg shadow-md">

                <h2 className="text-lg font-semibold">{item.category}</h2>
<button  type="button" onClick={()=>
    setOpen(open === item.id ? null : item.id)
}

className="flex w-full items-center justify-between text-left text-sm font-medium text-[#3e2416]">

    <span className="text-sm text-[#7b6252]"><strong>Q:</strong> {item.question}</span>

    <span className="ml-4 text-xl">
        {open === item.id ? "-" : "+"}
    </span>
</button>


{open === item.id && (
  <p className="mt-3 text-sm text-[#7b6252]">
    <strong>A:</strong> {item.answer}
  </p>
)}     
       </div>
        ))}

        </div>
    )}


<div className="mt-10 rounded-2xl bg-white p-6 shadow-sm">
    <h2 className="text-lg font-semibold">Contact Us</h2>
    <p className="mt-2 text-sm text-[#7b6252]">If you have any questions or need further assistance, please fill out the form below.</p>
{!showContact && (
    
<button
              type="button"
              onClick={() => setShowContact(true)}
              className="mt-5 rounded-xl bg-[#6f472f] px-5 py-3 font-medium text-white hover:bg-[#543522]"
            >
              Contact Support
            </button>
          )}

          {/* Contact Form */}
          {showContact && (
            <form
              onSubmit={send}
              className="mt-5 space-y-4"
            >
              <input
                type="text"
                name="name"
                value={contact.name}
                onChange={handleChange}
                placeholder="Your name"
                className="w-full rounded-xl border border-[#d8c7b5] px-4 py-3 outline-none"
              />

              <input
                type="email"
                name="email"
                value={contact.email}
                onChange={handleChange}
                placeholder="Your email"
                className="w-full rounded-xl border border-[#d8c7b5] px-4 py-3 outline-none"
              />

              <textarea
                name="message"
                value={contact.message}
                onChange={handleChange}
                placeholder="How can we help?"
                rows={5}
                className="w-full resize-none rounded-xl border border-[#d8c7b5] px-4 py-3 outline-none"
              />

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="rounded-xl bg-[#6f472f] px-5 py-3 font-medium text-white hover:bg-[#543522]"
                >
                  Send Message
                </button>

                <button
                  type="button"
                  onClick={() => setShowContact(false)}
                  className="rounded-xl border border-[#d8c7b5] px-5 py-3"
                >
                  Cancel
                </button>
              </div>

              {sent && (
                <p className="text-sm font-medium text-green-700">
                  Message sent successfully ✓
                </p>
              )}
            </form>
          )}
</div>
    </div>
</main>
)
}
       