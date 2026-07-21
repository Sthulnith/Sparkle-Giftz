export const Policies = () => {
  return (
    <div className="min-h-screen py-16 px-4 max-w-4xl mx-auto space-y-12">
      <section>
        <h1 className="text-3xl font-serif mb-4 gold-text-gradient">Terms of Service</h1>
        <p className="text-muted leading-relaxed">
          Welcome to Sparkle Giftz. By accessing our services, you agree to comply with our terms.
        </p>
      </section>
      <div className="section-divider"></div>
      <section>
        <h2 className="text-2xl font-serif mb-4 text-gold">Privacy Policy</h2>
        <p className="text-muted leading-relaxed">
          Your privacy is paramount. We only store data required for handling orders and communicating updates.
        </p>
      </section>
      <div className="section-divider"></div>
      <section>
        <h2 className="text-2xl font-serif mb-4 text-gold">Refund & Returns Policy</h2>
        <p className="text-muted leading-relaxed">
          As our items are custom curated and perishable, returns are generally not accepted unless an item arrives damaged.
        </p>
      </section>
    </div>
  );
};
