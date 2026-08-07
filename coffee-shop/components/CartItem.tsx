type Props = {
  image: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  totalPrice: number;

  removeItem: () => void;

  buttonText?: string;
  onButtonClick?: () => void;
};

export default function CartItem({
  image,
  name,
  category,
  price,
  quantity,
  totalPrice,
  removeItem,
  buttonText,
  onButtonClick,
}: Props) {
  return (
    <div className="flex items-center justify-between bg-white rounded-xl shadow-md p-5 mb-5">
      
      {/* Image */}
      <img
        src={image}
        alt={name}
        className="w-28 h-28 rounded-lg object-cover"
      />

      {/* Product Details */}
      <div className="flex-1 ml-6">
        <h2 className="text-2xl font-bold">{name}</h2>

        <p className="text-gray-500">{category}</p>

        <p className="mt-2 font-semibold">
          Price: ₹{price}
        </p>

        <p className="mt-1">
          Quantity: {quantity}
        </p>

        <p className="mt-1 text-amber-700 font-bold">
          Total: ₹{totalPrice}
        </p>
      </div>

      {/* Buttons */}
      <div className="flex flex-col gap-3">

        <button
          onClick={removeItem}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg"
        >
          Remove
        </button>

        {buttonText && (
          <button
            onClick={onButtonClick}
            className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg"
          >
            {buttonText}
          </button>
        )}

      </div>

    </div>
  );
}