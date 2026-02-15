import { useState, useRef, useCallback, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toPng } from "html-to-image";
import {
  ArrowLeft,
  Download,
  Palette,
  Smile,
  Type,
  SlidersHorizontal,
  Undo2,
  Redo2,
  Image as ImageIcon,
  LayoutTemplate,
  Printer,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import BoothCanvas from "@/components/photobooth/BoothCanvas";
import StickerPanel from "@/components/photobooth/StickerPanel";
import FilterPanel from "@/components/photobooth/FilterPanel";
import TemplatePanel from "@/components/photobooth/TemplatePanel";
import { ScribbleDoodles, HalftoneOverlay } from "@/components/photobooth/ScribbleDoodles";
import { FILTERS, BG_COLORS } from "@/lib/stickers";
import { Template } from "@/lib/templates";
import { uploadCapturedPhoto } from "@/lib/uploadPhoto";

type Tab = "templates" | "bg" | "filters" | "stickers" | "text";

interface Sticker {
  id: string;
  emoji?: string;
  /** Optional image source for custom stickers */
  src?: string;
  x: number;
  y: number;
  /** Size multiplier (default: 1.0) */
  size?: number;
  /** Rotation in degrees (default: 0) */
  rotation?: number;
}

interface TextItem {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
}

interface HistoryState {
  images: (string | null)[];
  stickers: Sticker[];
  texts: TextItem[];
  filter: string;
  bgColor: string;
  bgImage: string | null;
}

const Editor = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const mode = (searchParams.get("mode") as "strip" | "polaroid") || "strip";
  const canvasRef = useRef<HTMLDivElement>(null);

  const frameCount = mode === "strip" ? 4 : 1;

  const [images, setImages] = useState<(string | null)[]>(Array(frameCount).fill(null));
  const [filter, setFilter] = useState("none");
  const [bgColor, setBgColor] = useState(BG_COLORS[0].value);
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [texts, setTexts] = useState<TextItem[]>([]);
  const [activeTab, setActiveTab] = useState<Tab | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState("classic");
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);

  // History for undo/redo
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const pushHistory = useCallback(() => {
    const state: HistoryState = {
      images: [...images],
      stickers: [...stickers],
      texts: [...texts],
      filter,
      bgColor,
      bgImage,
    };
    setHistory((prev) => [...prev.slice(0, historyIndex + 1), state]);
    setHistoryIndex((prev) => prev + 1);
  }, [images, stickers, texts, filter, bgColor, bgImage, historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex <= 0) return;
    const prev = history[historyIndex - 1];
    setImages(prev.images);
    setStickers(prev.stickers);
    setTexts(prev.texts);
    setFilter(prev.filter);
    setBgColor(prev.bgColor);
    setBgImage(prev.bgImage);
    setHistoryIndex((i) => i - 1);
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const next = history[historyIndex + 1];
    setImages(next.images);
    setStickers(next.stickers);
    setTexts(next.texts);
    setFilter(next.filter);
    setBgColor(next.bgColor);
    setBgImage(next.bgImage);
    setHistoryIndex((i) => i + 1);
  }, [history, historyIndex]);

  const handleUpload = useCallback(
    (index: number, file: File) => {
      pushHistory();
      const url = URL.createObjectURL(file);
      setImages((prev) => {
        const next = [...prev];
        next[index] = url;
        return next;
      });
    },
    [pushHistory]
  );

  const handleRemove = useCallback(
    (index: number) => {
      pushHistory();
      setImages((prev) => {
        const next = [...prev];
        next[index] = null;
        return next;
      });
    },
    [pushHistory]
  );

  const handleAddSticker = useCallback(
    (payload: { emoji?: string; src?: string }) => {
      pushHistory();
      const newId = crypto.randomUUID();
      setStickers((prev) => [
        ...prev,
        {
          id: newId,
          emoji: payload.emoji,
          src: payload.src,
          x: 50 + Math.random() * 100,
          y: 50 + Math.random() * 100,
          size: 1.0,
          rotation: 0,
        },
      ]);
      setSelectedStickerId(newId);
    },
    [pushHistory]
  );

  const resizeStartRef = useRef<Set<string>>(new Set());
  const rotateStartRef = useRef<Set<string>>(new Set());

  const handleStickerResizeStart = useCallback(
    (id: string) => {
      if (!resizeStartRef.current.has(id)) {
        resizeStartRef.current.add(id);
        pushHistory();
        setTimeout(() => resizeStartRef.current.delete(id), 1000);
      }
    },
    [pushHistory]
  );

  const handleStickerResize = useCallback(
    (id: string, size: number) => {
      handleStickerResizeStart(id);
      setStickers((prev) => prev.map((s) => (s.id === id ? { ...s, size } : s)));
    },
    [handleStickerResizeStart]
  );

  const handleStickerRotateStart = useCallback(
    (id: string) => {
      if (!rotateStartRef.current.has(id)) {
        rotateStartRef.current.add(id);
        pushHistory();
        setTimeout(() => rotateStartRef.current.delete(id), 1000);
      }
    },
    [pushHistory]
  );

  const handleStickerRotate = useCallback(
    (id: string, rotation: number) => {
      handleStickerRotateStart(id);
      setStickers((prev) => prev.map((s) => (s.id === id ? { ...s, rotation } : s)));
    },
    [handleStickerRotateStart]
  );

  const handleStickerResizeStartCallback = useCallback(
    (id: string) => handleStickerResizeStart(id),
    [handleStickerResizeStart]
  );

  const handleStickerRotateStartCallback = useCallback(
    (id: string) => handleStickerRotateStart(id),
    [handleStickerRotateStart]
  );

  const handleStickerLayer = useCallback(
    (id: string, direction: 'forward' | 'backward') => {
      pushHistory();
      setStickers((prev) => {
        const index = prev.findIndex((s) => s.id === id);
        if (index === -1) return prev;
        const newStickers = [...prev];
        if (direction === 'forward' && index < newStickers.length - 1) {
          [newStickers[index], newStickers[index + 1]] = [newStickers[index + 1], newStickers[index]];
        } else if (direction === 'backward' && index > 0) {
          [newStickers[index], newStickers[index - 1]] = [newStickers[index - 1], newStickers[index]];
        }
        return newStickers;
      });
    },
    [pushHistory]
  );

  const handleAddText = useCallback(() => {
    pushHistory();
    const id = crypto.randomUUID();
    setTexts((prev) => [
      ...prev,
      { id, text: "Your text", x: 60, y: 60, fontSize: 16, fontFamily: "var(--font-marker)", color: "hsl(var(--foreground))" },
    ]);
    setSelectedTextId(id);
  }, [pushHistory]);

  const handleTextStyle = useCallback(
    (id: string, style: { fontSize?: number; fontFamily?: string; color?: string }) => {
      pushHistory();
      setTexts((prev) => prev.map((t) => (t.id === id ? { ...t, ...style } : t)));
    },
    [pushHistory]
  );

  const handleSelectTemplate = useCallback(
    (template: Template) => {
      pushHistory();
      setActiveTemplate(template.id);
      setBgColor(template.bgColor);
      setBgImage(template.bgImage ?? null);
      setFilter(template.filter);
      // Add default stickers from template
      const newStickers = template.defaultStickers.map((s) => ({
        id: crypto.randomUUID(),
        emoji: s.emoji,
        x: s.x,
        y: s.y,
        size: 1.0,
        rotation: 0,
      }));
      setStickers((prev) => [...prev, ...newStickers]);
    },
    [pushHistory]
  );

  const activeFilterCss = useMemo(
    () => FILTERS.find((f) => f.id === filter)?.css || "",
    [filter]
  );

  const previewImage = images.find((img) => img !== null) || null;

  const handleDownload = useCallback(async () => {
    if (!canvasRef.current) return;
    setDownloading(true);

    // Clear selection so the selection box/handles don't appear in the downloaded image
    const prevStickerId = selectedStickerId;
    const prevTextId = selectedTextId;
    setSelectedStickerId(null);
    setSelectedTextId(null);

    const restores: Array<() => void> = [];
    try {
      // Let React update the DOM (selection UI removed) before we capture
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

      // Convert blob URLs to data URLs so html-to-image can capture them (uploaded photos, etc.)
      const imgs = canvasRef.current.querySelectorAll<HTMLImageElement>("img[src^='blob:']");
      await Promise.all(
        Array.from(imgs).map(async (img) => {
          const originalSrc = img.src;
          try {
            const res = await fetch(originalSrc);
            const blob = await res.blob();
            const dataUrl = await new Promise<string>((resolve, reject) => {
              const r = new FileReader();
              r.onload = () => resolve(r.result as string);
              r.onerror = reject;
              r.readAsDataURL(blob);
            });
            img.src = dataUrl;
            if (img.decode) {
              await img.decode();
            } else {
              await new Promise<void>((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = reject;
              });
            }
            restores.push(() => {
              img.src = originalSrc;
            });
          } catch {
            // Keep original src if conversion fails
          }
        })
      );

      const dataUrl = await toPng(canvasRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        skipFonts: true,
      });

      // Restore blob URLs
      restores.forEach((r) => r());

      if (!dataUrl || !dataUrl.startsWith("data:image")) {
        throw new Error("Capture failed");
      }

      // Convert data URL to Blob and trigger download
      const parts = dataUrl.split(",");
      const mime = parts[0].match(/:(.*?);/)?.[1] ?? "image/png";
      const binary = atob(parts[1] ?? "");
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: mime });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const timestamp = Date.now();
      link.download = `magzme-${mode}-${timestamp}.png`;
      link.href = url;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (link.parentNode) link.parentNode.removeChild(link);
        URL.revokeObjectURL(url);
      }, 300);

      // Upload to backend - MUST succeed for photo to appear in admin
      try {
        const result = await uploadCapturedPhoto(blob, `photobooth-${timestamp}.png`);
        console.log("UPLOAD_RESPONSE", { id: result.id, url: result.url });
      } catch (uploadError) {
        console.error("Upload failed:", uploadError);
        // Log error but don't block download
      }
    } catch (err) {
      console.error("Download failed:", err);
      restores.forEach((r) => r());
      alert("Download failed. Make sure photos and stickers have loaded, then try again.");
    } finally {
      setSelectedStickerId(prevStickerId);
      setSelectedTextId(prevTextId);
      setDownloading(false);
    }
  }, [mode, selectedStickerId, selectedTextId]);

  const tabs: { id: Tab; icon: typeof Palette; label: string }[] = [
    { id: "templates", icon: LayoutTemplate, label: "Templates" },
    { id: "bg", icon: Palette, label: "BG" },
    { id: "filters", icon: SlidersHorizontal, label: "Filters" },
    { id: "stickers", icon: Smile, label: "Stickers" },
    { id: "text", icon: Type, label: "Text" },
  ];

  return (
    <div className="min-h-screen bg-background grain-overlay flex flex-col relative">
      <HalftoneOverlay />

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/80 backdrop-blur-sm relative z-20">
        <button onClick={() => navigate("/")} className="flex items-center gap-2 text-foreground hover:text-primary transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="font-display text-xl text-primary">MagzME</span>
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={undo}
            disabled={historyIndex <= 0}
            className="p-2 rounded-lg hover:bg-muted disabled:opacity-30 transition-all text-foreground"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            className="p-2 rounded-lg hover:bg-muted disabled:opacity-30 transition-all text-foreground"
          >
            <Redo2 className="w-4 h-4" />
          </button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-2 bg-primary text-primary-foreground font-display text-sm py-2 px-4 rounded-xl retro-shadow disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {downloading ? "..." : "Download"}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/print-order")}
            className="flex items-center gap-2 bg-coral text-primary-foreground font-display text-sm py-2 px-4 rounded-xl retro-shadow"
          >
            <Printer className="w-4 h-4" />
            Print
          </motion.button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:flex-row relative z-10 overflow-hidden">
        {/* Canvas area */}
        <div className="flex-1 flex items-center justify-center p-3 overflow-hidden relative">
          <ScribbleDoodles variant="minimal" />
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 120 }}
            className="relative z-10"
          >
            <BoothCanvas
              ref={canvasRef}
              mode={mode}
              images={images}
              filter={activeFilterCss}
              bgColor={bgColor}
              bgImage={bgImage}
              stickers={stickers}
              texts={texts}
              onUpload={handleUpload}
              onRemove={handleRemove}
              onStickerDrag={(id, x, y) => {
                setStickers((prev) => prev.map((s) => (s.id === id ? { ...s, x, y } : s)));
              }}
              onStickerResize={handleStickerResize}
              onStickerRotate={handleStickerRotate}
              onStickerResizeStart={(id) => handleStickerResizeStartCallback(id)}
              onStickerRotateStart={(id) => handleStickerRotateStartCallback(id)}
              onTextDrag={(id, x, y) =>
                setTexts((prev) => prev.map((t) => (t.id === id ? { ...t, x, y } : t)))
              }
              onTextEdit={(id, text) =>
                setTexts((prev) => prev.map((t) => (t.id === id ? { ...t, text } : t)))
              }
              onTextStyle={handleTextStyle}
              onSelectText={setSelectedTextId}
              onSelectSticker={setSelectedStickerId}
              selectedTextId={selectedTextId}
              selectedStickerId={selectedStickerId}
              onRemoveSticker={(id) => {
                pushHistory();
                setStickers((prev) => prev.filter((s) => s.id !== id));
                if (selectedStickerId === id) {
                  setSelectedStickerId(null);
                }
              }}
              onRemoveText={(id) => {
                pushHistory();
                setTexts((prev) => prev.filter((t) => t.id !== id));
              }}
            />
          </motion.div>
        </div>

        {/* Toolbar */}
        <div className="lg:w-80 border-t lg:border-t-0 lg:border-l border-border bg-card/80 backdrop-blur-sm flex flex-col">
          {/* Tab buttons */}
          <div className="flex lg:flex-col border-b lg:border-b-0">
            <div className="flex lg:grid lg:grid-cols-3 w-full gap-1 p-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(activeTab === tab.id ? null : tab.id)}
                  className={`flex flex-col items-center gap-1 py-2 px-2 rounded-xl text-[10px] font-body font-semibold transition-all ${
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground retro-shadow"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Panel content */}
          <AnimatePresence mode="wait">
            {activeTab && (
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="flex-1 p-4 overflow-auto"
              >
                {activeTab === "templates" && (
                  <div>
                    <p className="font-display text-sm mb-3 text-foreground">Templates</p>
                    <TemplatePanel
                      activeTemplate={activeTemplate}
                      onSelectTemplate={handleSelectTemplate}
                    />
                  </div>
                )}
                {activeTab === "bg" && (
                  <div>
                    <p className="font-display text-sm mb-3 text-foreground">Background Color</p>
                    <div className="grid grid-cols-4 gap-2">
                      {BG_COLORS.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => {
                            pushHistory();
                            setBgColor(c.value);
                          }}
                          className={`w-full aspect-square rounded-xl booth-border transition-all hover:scale-105 ${
                            bgColor === c.value ? "ring-2 ring-primary ring-offset-2" : ""
                          }`}
                          style={{ backgroundColor: c.value }}
                          title={c.name}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {activeTab === "filters" && (
                  <div>
                    <p className="font-display text-sm mb-3 text-foreground">Photo Filters</p>
                    <FilterPanel
                      activeFilter={filter}
                      onSelectFilter={(id) => {
                        pushHistory();
                        setFilter(id);
                      }}
                      previewImage={previewImage}
                    />
                  </div>
                )}
                {activeTab === "stickers" && (
                  <div>
                    <p className="font-display text-sm mb-3 text-foreground">Stickers</p>
                    <StickerPanel onAddSticker={handleAddSticker} />
                    
                    {selectedStickerId && (() => {
                      const sticker = stickers.find((s) => s.id === selectedStickerId);
                      if (!sticker) return null;
                      return (
                        <div className="mt-4 space-y-3 rounded-xl border border-border bg-muted/30 p-3">
                          <p className="text-xs text-muted-foreground font-body">
                            Selected: {sticker.emoji || "Custom sticker"}
                          </p>
                          
                          {/* Layer controls */}
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleStickerLayer(selectedStickerId, 'backward')}
                              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg border border-border bg-background hover:bg-muted text-foreground text-xs font-body transition-colors"
                              title="Send backward"
                            >
                              <ArrowDown className="w-3 h-3" />
                              Back
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStickerLayer(selectedStickerId, 'forward')}
                              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg border border-border bg-background hover:bg-muted text-foreground text-xs font-body transition-colors"
                              title="Bring forward"
                            >
                              <ArrowUp className="w-3 h-3" />
                              Forward
                            </button>
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => setSelectedStickerId(null)}
                            className="w-full text-xs text-muted-foreground hover:text-foreground font-body"
                          >
                            Clear selection
                          </button>
                        </div>
                      );
                    })()}
                    
                    <p className="text-xs text-muted-foreground font-body mt-3">
                      Click a sticker on canvas to select it. Drag corner handles to resize, drag rotation handle to rotate.
                    </p>
                  </div>
                )}
                {activeTab === "text" && (
                  <div className="space-y-4">
                    <p className="font-display text-sm mb-3 text-foreground">Add Text</p>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleAddText}
                      className="w-full bg-primary text-primary-foreground font-display py-3 rounded-xl retro-shadow flex items-center justify-center gap-2"
                    >
                      <Type className="w-4 h-4" />
                      Add Text
                    </motion.button>

                    {texts.length > 0 && (
                      <>
                        <p className="font-display text-sm mt-4 text-foreground">Select text on canvas to edit style</p>
                        {selectedTextId && (() => {
                          const t = texts.find((x) => x.id === selectedTextId);
                          if (!t) return null;
                          return (
                            <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-3">
                              <p className="text-xs text-muted-foreground font-body">Editing: &quot;{t.text.slice(0, 20)}{t.text.length > 20 ? "…" : ""}&quot;</p>
                              <div>
                                <label className="text-xs font-semibold text-foreground block mb-1">Font size</label>
                                <select
                                  value={t.fontSize ?? 14}
                                  onChange={(e) => handleTextStyle(t.id, { fontSize: Number(e.target.value) })}
                                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm font-body"
                                >
                                  {[12, 14, 16, 18, 20, 24, 28, 32].map((n) => (
                                    <option key={n} value={n}>{n}px</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="text-xs font-semibold text-foreground block mb-1">Font</label>
                                <select
                                  value={t.fontFamily ?? "var(--font-marker)"}
                                  onChange={(e) => handleTextStyle(t.id, { fontFamily: e.target.value })}
                                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm font-body"
                                >
                                  <option value="var(--font-marker)">Permanent Marker</option>
                                  <option value="var(--font-display)">Lilita One</option>
                                  <option value="var(--font-body)">Nunito</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-xs font-semibold text-foreground block mb-1">Color</label>
                                <div className="flex flex-wrap gap-2">
                                  {[
                                    { name: "Foreground", value: "hsl(var(--foreground))" },
                                    { name: "Primary", value: "hsl(var(--primary))" },
                                    { name: "Coral", value: "hsl(var(--coral))" },
                                    { name: "Accent", value: "hsl(var(--accent))" },
                                    { name: "Purple", value: "hsl(var(--retro-purple))" },
                                    { name: "Pink", value: "hsl(var(--retro-pink))" },
                                    
                                  ].map((c) => (
                                    <button
                                      key={c.value}
                                      type="button"
                                      onClick={() => handleTextStyle(t.id, { color: c.value })}
                                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                                        (t.color ?? "hsl(var(--foreground))") === c.value ? "ring-2 ring-primary ring-offset-2 border-foreground" : "border-border"
                                      }`}
                                      style={{ backgroundColor: c.value }}
                                      title={c.name}
                                    />
                                  ))}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setSelectedTextId(null)}
                                className="text-xs text-muted-foreground hover:text-foreground font-body"
                              >
                                Clear selection
                              </button>
                            </div>
                          );
                        })()}
                      </>
                    )}

                    <p className="text-xs text-muted-foreground font-body">
                      Click a text on the canvas to edit it and change font, size & color here.
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick upload */}
          {images.some((img) => img === null) && (
            <div className="p-4 border-t border-border">
              <label className="flex items-center justify-center gap-2 w-full py-3 bg-muted hover:bg-muted/80 text-foreground rounded-xl cursor-pointer transition-colors font-body font-semibold text-sm">
                <ImageIcon className="w-4 h-4" />
                Upload Photos ({images.filter(Boolean).length}/{frameCount})
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    let currentImages = [...images];
                    files.forEach((file) => {
                      const emptyIdx = currentImages.findIndex((img) => img === null);
                      if (emptyIdx !== -1) {
                        const url = URL.createObjectURL(file);
                        currentImages[emptyIdx] = url;
                        handleUpload(emptyIdx, file);
                      }
                    });
                  }}
                />
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Editor;
