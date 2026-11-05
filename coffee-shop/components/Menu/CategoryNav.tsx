
"use client";
type category ={
 categoryChecked:string;
 onCategory:(category:string)=>void;
}


export default function Categoryhead({
    categoryChecked,onCategory
}:category){
    const categories  =["All","Espresso","Milk Coffee","Cold Coffee","Special","Dessert"];

return(
  <div className="w-full  bg-[#f8f3ed] py-2">
   

    <div className="flex flex-wrap justify-center gap-3">

        {categories.map((category)=>(
            <button
              key={category}

              onClick={()=>onCategory(category)}

              className={`rounded-full border px-6 py-2 text-sm font-medium transition ${
                categoryChecked === category
                ? "border-[#3b2114] bg-[#3b2114] text-white"
                : "border-[#3b2114] bg:[#fffaf3]  text-[#3b2114] hover:bg-[#3b2115] hover:text-white"
            }`} >{category}
            </button>

        ))}
    </div>
          
  </div>
)
}
