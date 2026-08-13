import Product from "./ProductCard";

type Products = {
  id: string;
  name: string;
  price: number;
  description: string;
  image: string;
  category: string;
  stock: number;
  isAvailable: boolean;
};

type ProductGridProps = {
  product: Products;
};



export default function productGrid({product}:ProductGridProps){
  return(
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
     {product.map((product)=>(
      <Product 
      key={product.id}
      product ={product}/>
     ))}
    </div>
  )
}