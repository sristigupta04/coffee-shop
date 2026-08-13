"use client";

import { useEffect, useState } from "react";

type Product = {
  id: string;
  name: string;
  price: number;
  description: string;
  image: string;
  category: string;
  stock: number;
  isAvailable: boolean;
};

const CATEGORIES = ["All", "Dessert", "Offers & Rarity"];

export default function OrdersPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("All");
  const [orderType, setOrderType] = useState("pickup");
  const [address, setAddress] = useState("");

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/products");
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        const result = await res.json();
        setProducts(result.products ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load products");
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const filteredProducts =
    activeCategory === "All"
      ? products
      : products.filter((p) => p.category === activeCategory);

  return (
    <div>
      <div className="store-address">
        <input
          type="text"
          placeholder="Enter your address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />

        <div className="stor-type">
          <select value={orderType} onChange={(e) => setOrderType(e.target.value)}>
            <option value="pickup">Pickup</option>
            <option value="delivery">Delivery</option>
          </select>
        </div>
      </div>

      <div className="nav-roder">
        {CATEGORIES.map((cat) => (
          <p
            key={cat}
            onClick={() => setActiveCategory(cat)}
            style={{
              fontWeight: activeCategory === cat ? "bold" : "normal",
              cursor: "pointer",
            }}
          >
            {cat}
          </p>
        ))}
      </div>

      {loading && <p>Loading products...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      <div className="order-item">
        {!loading && !error && filteredProducts.length === 0 && (
          <p>No products found.</p>
        )}
        {filteredProducts.map((product) => (
          <div key={product.id} style={{ opacity: product.isAvailable ? 1 : 0.5 }}>
            {product.image && <img src={product.image} alt={product.name} width={80} />}
            <h3>{product.name}</h3>
            <p>{product.description}</p>
            <p>₹{product.price}</p>
            {!product.isAvailable || product.stock === 0 ? (
              <p>Out of stock</p>
            ) : (
              <button>Add to order</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}