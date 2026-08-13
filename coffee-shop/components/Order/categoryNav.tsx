

type category ={
 categoryChecked:string;
 onCategory:(category:string)=>void;
}


export default function categoryhead({
    categoryChecked,onCategory
}:category){
    const categories = ["FOOD", "DRINK","DESSSERT","SNACK", "MEAL", "FAMILY-PACKAGE"];

return(
  <div className="w-full rounded-2xl border border-0 bg-[#fffaf3]  bg-white p-5 shadow-sm">
    <h2 className="mb-4 text-center text-lg font-semibold text-[#3b2114">
        categories
    </h2>
    <div className="flex flex-wrap justify-center gap-3">
        {categories.map((category)=>{
            const isTrue = categoryChecked === category;
            return(
             <button key={category} onClick={()=>onCategory(category)}
             className={`rounded-full border px-6 py-2 text-sm font-medium transition-all duration-75 ${
                isTrue? "border-[#3b2114] bg-[#3b2114] text-white shadow-sm"
            :"border-[#3b2114] bg-white text-[#3b2114] shadow-sm"
             }`}
            
        >{category}
        </button>
        )
    })};
    </div>
  </div>
)
}
