
type category ={
    selectedCategory:string;
    onCategoryChange:(category:string)=>void;
}


export default function CategoryBar({
    selectedCategory, onCategoryChange
}:category){
 const categories = ["All", "Food", "Drink", "Dessert", "Snack"];
 return(
    <nav className="flex gap-8 border-b border-[#eadbc9] bg-[#fffaf3] shadow-sm">
        {categories.map((category)=>(
            <button 
            key={category}
            onClick={()=>onCategoryChange(category)}
className={
    selectedCategory === category
    ? "text-[#e6b89c] border-b-2 border-[#e6b89c] pb-2"
    : "text-[#000000] pb-2"
}
            >
                {category}
            </button>
            
        ))}
        </nav>
 );
}
