import type { Metadata, Viewport } from "next";
import { Fraunces, Inter, Playfair_Display, Spirax } from "next/font/google";
import "./globals.css";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import StickyCartBar from "./components/StickyCartBar";
import CartBarSpacer from "./components/CartBarSpacer";
import { CartProvider } from "./context/CartContext";

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-brand",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
});

const spirax = Spirax({
  variable: "--font-tagline",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "Green Pizzeria - A Slice of Italy",
  description: "100% vegetarian Napoletana pizza, made fresh for you.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const htmlClass = fraunces.variable + " " + inter.variable + " " + playfair.variable + " " + spirax.variable + " h-full antialiased";
  return (
    <html lang="en" className={htmlClass}>
      <body className="min-h-full flex flex-col bg-cream text-dark font-body">
        <CartProvider>
          <Navbar />
          {children}
          <CartBarSpacer />
          <Footer />
          <StickyCartBar />
        </CartProvider>
      </body>
    </html>
  );
}
