import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-amber-950 text-white mt-16">
      <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* Logo */}
        <div>
          <h2 className="text-2xl font-bold">☕ Cafe</h2>
          <p className="mt-3 text-sm text-gray-300">
            Fresh coffee made with love. Enjoy every sip with us.
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Quick Links</h3>

          <div className="flex flex-col gap-2">
            <Link href="/">Home</Link>
            <Link href="/menu">Menu</Link>
            <Link href="/cart">Cart</Link>
            <Link href="/orders">Orders</Link>
          </div>
        </div>

        {/* Contact */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Contact</h3>

          <div className="flex flex-col gap-2">
            <p>Email: cafe@gmail.com</p>
            <p>Phone: +91 9876543210</p>
            <Link href="/">Instagram</Link>
            <Link href="/">Facebook</Link>
          </div>
        </div>

        {/* Newsletter */}
        <div>
          <h3 className="text-lg font-semibold mb-3">
            Subscribe
          </h3>

          <input
            type="email"
            placeholder="Enter your email"
            className="w-full p-2 rounded-md text-black bg-white outline-none"
          />

          <button className="w-full mt-3 bg-amber-600 hover:bg-amber-700 py-2 rounded-md font-semibold">
            Subscribe
          </button>
        </div>
      </div>

      {/* Bottom */}
      <div className="border-t border-amber-800 py-4 text-center text-sm text-gray-300">
        <p>© 2026 Cafe. All Rights Reserved.</p>

        <div className="flex justify-center gap-6 mt-2">
          <Link href="/">Privacy Policy</Link>
          <Link href="/">Terms & Conditions</Link>
          <Link href="/">Refund Policy</Link>
        </div>
      </div>
    </footer>
  );
}