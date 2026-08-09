type Product = {
    id:string;
  name: string;
   price: number;
    description: string;
 categoryId: string;
 imageUrl:string;
  onAddToCart: () => void;
};

type product ={
    product:Product;
}
export default  function MenuCard({ product }: product){
    return(
        
            <div className="w-full mx-w-sm  overflow-hidden  rounded-3xl shadow-md border border-[#eaded4]">
                {/* {image} */}
                <div className="relative h-60 overflow-hidden">
                    <img src={product.imageUrl} alt={product.name}
                    className="w-full h-full object-cover"/>

<div className="absolute top-4 right-4 bg-[#3b2115] text-white text-sm px-3 py-1 rounded-full">
 &#1645; 4.5
</div>
</div>
<div className="p-5">
    <h2 className=" rounded-full bg-[#f1e5da]py-1 px-3 text-xs text-[#6f351c]">{product.name}</h2>
    <p className="min-h-12 text-sm leading-6 text-[#80695b]">
        {product.description}
    </p>
    <span className="text-xl font-bold text-[#9a424]">
        {product.price.toFixed(2)}
    </span>
    <button onClick={product.onAddToCart}
    className="w-10 h-10 rounded-full bg-[#9a4f24] text-white flex items-center justify-center mt-3 hover:bg-[#7a3620] transition-colors duration-300"> +</button>

        </div>
        </div>
    )
}