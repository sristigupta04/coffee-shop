type Product ={
    image:string;
    name:string;
    price:number;
    description:string;

}
type products ={
    product:Product;
}
export default function ProducCard({ product }:products){
    const { image, name, price, description } = product;
    return (
        <>
        <div className="product-card" >
        
         <img src={image} alt={name}/>
         <p>{name}</p>
         <p>${price.toFixed(2)}</p>
         <p>{description}</p>
         <div>
            <button >-</button>
            <span>0</span>
            <button>+</button>
         </div>
        </div>
        </>

    )

}