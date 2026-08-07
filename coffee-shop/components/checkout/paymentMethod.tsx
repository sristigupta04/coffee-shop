type Props = {
  value: string;
  onChange: (method: string) => void;
};

export default function PaymentMethod({
  value,
  onChange,
}: Props) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Payment Method</h2>

      <label className="flex items-center gap-2">
        <input
          type="radio"
          name="payment"
          value="Cash on Delivery"
          checked={value === "Cash on Delivery"}
          onChange={(e) => onChange(e.target.value)}
        />
        Cash on Delivery
      </label>

      <label className="flex items-center gap-2">
        <input
          type="radio"
          name="payment"
          value="UPI"
          checked={value === "UPI"}
          onChange={(e) => onChange(e.target.value)}
        />
        UPI
      </label>

      <label className="flex items-center gap-2">
        <input
          type="radio"
          name="payment"
          value="Card"
          checked={value === "Card"}
          onChange={(e) => onChange(e.target.value)}
        />
        Credit / Debit Card
      </label>
    </div>
  );
}