import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-dark text-cream-soft mt-24">
      <div className="max-w-6xl mx-auto px-6 py-14 grid grid-cols-2 md:grid-cols-4 gap-10">
        <div className="col-span-2 md:col-span-1">
          <p className="font-brand font-black not-italic text-2xl mb-3">Green Pizzeria</p>
          <p className="text-sm text-cream-soft/70">
            <span className="font-tagline text-lg">100% vegetarian Napoletana pizza, made fresh for you.</span>
          </p>
        </div>

        <div>
          <p className="text-sm mb-3 text-cream-soft/60">Explore</p>
          <div className="flex flex-col gap-2 text-sm">
            <Link href="/menu" className="hover:text-primary-soft transition-colors">Menu</Link>
            <Link href="/story" className="hover:text-primary-soft transition-colors">Our story</Link>
            <Link href="/offers" className="hover:text-primary-soft transition-colors">Offers</Link>
          </div>
        </div>

        <div>
          <p className="text-sm mb-3 text-cream-soft/60">Account</p>
          <div className="flex flex-col gap-2 text-sm">
            <Link href="/account" className="hover:text-primary-soft transition-colors">My orders</Link>
            <Link href="/track" className="hover:text-primary-soft transition-colors">Track order</Link>
          </div>
        </div>

        <div>
          <p className="text-sm mb-3 text-cream-soft/60">Contact</p>
          <div className="flex flex-col gap-2 text-sm text-cream-soft/80 min-w-0">
            <p>Ashok Vihar, New Delhi</p>
            <p>+91 97118 06505</p>
            <p className="break-words">greenpizzeria01@gmail.com</p>
          </div>
        </div>

        <div>
          <p className="text-sm mb-3 text-cream-soft/60">Legal</p>
          <div className="flex flex-col gap-2 text-sm">
            <Link href="/terms" className="hover:text-primary-soft transition-colors">Terms and Conditions</Link>
            <Link href="/privacy-policy" className="hover:text-primary-soft transition-colors">Privacy Policy</Link>
            <Link href="/refund-policy" className="hover:text-primary-soft transition-colors">Cancellation and Refunds</Link>
            <Link href="/contact" className="hover:text-primary-soft transition-colors">Contact Us</Link>
          </div>
        </div>
      </div>

      <div className="border-t border-cream-soft/10 py-5 text-center text-xs text-cream-soft/50">
        (c) 2026 Green Pizzeria. All rights reserved.
      </div>
    </footer>
  );
}
