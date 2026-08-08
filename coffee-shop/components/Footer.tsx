import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-16 bg-[#4b2e1f] text-[#fffaf3]">

      {/* Main Footer */}
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-10 py-12 md:grid-cols-2 lg:grid-cols-4">

        {/* Brand */}
        <div>
          <h2 className="text-2xl font-bold">
            ☕ Coffee Shop
          </h2>

          <p className="mt-4 max-w-xs text-sm leading-6 text-[#dbc8b5]">
            Fresh coffee made with love. Enjoy every sip with us.
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h3 className="mb-4 text-lg font-semibold">
            Quick Links
          </h3>

          <div className="flex flex-col gap-3 text-sm text-[#dbc8b5]">
            <Link
              href="/"
              className="transition hover:text-white"
            >
              Home
            </Link>

            <Link
              href="/menu"
              className="transition hover:text-white"
            >
              Menu
            </Link>

            <Link
              href="/cart"
              className="transition hover:text-white"
            >
              Cart
            </Link>

            <Link
              href="/orders"
              className="transition hover:text-white"
            >
              Orders
            </Link>
          </div>
        </div>

        {/* Contact */}
        <div>
          <h3 className="mb-4 text-lg font-semibold">
            Contact
          </h3>

          <div className="flex flex-col gap-3 text-sm text-[#dbc8b5]">
            <p>Email: cafe@gmail.com</p>
            <p>Phone: +91 9876543210</p>

            <Link
              href="/"
              className="transition hover:text-white"
            >
              Instagram
            </Link>

            <Link
              href="/"
              className="transition hover:text-white"
            >
              Facebook
            </Link>
          </div>
        </div>

        {/* Newsletter */}
        <div>
          <h3 className="mb-4 text-lg font-semibold">
            Subscribe
          </h3>

          <p className="mb-4 text-sm text-[#dbc8b5]">
            Get updates about new coffee and offers.
          </p>

          <input
            type="email"
            placeholder="Enter your email"
            className="w-full rounded-lg border border-[#75523d] bg-[#5a3828] px-4 py-3 text-sm text-white outline-none placeholder:text-[#cdb9a7] focus:border-[#c58b5b]"
          />

          <button
            className="mt-3 w-full rounded-lg bg-[#a85d25] py-3 font-semibold transition hover:bg-[#c06d31]"
          >
            Subscribe
          </button>
        </div>

      </div>

      {/* Bottom */}
      <div className="border-t border-[#75523d] px-10 py-5 text-center">

        <p className="text-sm text-[#dbc8b5]">
          © 2026 Coffee Shop. All Rights Reserved.
        </p>

        <div className="mt-3 flex justify-center gap-6 text-sm text-[#dbc8b5]">
          <Link href="/" className="hover:text-white">
            Privacy Policy
          </Link>

          <Link href="/" className="hover:text-white">
            Terms & Conditions
          </Link>

          <Link href="/" className="hover:text-white">
            Refund Policy
          </Link>
        </div>

      </div>
    </footer>
  );
}