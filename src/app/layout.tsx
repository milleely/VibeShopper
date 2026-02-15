import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "VibeShopper — Shopify Store Analyzer",
  description:
    "AI-powered Shopify store audit. Browse your store like a first-time customer and get a prioritized conversion report.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased bg-bg-app`}>
        {children}
      </body>
    </html>
  );
}
