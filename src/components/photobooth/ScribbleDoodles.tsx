import { motion } from "framer-motion";

// SVG pop-art scribble shapes
const scribbles = [
  // Zigzag
  (color: string) => (
    <svg viewBox="0 0 120 40" fill="none" className="w-full h-full">
      <path d="M5 35 L20 5 L35 35 L50 5 L65 35 L80 5 L95 35 L110 5" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  // Star burst
  (color: string) => (
    <svg viewBox="0 0 60 60" fill="none" className="w-full h-full">
      <path d="M30 5 L33 22 L50 15 L37 28 L55 30 L37 33 L50 45 L33 38 L30 55 L27 38 L10 45 L23 33 L5 30 L23 28 L10 15 L27 22 Z" stroke={color} strokeWidth="2" fill={color} fillOpacity="0.1" />
    </svg>
  ),
  // Squiggly line
  (color: string) => (
    <svg viewBox="0 0 120 30" fill="none" className="w-full h-full">
      <path d="M5 15 Q20 0 35 15 Q50 30 65 15 Q80 0 95 15 Q110 30 115 15" stroke={color} strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  ),
  // Circle scribble
  (color: string) => (
    <svg viewBox="0 0 50 50" fill="none" className="w-full h-full">
      <circle cx="25" cy="25" r="20" stroke={color} strokeWidth="2.5" strokeDasharray="4 3" fill={color} fillOpacity="0.05" />
      <circle cx="25" cy="25" r="12" stroke={color} strokeWidth="2" fill="none" />
    </svg>
  ),
  // Arrow doodle
  (color: string) => (
    <svg viewBox="0 0 80 40" fill="none" className="w-full h-full">
      <path d="M5 20 Q20 5 40 20 Q60 35 75 20" stroke={color} strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M65 12 L75 20 L65 28" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  ),
  // Spiral
  (color: string) => (
    <svg viewBox="0 0 50 50" fill="none" className="w-full h-full">
      <path d="M25 25 Q25 15 35 15 Q45 15 45 25 Q45 40 25 40 Q5 40 5 25 Q5 5 25 5 Q50 5 50 25" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  ),
];

const colors = [
  "hsl(350, 75%, 60%)", // pink
  "hsl(15, 85%, 62%)", // coral
  "hsl(45, 95%, 55%)", // yellow
  "hsl(160, 50%, 55%)", // mint
  "hsl(280, 55%, 65%)", // purple
];

interface DoodleConfig {
  scribbleIdx: number;
  colorIdx: number;
  x: string;
  y: string;
  size: string;
  rotation: number;
  delay: number;
}

const doodleConfigs: DoodleConfig[] = [
  { scribbleIdx: 0, colorIdx: 0, x: "2%", y: "8%", size: "80px", rotation: -15, delay: 0 },
  { scribbleIdx: 1, colorIdx: 2, x: "88%", y: "5%", size: "50px", rotation: 12, delay: 0.3 },
  { scribbleIdx: 2, colorIdx: 3, x: "5%", y: "85%", size: "90px", rotation: 8, delay: 0.6 },
  { scribbleIdx: 3, colorIdx: 4, x: "90%", y: "75%", size: "40px", rotation: -20, delay: 0.9 },
  { scribbleIdx: 4, colorIdx: 1, x: "80%", y: "45%", size: "70px", rotation: 5, delay: 0.4 },
  { scribbleIdx: 5, colorIdx: 0, x: "3%", y: "50%", size: "45px", rotation: -10, delay: 0.7 },
  { scribbleIdx: 1, colorIdx: 3, x: "50%", y: "92%", size: "35px", rotation: 25, delay: 1.0 },
  { scribbleIdx: 0, colorIdx: 4, x: "70%", y: "10%", size: "60px", rotation: -8, delay: 0.5 },
];

export const ScribbleDoodles = ({ variant = "full" }: { variant?: "full" | "minimal" }) => {
  const configs = variant === "minimal" ? doodleConfigs.slice(0, 4) : doodleConfigs;

  return (
    <>
      {configs.map((d, i) => (
        <motion.div
          key={i}
          className="absolute pointer-events-none z-0"
          style={{
            left: d.x,
            top: d.y,
            width: d.size,
            height: d.size,
            rotate: `${d.rotation}deg`,
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 0.4, scale: 1 }}
          transition={{ delay: d.delay, duration: 0.5, type: "spring" }}
        >
          <motion.div
            animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.05, 1] }}
            transition={{ duration: 6 + i, repeat: Infinity, ease: "easeInOut" }}
          >
            {scribbles[d.scribbleIdx](colors[d.colorIdx])}
          </motion.div>
        </motion.div>
      ))}
    </>
  );
};

// Comic-style speech bubble
export const ComicBubble = ({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) => (
  <motion.div
    initial={{ scale: 0, rotate: -5 }}
    animate={{ scale: 1, rotate: 0 }}
    transition={{ type: "spring", stiffness: 300, damping: 20 }}
    className={`relative inline-block ${className}`}
  >
    <div className="bg-retro-yellow text-foreground font-marker text-sm px-4 py-2 rounded-2xl border-2 border-foreground/20 retro-shadow">
      {text}
    </div>
    <svg
      className="absolute -bottom-2 left-4 w-4 h-3"
      viewBox="0 0 16 12"
      fill="hsl(45, 95%, 65%)"
    >
      <path d="M0 0 L8 12 L16 0 Z" stroke="hsl(350 20% 85%)" strokeWidth="1.5" />
    </svg>
  </motion.div>
);

// Halftone dots pattern overlay
export const HalftoneOverlay = ({ className = "" }: { className?: string }) => (
  <div
    className={`absolute inset-0 pointer-events-none opacity-[0.03] z-0 ${className}`}
    style={{
      backgroundImage: `radial-gradient(circle, hsl(350, 30%, 15%) 1px, transparent 1px)`,
      backgroundSize: "8px 8px",
    }}
  />
);

export default ScribbleDoodles;
