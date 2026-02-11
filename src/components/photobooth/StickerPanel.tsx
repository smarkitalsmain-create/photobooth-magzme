import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { STICKERS } from "@/lib/stickers";
import { loadCustomStickers, CustomSticker } from "@/lib/templateStorage";

interface StickerPanelProps {
  onAddSticker: (sticker: { emoji?: string; src?: string }) => void;
}

const StickerPanel = ({ onAddSticker }: StickerPanelProps) => {
  const [customStickers, setCustomStickers] = useState<CustomSticker[]>([]);
  const [activeTab, setActiveTab] = useState<"emojis" | "stickers">("emojis");

  useEffect(() => {
    setCustomStickers(loadCustomStickers());
  }, []);

  return (
    <div className="space-y-3">
      {/* Sub-tabs */}
      <div className="inline-flex rounded-full bg-muted p-1 mb-1">
        <button
          type="button"
          onClick={() => setActiveTab("emojis")}
          className={`px-3 py-1.5 rounded-full text-[11px] font-body font-semibold transition-all ${
            activeTab === "emojis"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground"
          }`}
        >
          Emojis
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("stickers")}
          className={`px-3 py-1.5 rounded-full text-[11px] font-body font-semibold transition-all ${
            activeTab === "stickers"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground"
          }`}
        >
          Stickers
        </button>
      </div>

      {activeTab === "emojis" && (
        <div>
          <p className="text-[11px] font-body font-semibold text-muted-foreground mb-1">Emojis</p>
          <div className="grid grid-cols-8 gap-1">
            {STICKERS.map((sticker, i) => (
              <motion.button
                key={`emoji-${i}`}
                whileHover={{ scale: 1.3 }}
                whileTap={{ scale: 0.8 }}
                onClick={() => onAddSticker({ emoji: sticker })}
                className="text-xl p-1 rounded hover:bg-muted transition-colors"
              >
                {sticker}
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {activeTab === "stickers" && (
        <div>
          <p className="text-[11px] font-body font-semibold text-muted-foreground mb-1">Uploaded stickers</p>
          {customStickers.length === 0 ? (
            <p className="text-[10px] text-muted-foreground font-body">
              Upload custom sticker images in the Admin page.
            </p>
          ) : (
            <div className="grid grid-cols-8 gap-1">
              {customStickers.map((sticker) => (
                <motion.button
                  key={sticker.id}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onAddSticker({ src: sticker.src })}
                  className="p-1 rounded hover:bg-muted transition-colors flex items-center justify-center"
                >
                  <img
                    src={sticker.src}
                    alt={sticker.name || "sticker"}
                    className="w-7 h-7 object-contain pointer-events-none"
                  />
                </motion.button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StickerPanel;
