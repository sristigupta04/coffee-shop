"use client";

import { useState } from "react";

type Data = {
  id: number;
  name: string;
  description: string;
  phone: string;
  address: string;
  information: string;
};

type DataProp = {
  Info?: Data[];
};

export default function Privacy({ Info = [] }: DataProp) {
  const [data] = useState<Data[]>([
    {
      id: 1,
      name: "Privacy Policy",
      description:
        "We value your privacy and are committed to protecting your personal information. This Privacy Policy explains how we collect, use, and safeguard your data when you use our coffee shop.",
      phone: "123-456-7890",
      address: "123 Coffee Street, Brewtown, USA",
      information:
        "We collect information such as your name, email address, phone number, address, and payment details when you place an order or create an account.",
    },
  ]);

  const [pay, setPay] = useState(false);
  const [order, setOrder] = useState(false);
  const [download, setDownload] = useState(false);
  const [contact, setContact] = useState(false);
  const [cookies, setCookies] = useState(false);
  const [security, setSecurity] = useState(false);
  const [deletee, setDeletee] = useState(false);
  const [view, setView] = useState(false);

  const handleDelete = (id: number) => {
    if (data[0].id === id) {
      setDeletee(true);
    }
  };

  const handleView = (id: number) => {
    if (data[0].id === id) {
      setView(true);
    }
  };

  const handleDownload = () => {
    setDownload(true);

    const userData = JSON.stringify(data[0], null, 2);

    const blob = new Blob([userData], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "my-privacy-data.json";

    link.click();

    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen bg-[#f7f1e8] px-4 py-10 text-[#3e2723]">
      <div className="mx-auto max-w-4xl">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">
            Privacy
          </h1>

          <p className="mt-2 text-sm text-[#795548]">
            Manage your personal information and privacy settings.
          </p>
        </div>

        {/* Privacy Policy */}
        <section className="mb-5 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">
            Privacy Policy
          </h2>

          <p className="mt-3 leading-7 text-gray-600">
            {data[0].description}
          </p>

          <button
            onClick={() => handleView(data[0].id)}
            className="mt-5 rounded-xl bg-[#6f4e37] px-5 py-2 text-sm font-medium text-white hover:bg-[#5a3d2b]"
          >
            View Privacy Policy
          </button>

          {view && (
            <div className="mt-5 rounded-xl bg-[#f7f1e8] p-4">
              <p className="text-sm leading-6 text-gray-700">
                {data[0].information}
              </p>

              <button
                onClick={() => setView(false)}
                className="mt-3 text-sm font-medium text-[#6f4e37]"
              >
                Close
              </button>
            </div>
          )}
        </section>

        {/* Personal Information */}
        <section className="mb-5 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">
            Personal Information
          </h2>

          <p className="mt-2 text-sm text-gray-600">
            Your personal information is used to manage your account
            and deliver your orders.
          </p>

          <div className="mt-4 space-y-2 text-sm">
            <p>
              <strong>Name:</strong> {data[0].name}
            </p>

            <p>
              <strong>Phone:</strong> {data[0].phone}
            </p>

            <p>
              <strong>Address:</strong> {data[0].address}
            </p>
          </div>
        </section>

        {/* Payment Information */}
        <section className="mb-5 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">
            Payment Information
          </h2>

          <p className="mt-2 text-sm text-gray-600">
            Payment information is processed securely through the
            selected payment provider.
          </p>

          <button
            onClick={() => setPay(!pay)}
            className="mt-4 text-sm font-medium text-[#6f4e37]"
          >
            {pay ? "Hide Details" : "Learn More"}
          </button>

          {pay && (
            <p className="mt-3 rounded-lg bg-[#f7f1e8] p-3 text-sm">
              We do not store sensitive card information directly.
            </p>
          )}
        </section>

        {/* Order Information */}
        <section className="mb-5 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">
            Order Information
          </h2>

          <p className="mt-2 text-sm text-gray-600">
            Your order details are stored to provide order history,
            delivery and customer support.
          </p>

          <button
            onClick={() => setOrder(!order)}
            className="mt-4 text-sm font-medium text-[#6f4e37]"
          >
            {order ? "Hide Details" : "View Details"}
          </button>

          {order && (
            <div className="mt-3 rounded-lg bg-[#f7f1e8] p-3 text-sm">
              Your order information includes products, quantity,
              price and order status.
            </div>
          )}
        </section>

        {/* Cookies */}
        <section className="mb-5 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">
            Cookies
          </h2>

          <p className="mt-2 text-sm text-gray-600">
            Cookies may be used to remember preferences and improve
            your experience.
          </p>

          <button
            onClick={() => setCookies(!cookies)}
            className="mt-4 rounded-xl border border-[#6f4e37] px-4 py-2 text-sm text-[#6f4e37]"
          >
            {cookies ? "Cookies Enabled" : "Manage Cookies"}
          </button>
        </section>

        {/* Security */}
        <section className="mb-5 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">
            Security
          </h2>

          <p className="mt-2 text-sm text-gray-600">
            We take reasonable measures to protect your personal
            information.
          </p>

          <button
            onClick={() => setSecurity(!security)}
            className="mt-4 text-sm font-medium text-[#6f4e37]"
          >
            {security ? "Hide Security Info" : "Learn More"}
          </button>

          {security && (
            <p className="mt-3 rounded-lg bg-[#f7f1e8] p-3 text-sm">
              Your account should be protected with a strong password
              and secure authentication.
            </p>
          )}
        </section>

        {/* Download Data */}
        <section className="mb-5 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">
            Download My Data
          </h2>

          <p className="mt-2 text-sm text-gray-600">
            Download a copy of the personal information currently
            available in your account.
          </p>

          <button
            onClick={handleDownload}
            className="mt-5 rounded-xl bg-[#6f4e37] px-5 py-2 text-sm font-medium text-white hover:bg-[#5a3d2b]"
          >
            Download My Data
          </button>

          {download && (
            <p className="mt-3 text-sm text-green-700">
              Your data download has started.
            </p>
          )}
        </section>

        {/* Contact */}
        <section className="mb-5 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">
            Privacy Questions
          </h2>

          <p className="mt-2 text-sm text-gray-600">
            If you have any questions about your personal information,
            contact our support team.
          </p>

          <button
            onClick={() => setContact(!contact)}
            className="mt-4 rounded-xl border border-[#6f4e37] px-4 py-2 text-sm text-[#6f4e37]"
          >
            Contact Privacy Team
          </button>

          {contact && (
            <p className="mt-3 rounded-lg bg-[#f7f1e8] p-3 text-sm">
              Email: privacy@coffeeshop.com
            </p>
          )}
        </section>

        {/* Delete Account */}
        <section className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-red-700">
            Delete Account
          </h2>

          <p className="mt-2 text-sm text-gray-600">
            Permanently delete your account and associated information.
          </p>

          <button
            onClick={() => handleDelete(data[0].id)}
            className="mt-5 rounded-xl bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Delete Account
          </button>
        </section>

        {/* Delete Confirmation */}
        {deletee && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
              <h2 className="text-xl font-bold text-red-700">
                Delete Account?
              </h2>

              <p className="mt-3 text-sm text-gray-600">
                This action cannot be undone. Are you sure you want
                to delete your account?
              </p>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setDeletee(false)}
                  className="rounded-xl border px-4 py-2 text-sm"
                >
                  Cancel
                </button>

                <button
                  onClick={() => {
                    setDeletee(false);
                    alert("Account deletion will be connected to API later.");
                  }}
                  className="rounded-xl bg-red-600 px-4 py-2 text-sm text-white"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}