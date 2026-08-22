"use client";

import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#f8f3ed] px-4 py-10 text-[#3b2115] md:px-10">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/settings"
            className="text-sm font-medium text-[#80695b] hover:text-[#3b2115]"
          >
            ← Back to Settings
          </Link>

          <h1 className="mt-5 text-4xl font-bold">
            Terms & Conditions
          </h1>

          <p className="mt-2 text-[#80695b]">
            Please read these terms carefully before using Coffee Shop.
          </p>
        </div>

        {/* Content */}
        <div className="space-y-6 rounded-3xl bg-white p-6 shadow-sm md:p-10">
          <section>
            <h2 className="mb-2 text-xl font-bold">
              1. Acceptance of Terms
            </h2>
            <p className="leading-7 text-[#6f5849]">
              By using Coffee Shop, you agree to these Terms & Conditions.
              If you do not agree with these terms, please do not use our
              website or services.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-bold">
              2. User Account
            </h2>
            <p className="leading-7 text-[#6f5849]">
              You are responsible for keeping your account information
              accurate and secure. You are responsible for all activity
              performed through your account.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-bold">
              3. Orders
            </h2>
            <p className="leading-7 text-[#6f5849]">
              Orders can be placed through our website. Product availability,
              prices, and order details may change from time to time.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-bold">
              4. Payments
            </h2>
            <p className="leading-7 text-[#6f5849]">
              We support the payment methods displayed during checkout.
              Online payments are processed securely through our payment
              provider.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-bold">
              5. Coupons & Discounts
            </h2>
            <p className="leading-7 text-[#6f5849]">
              Coupons are subject to their individual conditions, expiry
              dates, minimum order amounts, and availability. A coupon may
              only be used when all applicable conditions are satisfied.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-bold">
              6. Cancellation & Refund
            </h2>
            <p className="leading-7 text-[#6f5849]">
              Order cancellation and refund availability depend on the order
              status and applicable policies.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-bold">
              7. Product Information
            </h2>
            <p className="leading-7 text-[#6f5849]">
              We try to keep product information, images, prices, and
              availability accurate. However, minor differences may occur.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-bold">
              8. User Responsibilities
            </h2>
            <p className="leading-7 text-[#6f5849]">
              Users must provide correct information and must not misuse the
              website, attempt unauthorized access, or interfere with the
              services.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-bold">
              9. Privacy
            </h2>
            <p className="leading-7 text-[#6f5849]">
              Your personal information is handled according to our privacy
              practices and applicable policies.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-bold">
              10. Changes to Terms
            </h2>
            <p className="leading-7 text-[#6f5849]">
              We may update these Terms & Conditions when necessary. Updated
              terms will be available on this page.
            </p>
          </section>

          <section className="border-t border-[#eee4da] pt-6">
            <h2 className="mb-2 text-xl font-bold">
              Contact Us
            </h2>

            <p className="leading-7 text-[#6f5849]">
              If you have questions about these Terms & Conditions, please
              contact the Coffee Shop support team.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}