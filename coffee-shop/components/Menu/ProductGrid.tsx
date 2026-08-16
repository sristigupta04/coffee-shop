import MenuCard from "./MenuCard";

type Product = {
  id: string;
  name: string;
  price: number;
  description: string;
  imageUrl: string;
  categoryId: string;
 onAddToCart: (quantity: number) => void;
};

type ProductGridProps = {
  products: Product[];
};



export default function ProductGrid({products}:ProductGridProps){
  return(
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
     {products.map((product)=>(
      <MenuCard
      key={product.id}
      product={product}/>
     ))}
    </div>
  )
}