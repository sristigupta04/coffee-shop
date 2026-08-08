import type { Metadata } from "next";
import { Playfair_Display, Poppins } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/navbar";
import Footer from "@/components/Footer";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Coffee Shop",
  description: "Fresh coffee, made with love.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${poppins.variable}`}
    >
      <body className="min-h-screen bg-[#fffaf3] font-[family-name:var(--font-poppins)] text-[#4b2e1f]">
        <Navbar />

        <main className="min-h-[calc(100vh-80px)]">
          {children}
        </main>
        <Footer/>
      </body>
    </html>
  );
}