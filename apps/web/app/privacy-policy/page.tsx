export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold mb-2">Privacy Policy</h1>
      <p className="text-xs text-muted mb-6">Last updated: 21 September 2026</p>

      <p className="text-sm text-muted mb-4">
        Green Pizzeria (we, us, our) operates this website and mobile experience
        to let you browse our menu, place orders, and manage your account. This
        page explains what information we collect, how we use it, and the
        choices you have.
      </p>

      <h2 className="text-lg font-medium mt-6 mb-2">Information we collect</h2>
      <p className="text-sm text-muted mb-3">
        When you create an account or place an order, we collect your name,
        email address or phone number, delivery address, and order details
        (items, quantities, special instructions). We do not store your card
        or UPI details ourselves; payments are processed securely by our
        payment partner, Razorpay, under their own privacy and security
        standards.
      </p>

      <h2 className="text-lg font-medium mt-6 mb-2">How we use your information</h2>
      <p className="text-sm text-muted mb-3">
        We use your information to process and deliver your orders, send order
        and account-related updates, respond to reviews and complaints you
        submit, and improve our menu and service. We do not sell your personal
        information to third parties.
      </p>

      <h2 className="text-lg font-medium mt-6 mb-2">Sharing your information</h2>
      <p className="text-sm text-muted mb-3">
        We share the minimum necessary information with delivery partners (to
        complete your delivery) and our payment processor, Razorpay (to
        process your payment). We do not share your information with
        advertisers.
      </p>

      <h2 className="text-lg font-medium mt-6 mb-2">Cookies and sessions</h2>
      <p className="text-sm text-muted mb-3">
        We use secure, httpOnly cookies to keep you logged in. These cookies
        are necessary for the site to function and are not used for
        advertising or cross-site tracking.
      </p>

      <h2 className="text-lg font-medium mt-6 mb-2">Your choices</h2>
      <p className="text-sm text-muted mb-3">
        You can review and update your name and phone number from your
        Account page at any time. To request deletion of your account and
        associated personal data, please contact us using the details below.
      </p>

      <h2 className="text-lg font-medium mt-6 mb-2">Contact us</h2>
      <p className="text-sm text-muted mb-3">
        If you have questions about this Privacy Policy or how your data is
        handled, contact us at Ashok Vihar, New Delhi, call{" "}
        <a href="tel:+919711806505" className="text-green-600 font-medium">
          +91 97118 06505
        </a>
        , or email{" "}
        <a href="mailto:Greenpizzeria01@gmail.com" className="text-green-600 font-medium">
          Greenpizzeria01@gmail.com
        </a>
        .
      </p>

      <h2 className="text-lg font-medium mt-6 mb-2">Grievance Officer</h2>
      <p className="text-sm text-muted mb-3">
        In accordance with applicable Indian data protection law, the
        Grievance Officer for Green Pizzeria can be reached as follows:
      </p>
      <p className="text-sm text-muted mb-3">
        Green Pizzeria Support Team
        <br />
        Ashok Vihar, New Delhi
        <br />
        Phone:{" "}
        <a href="tel:+919711806505" className="text-green-600 font-medium">
          +91 97118 06505
        </a>
        <br />
        Email:{" "}
        <a href="mailto:Greenpizzeria01@gmail.com" className="text-green-600 font-medium">
          Greenpizzeria01@gmail.com
        </a>
      </p>
      <p className="text-sm text-muted mb-3">
        We aim to acknowledge grievances within 48 hours and resolve them
        within 30 days, in line with applicable regulatory timelines.
      </p>

      <h2 className="text-lg font-medium mt-6 mb-2">Changes to this policy</h2>
      <p className="text-sm text-muted mb-3">
        We may update this Privacy Policy from time to time. Any changes will
        be posted on this page with an updated revision date.
      </p>
    </div>
  );
}
