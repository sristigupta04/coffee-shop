type Props = {
  image: string;
  title: string;
  price: number;
  category: string;
  description: string;
};

export default function MenuCard({
  image,
  title,
  price,
  category,
  description,
}: Props) {
  return (
    <div className="w-72 rounded-2xl overflow-hidden shadow-md border border-gray-300">
      <img
        src={image}
        alt={title}
        className="w-full h-48 object-cover"
      />

      <div className="flex flex-col gap-2 p-4">
        <h2 className="text-lg font-bold">{title}</h2>

        <p className="text-sm text-gray-500">{description}</p>

        <p className="text-sm text-gray-600">{category}</p>

        <p className="text-xl font-bold">₹{price.toFixed(2)}</p>

        <button className="bg-amber-600 text-white py-2 rounded-lg">
          Add to Cart
        </button>
      </div>
    </div>
  );
}