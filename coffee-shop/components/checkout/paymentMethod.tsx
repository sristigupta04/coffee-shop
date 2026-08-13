

type props = {
  value:string;
  onChange:(method:string)=>void
};
export default function Paymentform({
  value,
  onChange,
}: props) {
  return (
   <div className="flex  space-y-3">
    <h2 className="text-lg font-semibold">Bill time </h2>

    <label className="flex item-center gap-2">
      <input type="radio" name="payment" value="cash On delievry"
      checked={value === "cash On delivery"}
      onChange ={(e)=>onChange(e.target.value)}
      />
        Cash in hand
    </label>


<label className="flex item-center gap-2">
  <input type="radio" name="payment" value="card"
  checked={value=== "card"}
  onChange={(e)=>onChange(e.target.value)}
  />
  card
</label>
<label className="flex item-center gap-2">

  <input type="radio" name="payment" value="UPI"
  checked={value === "UPI"}
  onChange={(e)=>onChange(e.target.value)}
  />
  UPI
</label>
   </div>
  );
}