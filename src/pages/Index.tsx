import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Camera, Sparkles } from "lucide-react";
// Replace with your image: add file to src/assets/ and update path below (e.g. hero-image.png)
import cameraImg from "@/assets/photobooth.png";
import { ScribbleDoodles, ComicBubble, HalftoneOverlay } from "@/components/photobooth/ScribbleDoodles";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background grain-overlay overflow-hidden relative">
      <ScribbleDoodles />
      <HalftoneOverlay />

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-8">
        {/* Logo */}
        <motion.h1
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="font-display text-6xl md:text-8xl text-primary tracking-tight mb-1"
          style={{ textShadow: "4px 4px 0px hsl(350 30% 12% / 0.15)" }}
        >
          MagzME
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-6"
        >
          <ComicBubble text="Your cute digital photobooth ✨" />
        </motion.div>

        {/* Camera illustration */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, type: "spring", stiffness: 100 }}
          className="relative mb-10"
        >
          <div className="absolute -inset-4 rounded-full bg-retro-yellow/20 blur-2xl -z-10" />
          <motion.img
            src={cameraImg}
            alt="Photobooth Camera"
            className="w-48 h-48 md:w-64 md:h-64 object-contain drop-shadow-xl"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Pop-art dots around camera */}
          <motion.div
            className="absolute -top-4 -right-6 w-6 h-6 rounded-full bg-coral/50 border-2 border-foreground/10"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.div
            className="absolute -bottom-2 -left-4 w-4 h-4 rounded-full bg-accent/50 border-2 border-foreground/10"
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
          />
          <motion.div
            className="absolute top-1/2 -right-8 w-3 h-3 rounded-full bg-retro-purple/50"
            animate={{ scale: [1, 1.4, 1] }}
            transition={{ duration: 1.8, repeat: Infinity, delay: 1 }}
          />
        </motion.div>

        {/* Mode buttons */}
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md px-4">
          <motion.button
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.6, type: "spring" }}
            whileHover={{ scale: 1.05, rotate: -1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/editor?mode=strip")}
            className="flex-1 bg-primary text-primary-foreground font-display text-xl py-5 px-8 rounded-2xl retro-shadow-lg hover:brightness-110 transition-all flex items-center justify-center gap-3 border-2 border-foreground/10"
          >
            <Camera className="w-6 h-6" />
            Get Photostrips
          </motion.button>

          <motion.button
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.7, type: "spring" }}
            whileHover={{ scale: 1.05, rotate: 1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/editor?mode=polaroid")}
            className="flex-1 bg-coral text-primary-foreground font-display text-xl py-5 px-8 rounded-2xl retro-shadow-lg hover:brightness-110 transition-all flex items-center justify-center gap-3 border-2 border-foreground/10"
          >
            <Sparkles className="w-6 h-6" />
            Get Polaroid
          </motion.button>
        </div>

        {/* Scribble divider */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.9, duration: 0.5 }}
          className="mt-8 w-48"
        >
          <svg viewBox="0 0 200 12" fill="none" className="w-full">
            <path d="M5 6 Q30 2 50 6 Q70 10 100 6 Q130 2 150 6 Q170 10 195 6" stroke="hsl(350, 75%, 60%)" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
          </svg>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-4 text-muted-foreground text-sm font-marker"
        >
          snap • edit • download • slay 💅
        </motion.p>
      </div>
    </div>
  );
};

export default Index;
