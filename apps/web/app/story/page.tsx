export default function StoryPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-semibold mb-6">Our story</h1>

      <p className="text-muted mb-4">
        Green Pizzeria was born out of a simple idea: pizza in India deserves to
        be made the way it is in Naples - hand-stretched, wood-fired, and built
        on honest ingredients, with nothing to hide behind heavy toppings or
        shortcuts.
      </p>

      <p className="text-muted mb-4">
        Every pizza we make starts with a slow-proofed Napoletana dough, topped
        with fresh vegetables, quality cheese, and sauces made in-house. We are
        proud to be a 100% vegetarian kitchen - it is not a limitation, it is a
        craft, and we have spent real time getting the balance of flavour and
        texture right without ever reaching for meat as a shortcut.
      </p>

      <p className="text-muted mb-4">
        We are based in Ashok Vihar, Delhi, and we bake, box and deliver every
        order ourselves - no matter if you are dining in, picking up, or having
        it delivered to your door. From our combos to our build-your-own options,
        everything on the menu is designed to be shared, customised, and enjoyed
        fresh out of the oven.
      </p>

      <p className="text-muted mb-4">
        Whether it is a quiet weeknight dinner or a celebration with friends, our
        goal is the same every time: a genuinely good, honest slice of Italy,
        made fresh for you.
      </p>

      <h2 className="text-xl font-semibold mt-10 mb-3">What makes us different</h2>
      <ul className="text-muted space-y-2 list-disc pl-5">
        <li>100% vegetarian kitchen, every single item on the menu</li>
        <li>Hand-stretched, wood-fired Napoletana-style dough</li>
        <li>Fresh, in-house sauces and no artificial shortcuts</li>
        <li>Dine-in, takeaway, and delivery - all made and packed with the same care</li>
        <li>Combos and customisable options built for sharing</li>
      </ul>

      <h2 className="text-xl font-semibold mt-10 mb-3">Get in touch</h2>
      <p className="text-muted">
        Have a question, feedback, or a special request? We would love to hear
        from you - visit our{" "}
        <a href="/contact" className="text-green-600 font-medium">Contact page</a>
        {" "}for our phone, email, and address.
      </p>
    </div>
  );
}