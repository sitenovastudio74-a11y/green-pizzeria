export default function RefundPolicyPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold mb-2">Cancellation and Refunds Policy</h1>
      <p className="text-xs text-muted mb-6">Last updated: 21 September 2026</p>

      <p className="text-sm text-muted mb-4">
        Because we prepare fresh food to order, our cancellation and refund
        windows are shorter than a typical retail store. This page explains
        exactly when a cancellation or refund is possible.
      </p>

      <h2 className="text-lg font-medium mt-6 mb-2">Cancelling an order</h2>
      <p className="text-sm text-muted mb-3">
        You can cancel an order for a full refund only while it is still in
        the "Confirmed" stage, before preparation has started. Once an order
        moves to "Preparing", it can no longer be cancelled, since the kitchen
        has already begun making your food. You can check your order's
        current stage at any time from the Track Order page.
      </p>

      <h2 className="text-lg font-medium mt-6 mb-2">If an item is unavailable</h2>
      <p className="text-sm text-muted mb-3">
        If we are unable to fulfil part or all of your order (for example, an
        item runs out after you've paid), we will cancel the affected part of
        the order and refund that amount in full. No action is required from
        you in this case.
      </p>

      <h2 className="text-lg font-medium mt-6 mb-2">Quality issues</h2>
      <p className="text-sm text-muted mb-3">
        If your order arrives incorrect, damaged, or with a genuine quality
        issue, please raise a complaint from your Account page within 24
        hours of delivery, including a description of the issue. We review
        every complaint and, where justified, issue a full or partial refund
        or a replacement at our discretion.
      </p>

      <h2 className="text-lg font-medium mt-6 mb-2">Failed or duplicate payments</h2>
      <p className="text-sm text-muted mb-3">
        If a payment is deducted from your account but your order does not
        show as confirmed, or if you are charged more than once for the same
        order, the excess amount will be automatically refunded to your
        original payment method by our payment partner, Razorpay, typically
        within 5 to 7 business days.
      </p>

      <h2 className="text-lg font-medium mt-6 mb-2">Refund timelines</h2>
      <p className="text-sm text-muted mb-3">
        Once a refund is approved on our end, it is initiated immediately.
        Depending on your bank or payment method, it typically reflects in
        your account within 5 to 7 business days.
      </p>

      <h2 className="text-lg font-medium mt-6 mb-2">Delivery delays</h2>
      <p className="text-sm text-muted mb-3">
        Delivery time estimates are not guarantees. A delay by itself is not
        grounds for a refund, but if a delay is excessive we encourage you to
        contact us and we will review it on a case-by-case basis.
      </p>

      <h2 className="text-lg font-medium mt-6 mb-2">How to request a refund</h2>
      <p className="text-sm text-muted mb-3">
        Raise a complaint from the "My complaints" section of your Account
        page, or visit our{" "}
        <a href="/contact" className="text-green-600 font-medium">
          Contact Us
        </a>{" "}
        page. Please include your order number.
      </p>
    </div>
  );
}
