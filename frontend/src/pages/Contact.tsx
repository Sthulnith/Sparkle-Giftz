export const Contact = () => {
  return (
    <div className="min-h-screen py-16 px-4 max-w-4xl mx-auto">
      <h1 className="text-3xl font-serif mb-8 gold-text-gradient">Contact Sparkle Giftz</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <p className="text-ivory">Reach out for custom curations, corporate gifts, or order inquiries.</p>
          <div className="text-sm space-y-2">
            <p><strong className="text-gold">Address:</strong> 373, Pahala Bomiriya, Kaduwela, Sri Lanka</p>
            <p><strong className="text-gold">Email:</strong> sparklegiftzz1@gmail.com</p>
            <p><strong className="text-gold">Phone:</strong> +94 72 348 7062</p>
          </div>
        </div>
        <form className="space-y-4 gold-gradient-border p-6 rounded bg-charcoal">
          <input type="text" placeholder="Your Name" className="w-full bg-background border border-gold/30 p-2.5 rounded text-ivory outline-none" />
          <input type="email" placeholder="Your Email" className="w-full bg-background border border-gold/30 p-2.5 rounded text-ivory outline-none" />
          <textarea placeholder="Message" className="w-full bg-background border border-gold/30 p-2.5 rounded text-ivory outline-none h-32" />
          <button type="submit" className="w-full py-3 bg-gold hover:bg-gold-light text-background font-medium transition duration-300">Send Message</button>
        </form>
      </div>
    </div>
  );
};
