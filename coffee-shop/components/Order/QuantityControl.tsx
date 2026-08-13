
type Quantity ={
    quantity:number;
    onQuantityChange:(newQuantity:number)=>void;
}
type control={
    quantity:Quantity;

}


export default function QuantityControl({
  quantity,
  onQuantityChange,
}: QuantityControlProps) {
  const [amount, setAmount] = useState(quantity);

  const handleIncrement = () => {
    const newAmount = Math.min(amount + 1, 10);

    setAmount(newAmount);
    onQuantityChange(newAmount);
  };

  const handleDecrement = () => {
    const newAmount = Math.max(amount - 1, 0);

    setAmount(newAmount);
    onQuantityChange(newAmount);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleDecrement}
        className="rounded bg-gray-300 px-2 py-1"
      >
        -
      </button>

      <span>{amount}</span>

      <button
        onClick={handleIncrement}
        className="rounded bg-gray-300 px-2 py-1"
      >
        +
      </button>
    </div>
  );
}