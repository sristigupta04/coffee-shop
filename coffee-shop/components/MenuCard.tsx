type Props = {
  image: string;
  title: string;
  category: string;
  description: string;
  price: number;
  rating: number;
  isAvailable: boolean;
  onAddToCart: () => void;
};

export default  function MenuCard({ image, title, category, description, price, rating, isAvailable, onAddToCart }: Props){
    return(
        <div>
<div className="flex flex-col item-center ">
    <img src={image} alt={title} />
    <p className="text-lg font-semibold">{title}</p>


</div>

<div className="flex flex-col item-center ">
    <p className="text-sm text-gray-500">{category}</p>
    <p className="text-sm text-gray-500">{description}</p>
    <p className="text-sm text-gray-500">{price}</p>
    <p className="text-sm text-gray-500">{rating}</p>
    <p className="text-sm text-gray-500">{isAvailable ? "Available" : "Not Available"}</p>
    <button onClick={onAddToCart} className="bg-blue-500 text-white px-4 py-2 rounded">Add to Cart</button>
</div>
            </div>

    )
}