import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Printer, Check, Package, CreditCard, Sparkles } from "lucide-react";
import { ScribbleDoodles, HalftoneOverlay } from "@/components/photobooth/ScribbleDoodles";

const WHATSAPP_NUMBER = "918178801635"; // TODO: replace with your WhatsApp number, e.g. 919876543210

const PRINT_OPTIONS = [
  {
    id: "normal",
    name: "Normal prints (3 photostrips / poloroids)",
    desc: "Any 3 photos on standard paper",
    price: 99,
  },
  {
    id: "laminated",
    name: "Laminated prints (3 photostrips/poloroids)",
    desc: "Any 3 photos with lamination",
    price: 149,
  },
  {
    id: "bookmark",
    name: "Bookmark with ribbon (3 photostrips/poloroids)",
    desc: "Cute bookmark style with ribbon with a hand written qoute on back",
    price: 199,
  },
];

const SHIPPING_CHARGE = 79;

const PrintOrder = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedSize, setSelectedSize] = useState(PRINT_OPTIONS[0].id);
  const [quantity, setQuantity] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    address: "",
    city: "",
    zip: "",
  });

  const selected = PRINT_OPTIONS.find((s) => s.id === selectedSize)!;
  const subtotal = selected.price * quantity;
  const totalWithShipping = subtotal + SHIPPING_CHARGE;

  const handleSubmit = () => {
    // Build WhatsApp message with order + shipping details
    const lines = [
      "Hi MagzMe i want to place order for 📸",
      "",
      `Product: ${selected.name}`,
      `Pack contains: 3 photos`,
      `Quantity (packs): ${quantity}`,
      `Subtotal: ₹${subtotal}`,
      `Shipping: ₹${SHIPPING_CHARGE}`,
      `Total: ₹${totalWithShipping}`,
      "",
      "Customer details:",
      `Name: ${formData.name || "-"}`,
      `Email: ${formData.email || "-"}`,
      `Address: ${formData.address || "-"}`,
      `City: ${formData.city || "-"}`,
      `PIN code: ${formData.zip || "-"}`,
    ];

    const text = encodeURIComponent(lines.join("\n"));
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
    window.open(url, "_blank");

    setStep(3);
  };

  return (
    <div className="min-h-screen bg-background grain-overlay relative overflow-hidden">
      <ScribbleDoodles variant="minimal" />
      <HalftoneOverlay />

      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/80 backdrop-blur-sm relative z-20">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-display text-xl text-primary">MagzME</span>
        </button>
        <div className="flex items-center gap-2 font-display text-sm text-muted-foreground">
          <Printer className="w-4 h-4" />
          Print Order
        </div>
      </header>

      <div className="relative z-10 max-w-lg mx-auto px-4 py-8">
        {/* Progress steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <motion.div
                animate={{
                  scale: step === s ? 1.1 : 1,
                  backgroundColor: step >= s ? "hsl(350, 75%, 60%)" : "hsl(40, 20%, 90%)",
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ color: step >= s ? "white" : "hsl(350, 15%, 45%)" }}
              >
                {step > s ? <Check className="w-4 h-4" /> : s}
              </motion.div>
              {s < 3 && (
                <div
                  className="w-12 h-0.5 rounded"
                  style={{
                    backgroundColor: step > s ? "hsl(350, 75%, 60%)" : "hsl(40, 20%, 90%)",
                  }}
                />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="space-y-6"
            >
              <div>
                <h2 className="font-display text-2xl text-foreground mb-1">Choose Print Type</h2>
                <p className="text-sm text-muted-foreground font-body">
                  All options are packs of 3 photos
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {PRINT_OPTIONS.map((size) => (
                  <motion.button
                    key={size.id}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setSelectedSize(size.id)}
                    className={`p-4 rounded-2xl text-left transition-all border-2 ${
                      selectedSize === size.id
                        ? "border-primary bg-primary/10 retro-shadow"
                        : "border-border bg-card hover:border-primary/30"
                    }`}
                  >
                    <p className="font-display text-lg text-foreground">{size.name}</p>
                    <p className="text-xs text-muted-foreground font-body">{size.desc}</p>
                    <p className="font-display text-primary mt-2">₹{size.price}</p>
                  </motion.button>
                ))}
              </div>

              <div className="flex items-center gap-4 bg-card p-4 rounded-2xl border border-border">
                <span className="font-body font-semibold text-sm text-foreground">Quantity:</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-8 rounded-full bg-muted hover:bg-primary/20 font-bold text-foreground transition-colors"
                  >
                    −
                  </button>
                  <span className="font-display text-lg w-8 text-center text-foreground">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(10, quantity + 1))}
                    className="w-8 h-8 rounded-full bg-muted hover:bg-primary/20 font-bold text-foreground transition-colors"
                  >
                    +
                  </button>
                </div>
                <span className="ml-auto font-display text-xl text-primary">₹{subtotal}</span>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setStep(2)}
                className="w-full bg-primary text-primary-foreground font-display text-lg py-4 rounded-2xl retro-shadow-lg flex items-center justify-center gap-2"
              >
                <Package className="w-5 h-5" />
                Continue to Shipping
              </motion.button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="space-y-6"
            >
              <div>
                <h2 className="font-display text-2xl text-foreground mb-1">Shipping Details</h2>
                <p className="text-sm text-muted-foreground font-body">Where should we send your prints?</p>
              </div>

              <div className="space-y-3">
                {[
                  { key: "name", label: "Full Name", placeholder: "Jane Doe" },
                  { key: "email", label: "Email", placeholder: "jane@email.com" },
                  { key: "address", label: "Address", placeholder: "123 Photo Lane" },
                  { key: "city", label: "City", placeholder: "Los Angeles" },
                  { key: "zip", label: "ZIP Code", placeholder: "90001" },
                ].map((field) => (
                  <div key={field.key}>
                    <label className="text-xs font-body font-semibold text-muted-foreground mb-1 block">
                      {field.label}
                    </label>
                    <input
                      type="text"
                      placeholder={field.placeholder}
                      value={formData[field.key as keyof typeof formData]}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, [field.key]: e.target.value }))
                      }
                      className="w-full px-4 py-3 rounded-xl border-2 border-border bg-card text-foreground font-body text-sm focus:border-primary focus:outline-none transition-colors"
                    />
                  </div>
                ))}
              </div>

              <div className="bg-card p-4 rounded-2xl border border-border space-y-2">
                <div className="flex justify-between text-sm font-body">
                  <span className="text-muted-foreground">
                    {selected.name} × {quantity}
                  </span>
                  <span className="text-foreground font-semibold">₹{subtotal}</span>
                </div>
                <div className="flex justify-between text-sm font-body">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="text-foreground font-semibold">₹{SHIPPING_CHARGE}</span>
                </div>
                <div className="border-t border-border pt-2 flex justify-between">
                  <span className="font-display text-foreground">Total</span>
                  <span className="font-display text-xl text-primary">
                    ₹{totalWithShipping}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-3 rounded-xl border-2 border-border text-foreground font-body font-semibold hover:bg-muted transition-colors"
                >
                  Back
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSubmit}
                  className="flex-1 bg-primary text-primary-foreground font-display text-lg py-3 rounded-2xl retro-shadow flex items-center justify-center gap-2"
                >
                  <CreditCard className="w-5 h-5" />
                  Place Order
                </motion.button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6 py-8"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                className="w-20 h-20 mx-auto bg-accent rounded-full flex items-center justify-center"
              >
                <Check className="w-10 h-10 text-accent-foreground" />
              </motion.div>

              <div>
                <h2 className="font-display text-3xl text-foreground mb-2">Order Placed! 🎉</h2>
                <p className="text-muted-foreground font-body">
                  Your prints are being prepared with love ✨
                </p>
              </div>

              <div className="bg-card p-4 rounded-2xl border border-border text-left space-y-1 text-sm font-body">
                <p className="text-muted-foreground">
                  Order #MZ-{Math.random().toString(36).slice(2, 8).toUpperCase()}
                </p>
                <p className="text-foreground font-semibold">
                  {selected.name} × {quantity} — ₹{totalWithShipping}
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate("/")}
                  className="w-full bg-primary text-primary-foreground font-display text-lg py-4 rounded-2xl retro-shadow-lg flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-5 h-5" />
                  Create Another Design
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PrintOrder;
