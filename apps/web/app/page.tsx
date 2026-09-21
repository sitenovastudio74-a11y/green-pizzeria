import Hero from './components/Hero';
import CategoryRail from './components/CategoryRail';
import WhyUs from './components/WhyUs';
import FeaturedProducts from './components/FeaturedProducts';
import OrderCta from './components/OrderCta';

export default function Home() {
  return (
    <main className="flex-1">
      <Hero />
      <CategoryRail />
      <WhyUs />
      <FeaturedProducts />
      <OrderCta />
    </main>
  );
}
