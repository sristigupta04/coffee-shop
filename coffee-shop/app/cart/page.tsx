"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Cart = {
  id: string;
  quantity: number;
  price: number;
  name: string;
  description: string;
  image: string;
};

type Product = {
  id: string;
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
  image?: string;
  isAvailable?: boolean;
};

export default function Page() {
  const [cart, setcart] = useState<Cart[]>([]);
const [recommend, setRecommend] = useState<Product[]>([]);
const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [load, setload] = useState(true);

  useEffect(() => {
    const getData = async () =>{
      try{
        const userId =  localStorage.getItem("userId");
        if(!userId){
           setload(false);
           return;
      } 
      const res = await fetch("/api/cart", {
                headers:{
                  userId,
                }
      })
      const cartdata = await res.json();
      if(!res.ok){
        throw new Error(cartdata.message || "Failed to fetch cart");
        
      }
    
 
const cartItems = cartdata.data?.items || [];

const formattedCart: Cart[] = cartItems.map((item: any) => ({
  id: item.id,
  quantity: item.quantity,
  price: item.price,
  name: item.product.name,
  description: item.product.description,
  image: item.product.image,
}));

setcart(formattedCart);
const productsRes = await fetch("/api/products");
const productsData = await productsRes.json();
if(!productsRes.ok){
  throw new Error(productsData.message || "Failed to fetch products");
}
const products: Product[] =  productsData.data || [];



  const formattedProducts = products.filter(
    (product)=> product.isAvailable !== false );
    setAllProducts(formattedProducts);

      
const recommended = formattedProducts.filter((product )=>
  !cartItems.some((item:any) => item.id === product.id)
).slice(0, 3);

setRecommend(recommended);

}catch(error){
  console.error("Recommendation error:", error);

}finally{
  setload(false);
}
};

 getData();
},[]);
        
  const totalItems = cart.reduce(
    (acc, item) => acc + item.quantity,
    0
  );

  
  const subtotal = cart.reduce(
    (acc, item) =>
      acc + item.price * item.quantity,
    0
  );



  const tax = subtotal * 0.05;


  const grandTotal = subtotal + tax;

  
  const cartChanged = () => {
    window.dispatchEvent(
      new Event("cartUpdated")
    );
  };


const remove = async (id:string)=>{
  try{
    const res = await fetch(`/api/cart/${id}`, {
      method:"DELETE",
    });
    const data = await res.json();
    if(!res.ok){
      throw new Error(data.message || "Failed to remove item from cart");
    }
    setcart((prev) =>prev.filter((items) => items.id !== id));
    cartChanged();
  }catch(error){
    console.error("Error removing item from cart:", error);
  }
  }
   
  const add = async (id: string) => {
    
    const item = cart.find((item) =>
      item.id === id
        ? {
            ...item,
            quantity: item.quantity + 1,
          }
        : item
    );
if(!item){
  return;
}
try{
  const res = await fetch(`/api/cart/${id}`, {
    method:"PUT",
    headers:{
      "Content-Type":"application/json",
    },
    body:JSON.stringify({quantity:item.quantity + 1}),
  });
  const data = await res.json();
  if(!res.ok){
    throw new Error(data.message || "Failed to update item quantity");
  }
  setcart((prev) =>
    prev.map((item) =>
      item.id === id
        ? { ...item, quantity: item.quantity + 1 }
        : item
    )
  );
  cartChanged();
} catch (error) {
  console.error("Error updating item quantity:", error);
}
  }


  const subtract = async ( id: string ) => {
    const item = cart.find( (item) => item.id === id );

    if (!item || item.quantity <= 1) {
      return;
    }

    try {
      const res = await fetch( `/api/cart/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type":"application/json",
          },
          body: JSON.stringify({ quantity: item.quantity - 1 }),
        }
      );

      const data =  await res.json();

      if (!res.ok) {
        throw new Error( data.message || "Failed to update quantity" );
      }

      setcart((prev) =>  prev.map((item) => item.id === id  ? {
                ...item,quantity:
                  item.quantity - 1,
              }
            : item
        )
      );

      cartChanged();
    } catch (error) {
      console.error("DECREASE CART ERROR:",error);
    }
  };

  const clear = async () =>{
    try{
      const items = [...cart];
      await Promise.all(items.map((item) => fetch(`/api/cart/${item.id}`, {
        method:"DELETE",
      })));
      setcart([]);
      cartChanged();
    }catch(error){
      console.error("Error clearing cart:", error);
    }
      
  }
  const addRecommended = async(product:Product)=>{
    try{
      const userId = localStorage.getItem("userId");
      if(!userId){
        alert("Please log in to add items to the cart.");
        return;
      }
      const res = await fetch("/api/cart", {
        method:'POST',
        headers:{
          "Content-Type":"application/json",
        },
        body:JSON.stringify({userId, productId:product.id, quantity:1}),
      });
      const data = await res.json();
      if(!res.ok){
        throw new Error(data.message || "Failed to add item to cart");
      }
      const cartRes = await fetch("/api/cart", {
        headers:{userId,}
      });
      const cartData = await cartRes.json();
      const newCart = cartData.data?.items || [];
     
if (cartRes.ok) {
  const formattedCart: Cart[] = newCart.map((item: any) => ({
    id: item.id,
    quantity: item.quantity,
    price: item.price,
    name: item.product.name,
    description: item.product.description,
    image: item.product.image,
  }));

  setcart(formattedCart);
}





const newRecommend = allProducts
  .filter(
    (item) =>
      !newCart.some(
        (cartItem: any) =>
          cartItem.product.id === item.id
      )
  )
  .slice(0, 3); 
       setRecommend(newRecommend);
      cartChanged();
    }catch(error){
      console.error("Error adding recommended item to cart:", error)
    }
      
    }
  

 if (load) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f0e7]">
        <p className="text-[#40594b]">
          Loading cart...
        </p>
      </main>
    );
  }


  // =========================
  // UI
  // =========================

  return (
    <main className="min-h-screen bg-[#f5f0e7] px-4 py-8 sm:px-6 lg:px-10">

      <div className="mx-auto max-w-6xl">

        {/* ================= HEADER ================= */}

        <div className="mb-8">

          <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#70806e]">
            Coffee Shop
          </p>

          <div className="mt-2 flex items-end justify-between gap-4">

            <div>

              <h1 className="text-4xl font-semibold text-[#39423b] sm:text-5xl">
                Your Cart
              </h1>

              <p className="mt-2 text-sm text-[#7b8178]">
                {totalItems}{" "}
                {totalItems === 1
                  ? "item"
                  : "items"}
              </p>

            </div>

          </div>

        </div>

        {/* ================= CART + SUMMARY ================= */}

        <div className="grid gap-7 lg:grid-cols-[1fr_330px]">

          {/* ================= CART ================= */}

          <section className="rounded-[28px] border border-[#ddd7ca] bg-[#fbf7ef] p-5 sm:p-7">

            <div className="mb-5 flex items-center justify-between">

              <h2 className="text-lg font-semibold text-[#39423b]">
                Cart Items
              </h2>

              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={clear}
                  className="text-sm text-[#7b8178] transition hover:text-[#40594b]"
                >
                  Clear Cart
                </button>
              )}

            </div>

            {/* ================= EMPTY CART ================= */}

            {cart.length === 0 ? (

              <div className="py-16 text-center">

                <div className="text-5xl">
                  🛒
                </div>

                <h2 className="mt-5 text-xl font-semibold text-[#39423b]">
                  Your cart is empty
                </h2>

                <p className="mt-2 text-sm text-[#7b8178]">
                  Add your favourite coffee to continue.
                </p>

                <Link
                  href="/menu"
                  className="mt-6 inline-block rounded-full bg-[#40594b] px-7 py-3 text-sm font-semibold text-white transition hover:bg-[#33483c]"
                >
                  Browse Menu
                </Link>

              </div>

            ) : (

              <div>

                {cart.map((item) => (

                  <article
                    key={item.id}
                    className="border-b border-[#ded9ce] py-5 first:pt-2 last:border-b-0"
                  >

                    <div className="flex gap-4">

                      {/* IMAGE */}

                      <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-[#e1e6dc] sm:h-28 sm:w-28">

                        {item.image ? (

                          <img
                            src={item.image}
                            alt={item.name}
                            className="h-full w-full object-cover"
                          />

                        ) : (

                          <div className="flex h-full w-full items-center justify-center text-3xl">
                            ☕
                          </div>

                        )}

                      </div>

                      {/* PRODUCT DETAILS */}

                      <div className="min-w-0 flex-1">

                        <div className="flex justify-between gap-3">

                          <div>

                            <h3 className="text-lg font-semibold text-[#39423b]">
                              {item.name}
                            </h3>

                            {item.description && (
                              <p className="mt-1 line-clamp-2 text-sm text-[#858a82]">
                                {item.description}
                              </p>
                            )}

                            <p className="mt-2 text-sm text-[#69766a]">
                              ₹{item.price}
                            </p>

                          </div>

                          {/* DELETE */}

                          <button
                            type="button"
                            onClick={() =>
                              remove(item.id)
                            }
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#7b8178] transition hover:bg-[#e1e6dc] hover:text-[#40594b]"
                            aria-label={`Remove ${item.name}`}
                          >
                            🗑
                          </button>

                        </div>

                        {/* QUANTITY */}

                        <div className="mt-5 flex items-center justify-between">

                          <div className="flex items-center rounded-full border border-[#cfd5ca] bg-[#f4f5ef]">

                            <button
                              type="button"
                              onClick={() =>
                                subtract(item.id)
                              }
                              className="flex h-9 w-9 items-center justify-center rounded-full text-lg text-[#40594b] transition hover:bg-[#e1e6dc]"
                            >
                              −
                            </button>

                            <span className="w-8 text-center text-sm font-semibold text-[#39423b]">
                              {item.quantity}
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                add(item.id)
                              }
                              className="flex h-9 w-9 items-center justify-center rounded-full text-lg text-[#40594b] transition hover:bg-[#e1e6dc]"
                            >
                              +
                            </button>

                          </div>

                          <p className="font-semibold text-[#39423b]">
                            ₹
                            {(
                              item.price *
                              item.quantity
                            ).toFixed(0)}
                          </p>

                        </div>

                      </div>

                    </div>

                  </article>

                ))}

              </div>

            )}

            {/* CONTINUE SHOPPING */}

            <Link
              href="/menu"
              className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[#40594b] hover:underline"
            >
              ← Continue Shopping
            </Link>

          </section>

          {/* ================= ORDER SUMMARY ================= */}

          <aside className="h-fit rounded-[28px] bg-[#e1e6dc] p-6 lg:sticky lg:top-24">

            <h2 className="text-2xl font-semibold text-[#39423b]">
              Order Summary
            </h2>

            <div className="mt-7 space-y-4">

              <div className="flex justify-between text-sm text-[#6f786f]">
                <span>Subtotal</span>
                <span>
                  ₹{subtotal.toFixed(0)}
                </span>
              </div>

              <div className="flex justify-between text-sm text-[#6f786f]">
                <span>Tax</span>
                <span>
                  ₹{tax.toFixed(0)}
                </span>
              </div>

              <div className="border-t border-[#c6cec1] pt-5">

                <div className="flex items-center justify-between">

                  <span className="font-semibold text-[#39423b]">
                    Total
                  </span>

                  <span className="text-2xl font-semibold text-[#39423b]">
                    ₹{grandTotal.toFixed(0)}
                  </span>

                </div>

              </div>

            </div>

            <button
              type="button"
              className="mt-7 w-full rounded-full bg-[#40594b] py-4 text-sm font-semibold text-white transition hover:bg-[#33483c]"
            >
              Checkout →
            </button>

          </aside>

        </div>

        {/* ================= YOU MAY ALSO LIKE ================= */}

        <section className="mt-14 pb-10">

          <div className="mb-7 text-center">

            <p className="text-xs uppercase tracking-[0.2em] text-[#788578]">
              Complete Your Order
            </p>

            <h2 className="mt-2 text-2xl font-semibold text-[#39423b] sm:text-3xl">
              You May Also Like
            </h2>

          </div>

          {recommend.length > 0 ? (

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">

              {recommend.map((item) => (

                <div
                  key={item.id}
                  className="overflow-hidden rounded-3xl border border-[#ddd7ca] bg-[#fbf7ef] transition duration-300 hover:-translate-y-1 hover:shadow-md"
                >

                  {/* IMAGE */}

                  <div className="h-40 w-full overflow-hidden bg-[#e1e6dc]">

                    {item.imageUrl ? (

                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-full w-full object-cover transition duration-300 hover:scale-105"
                      />

                    ) : (

                      <div className="flex h-full items-center justify-center text-5xl">
                        ☕
                      </div>

                    )}

                  </div>

                  {/* INFO */}

                  <div className="p-5">

                    <div className="flex items-start justify-between gap-3">

                      <div className="min-w-0">

                        <h3 className="truncate text-lg font-semibold text-[#39423b]">
                          {item.name}
                        </h3>

                        {item.description && (
                          <p className="mt-1 line-clamp-1 text-sm text-[#7b8178]">
                            {item.description}
                          </p>
                        )}

                      </div>

                      <span className="whitespace-nowrap font-semibold text-[#40594b]">
                        ₹{item.price}
                      </span>

                    </div>

                    {/* ADD */}

                    <button
                      type="button"
                      onClick={() =>
                        addRecommended(item)
                      }
                      className="mt-4 w-full rounded-full bg-[#e1e6dc] py-2.5 text-sm font-semibold text-[#40594b] transition hover:bg-[#40594b] hover:text-white"
                    >
                      + Add to Cart
                    </button>

                  </div>

                </div>

              ))}

            </div>

          ) : (

            <p className="text-center text-sm text-[#7b8178]">
              No products available.
            </p>

          )}

          {/* CONTINUE SHOPPING */}

          <div className="mt-9 text-center">

            <Link
              href="/menu"
              className="inline-flex items-center gap-2 rounded-full border border-[#40594b] px-7 py-3 text-sm font-semibold text-[#40594b] transition hover:bg-[#40594b] hover:text-white"
            >
              <span>←</span>
              Continue Shopping
            </Link>

          </div>

        </section>

      </div>

    </main>
  );
}