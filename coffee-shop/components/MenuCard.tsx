type Product = {
    id:number;
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
        
            <div className="bg-[#f8f3ed] rounded-2xl overflow-hidden border border-[#d6c4b5] shadow-md hover:shadow-lg transition-shadow duration-300">
                <div className="relative h-52 overflow-hidden">
                    <img src={product.imageUrl} alt={product.name}
                    className="w-full h-full object-cover"/>

<div className="absolute top-3 right-3 bg-{#3b2115] text-white text-sm px-3 py-1 rounded-full">
4.5
</div>
</div>
<div className="p-5">
    <h2 className="text-xl font-semibold text-[#3b2115]">{product.name}</h2>
    <p className="text-xl font-semibold text-[#3b2115]">
        {product.description}
    </p>
    <span className="text-xl font-bold text-[#9a424]">
        ?{product.price.toFixed(2)}
    </span>
    <button onClick={product.onAddToCart}
    className="w-10 h-10 rounded-full bg-[#9a4f24] text-white flex items-center justify-center mt-3 hover:bg-[#7a3620] transition-colors duration-300"> +</button>

        </div>
        </div>
    )
}