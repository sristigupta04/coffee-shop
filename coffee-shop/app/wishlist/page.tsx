"use client"

import {useEffect, useState} from "react";
import {useRouter} from "next/navigation";
import Image from "next/image";
import Link from "next/link";


import {Heart, ShoppingCart, Trash2 ,ArrowLeft, Loader2 , Coffee} from "lucide-react"; 


import {useSession} from "next-auth/react";
type Product ={
    id:string;
    name:string;
    description:string;
    price:number;
    image:string;
    category:string;
    stock:number;
    isAvailable:boolean;
}
type WishlistItem ={
    id:string;
    product:Product;
    createdAt:string;
    productId:string;
}

export default function WishlistPage(){
    const router = useRouter();
    const {status, data:session} = useSession();
    const [items, setItems] = useState<WishlistItem[]>([]);
    const[loading, setLoading] = useState<boolean>(true);
    const [removing, setRemoving] = useState<string | null>(null);
    const [cartLoading, setCartLoading] = useState<string | null>(null);

    useEffect(()=>{
    if(status === "loading") return;


    if(status === "unauthenticated"){
        router.push("/login");
        return;
    }
    const fetchWishlist = async()=>{
        try{
            const res = await fetch("/api/wishlist");
            if(!res.ok){
                throw new Error("Failed to fetch wishlist");
            }
            const data = await res.json();
            setItems(data.data || []);
        } catch (error) {
            console.error("Error fetching wishlist:", error);
        } finally{
            setLoading(false);
        }
    }

    fetchWishlist();
    }, [status, router]);

    const removeFromWishlist = async(productId:string)=>{
        setRemoving(productId);
        try{
            const res = await fetch(`/api/wishlist/${productId}`, {
                method:"DELETE",
                headers:{
                    "Content-Type":"application/json",
                },
                body: JSON.stringify({productId}),
            });
            const data = await res.json();

            if(!res.ok){
                alert(data.message || "Failed to remove from wishlist");
                return;
            }
            setItems(items.filter(item => item.productId !== productId));
        } catch (error) {
            console.error("Error removing from wishlist:", error);
        } finally {
            setRemoving(null);
        }
    }
    const addToCart = async(productId:string)=>{
        setCartLoading(productId);
        try{
            const res = await fetch("/api/cart", {
                method:"POST",
                headers:{
                    "Content-Type":"application/json",
                },
                body: JSON.stringify({productId, quantity:1}),
            });
            const data = await res.json();
            if(!res.ok){
                alert(data.message || "Failed to add to cart");
                return;
            }
            await removeFromWishlist(productId);

        } catch (error) {
            console.error("Error adding to cart:", error);
        } finally {
            setCartLoading(null);
        }
    }


    if(loading || status === "loading"){
        return (
            <main className="min-h-screen bg-[#120805] text-[#f5e1ca]">
                <div className="flex min-h-screen items-center justify-center">
                    <div className="flex items-center gap-3 text-[#d27a25]">
                        <Loader2 size={25} className="animate-spin"/>
                        <span className="text-lg font-semibold">Loading...</span>
                    </div>
                </div>
            </main>
        )
    }
    return(
        <main className="min-h-screen bg-[#120805] text-[#f5e1ca]">
            <section className="border-b border-[#3d271d] bg-[#f5e1ca]">
                <div className="mx-auto max-w-7xl px-6 py-8">
                    <Link href="/menu" 
                    className="mb-6 inline-flex items-center gap-2 text-sm text-[#bda493] transition hover:text-[#d27a25]">
                        <ArrowLeft size={16}/>
                        Back to Menu
                    </Link>
                    <div className ="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                        <div >
                            <div className="mb-3 flex items-center gap-3">
                                <Heart size={20} className="fill-[#b75d08] text-[#b75d08]"/>
                                <h1 className="font-(family-name:- 'Roboto', sans-serif) text-4xl font-bold text-[#3d271d] sm:text-5xl">My Wishlist</h1>

                            </div>
                            <p className="text-sm text-[#3d271d]">Your favorite items are here</p>
                        </div>

                        {items.length > 0 && (
                    <div className="rounded-full border border-[#684631] bg-[#2a1811] px-5 py-2 text-sm text-[#bda493] ">
                            {items.length} {items.length === 1 ? "item" : "items"}
                    </div>
                        )}
                    </div>
                </div>
            </section>
            <section className="mx-auto max-w-7xl px-6 py-10">
                {items.length === 0 ? (
            <div className="flex min-h-[500px] flex-col items-center justify-center rounded-3xl
            border border-[#3d271d] bg-[#21120c] px-6 text-center ">
                <div className="mb-6 flex h-24 w-24 items-center
                justify-center rounded-full bg-[#3d271d] text-[#bda493]">
                    <Heart size={40} className="fill-[#b75d08] text-[#b75d08]"/>
                    </div>
                    <h2 className="font-(family-name:- 'Roboto', sans-serif) mb-2 text-2xl font-bold text-[#3d271d]">Your wishlist is empty</h2>
                    <p className="mb-6 text-sm text-[#3d271d]">Browse our menu and add your favorite items to your wishlist.</p>
                    <Link href="/menu" className="rounded-full bg-[#b75d08] px-6 py-2 text-sm font-semibold text-[#f5e1ca] transition hover:bg-[#d27a25]">
                        Browse Menu
                    </Link>
            </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                     {items.map((item) => {
              const product = item.product;

              const isOutOfStock =
                product.stock <= 0 ||
                !product.isAvailable;
   return (
 <article key={item.id}
 className="group overflow-hidden rounded-2xl border border-[#3d271d] bg-[#21120c] transition hover:scale-[1.01]">
    <div className="relative aspect-square overflow-hidden bg-[#2a1811] w-full">
      {product.image ? (
        <Image src={product.image} alt={product.name}  
        fill
        sizes ="(max-width: 760px ) 100vw, (max-width: 1200px) 50vw, 25vw"
         className="object-cover transition duration-500 group-hover:scale-105"/>
        ):(
            <div className="flex h-full items-center justify-center">
                <Coffee size={40} className="text-[#bda493]"/>
            </div>
        )}
        <span className="absolute top-3 right-3 rounded-full bg-[#b75d08] px-3 py-1 text-xs font-semibold text-[#f5e1ca]">
            ₹{product.price.toFixed(2)}
        </span>
         <button
                      type="button"
                      onClick={() =>
                        removeFromWishlist(product.id)
                      }
                      disabled={removing === product.id}
                      aria-label="Remove from wishlist"
                      className="absolute left-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#120805]/85 text-[#e1b78f] backdrop-blur transition hover:bg-red-700 hover:text-white disabled:opacity-50"
                    >
                      {removing === product.id ? (
                        <Loader2
                          size={18}
                          className="animate-spin"
                        />
                      ) : (
                        <Trash2 size={18} />
                      )}
                    </button>

                    {/* OUT OF STOCK */}
                    {isOutOfStock && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <span className="rounded-full bg-black/80 px-4 py-2 text-sm font-semibold text-white">
                          Currently Unavailable
                        </span>
                      </div>
                    )}
                  </div>

                  {/* DETAILS */}
                  <div className="p-5">

                    <h2 className="line-clamp-1 text-lg font-semibold text-[#f5e1ca]">
                      {product.name}
                    </h2>

                    <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-[#a88d7a]">
                      {product.description}
                    </p>

                    <div className="mt-4 flex items-center justify-between">

                      <span className="text-xl font-bold text-[#d27a25]">
                        ₹{product.price.toFixed(2)}
                      </span>

                      <span className="text-xs text-[#927769]">
                        {product.stock > 0
                          ? `${product.stock} available`
                          : "Out of stock"}
                      </span>

                    </div>

                    {/* ACTIONS */}
                    <div className="mt-5 flex gap-2">

                      <button
                        type="button"
                        onClick={() =>
                          addToCart(product.id)
                        }
                        disabled={
                          isOutOfStock ||
                          cartLoading === product.id
                        }
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#b75d08] py-3 text-sm font-semibold text-white transition hover:bg-[#cf7319] disabled:cursor-not-allowed disabled:bg-[#51351f] disabled:text-[#927769]"
                      >
                        {cartLoading === product.id ? (
                          <>
                            <Loader2
                              size={17}
                              className="animate-spin"
                            />
                            Adding...
                          </>
                        ) : (
                          <>
                            <ShoppingCart size={17} />
                            Add to Cart
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          removeFromWishlist(product.id)
                        }
                        disabled={removing === product.id}
                        className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#684631] text-[#bda493] transition hover:border-red-700 hover:bg-red-900/20 hover:text-red-400"
                        aria-label="Remove"
                      >
                        <Trash2 size={17} />
                      </button>

                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
         
        
    