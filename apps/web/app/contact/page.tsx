export default function ContactPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold mb-2">Contact Us</h1>
      <p className="text-sm text-muted mb-8">
        Have a question about an order, a complaint, or anything else? We'd
        love to hear from you.
      </p>

      <div className="border rounded-lg p-5 mb-4">
        <h2 className="text-sm font-medium mb-1">Address</h2>
        <p className="text-sm text-muted">Ashok Vihar, New Delhi</p>
      </div>

      <div className="border rounded-lg p-5 mb-4">
        <h2 className="text-sm font-medium mb-1">Phone</h2>
        <p className="text-sm text-muted">
          <a href="tel:+919711806505" className="text-green-600 font-medium">
            +91 97118 06505
          </a>
        </p>
      </div>

      <div className="border rounded-lg p-5 mb-4">
        <h2 className="text-sm font-medium mb-1">Email</h2>
        <p className="text-sm text-muted">
          <a href="mailto:Greenpizzeria01@gmail.com" className="text-green-600 font-medium">
            Greenpizzeria01@gmail.com
          </a>
        </p>
      </div>

      <div className="border rounded-lg p-5">
        <h2 className="text-sm font-medium mb-1">Already have an order?</h2>
        <p className="text-sm text-muted">
          For faster help with an existing order, please raise a complaint
          from the "My complaints" section of your{" "}
          <a href="/account" className="text-green-600 font-medium">
            Account
          </a>{" "}
          page, including your order number.
        </p>
      </div>
    </div>
  );
}
