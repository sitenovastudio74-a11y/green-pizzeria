export default function TermsPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold mb-2">Terms and Conditions</h1>
      <p className="text-xs text-muted mb-6">Last updated: 21 September 2026</p>

      <p className="text-sm text-muted mb-4">
        These Terms and Conditions ("Terms") govern your use of the Green
        Pizzeria website and the ordering of food through it. By creating an
        account or placing an order, you agree to these Terms.
      </p>

      <h2 className="text-lg font-medium mt-6 mb-2">1. Account and eligibility</h2>
      <p className="text-sm text-muted mb-3">
        You must create an account with a valid email or phone number to
        place an order. You are responsible for keeping your login details
        confidential and for all activity under your account.
      </p>

      <h2 className="text-lg font-medium mt-6 mb-2">2. Orders and pricing</h2>
      <p className="text-sm text-muted mb-3">
        Prices shown on the menu are inclusive of applicable taxes unless
        stated otherwise, and a delivery fee applies to Delivery orders as
        shown at checkout. We reserve the right to correct pricing errors
        and to refuse or cancel an order (for example if an item becomes
        unavailable), in which case any amount paid will be refunded per our
        Cancellation and Refunds Policy.
      </p>

      <h2 className="text-lg font-medium mt-6 mb-2">3. Payments</h2>
      <p className="text-sm text-muted mb-3">
        We accept online payments only, processed securely through our
        payment partner, Razorpay. We do not store your card, UPI, or bank
        details on our servers.
      </p>

      <h2 className="text-lg font-medium mt-6 mb-2">4. Order fulfilment</h2>
      <p className="text-sm text-muted mb-3">
        Estimated preparation and delivery times shown on the app are
        estimates, not guarantees, and may vary due to order volume, weather,
        or circumstances beyond our control. You can track your order's
        status from the Track order page at any time after placing it.
      </p>

      <h2 className="text-lg font-medium mt-6 mb-2">5. Cancellations and refunds</h2>
      <p className="text-sm text-muted mb-3">
        Cancellation and refund terms are described in detail in our{" "}
        <a href="/refund-policy" className="text-green-600 font-medium">
          Cancellation and Refunds Policy
        </a>.
      </p>

      <h2 className="text-lg font-medium mt-6 mb-2">6. Reviews and conduct</h2>
      <p className="text-sm text-muted mb-3">
        If you submit a review or complaint, it must be honest, based on your
        own experience, and free of abusive or unlawful content. We reserve
        the right to remove content that violates this.
      </p>

      <h2 className="text-lg font-medium mt-6 mb-2">7. Limitation of liability</h2>
      <p className="text-sm text-muted mb-3">
        To the maximum extent permitted by law, Green Pizzeria's liability
        for any issue with an order is limited to the value of that order.
        We are not liable for indirect or consequential losses.
      </p>

      <h2 className="text-lg font-medium mt-6 mb-2">8. Changes to these Terms</h2>
      <p className="text-sm text-muted mb-3">
        We may update these Terms from time to time. Continued use of the
        website after changes are posted means you accept the updated Terms.
      </p>

      <h2 className="text-lg font-medium mt-6 mb-2">9. Contact us</h2>
      <p className="text-sm text-muted mb-3">
        For any questions about these Terms, please visit our{" "}
        <a href="/contact" className="text-green-600 font-medium">
          Contact Us
        </a>{" "}
        page.
      </p>
    </div>
  );
}
