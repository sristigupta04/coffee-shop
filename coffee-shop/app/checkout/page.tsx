


type props={
    address:string;
    Phone:number;
    PaymentMethod:string;
    OrderSummary:React.ReactNode;
    PlaceOrderButton:React.ReactNode;
}

const [loading, setLoading] = useState(false);

const total = dummydata.reduce(
  (acc, item) => acc + item.price * item.quantity,
  0
);

const handleCheckout = async () => {
  setLoading(true);

  try {
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        address,
        Phone,
        PaymentMethod,
        items: dummydata,
        total,
      }),
    });

    const data = await response.json();
    console.log(data);
  } catch (error) {
    console.error(error);
  } finally {
    setLoading(false);
  }
};