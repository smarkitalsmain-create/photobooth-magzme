import { forwardRef } from "react";
import PhotoFrame from "./PhotoFrame";

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

interface BoothCanvasProps {
  mode: "strip" | "polaroid";
  images: (string | null)[];
  filter: string;
  bgColor: string;
  /** Optional background image from template */
  bgImage?: string | null;
  stickers: Sticker[];
  texts: TextItem[];
  onUpload: (index: number, file: File) => void;
  onRemove: (index: number) => void;
  onStickerDrag: (id: string, x: number, y: number) => void;
  onStickerResize?: (id: string, size: number) => void;
  onStickerResizeStart?: (id: string) => void;
  onStickerRotate?: (id: string, rotation: number) => void;
  onStickerRotateStart?: (id: string) => void;
  onTextDrag: (id: string, x: number, y: number) => void;
  onTextEdit: (id: string, text: string) => void;
  onTextStyle?: (id: string, style: { fontSize?: number; fontFamily?: string; color?: string }) => void;
  onRemoveSticker: (id: string) => void;
  onRemoveText: (id: string) => void;
  onSelectText?: (id: string | null) => void;
  onSelectSticker?: (id: string | null) => void;
  selectedTextId?: string | null;
  selectedStickerId?: string | null;
}

const BoothCanvas = forwardRef<HTMLDivElement, BoothCanvasProps>(
  (
    {
      mode,
      images,
      filter,
      bgColor,
      bgImage,
      stickers,
      texts,
      onUpload,
      onRemove,
      onStickerDrag,
      onStickerResize,
      onStickerResizeStart,
      onStickerRotate,
      onStickerRotateStart,
      onTextDrag,
      onTextEdit,
      onTextStyle,
      onRemoveSticker,
      onRemoveText,
      onSelectText,
      onSelectSticker,
      selectedTextId,
      selectedStickerId,
    },
    ref
  ) => {
    const frameCount = mode === "strip" ? 4 : 1;
    // Base sizing. Polaroid is bigger; strip stays compact.
    const baseWidth = mode === "strip" ? 220 : 360;
    const basePadding = mode === "strip" ? 12 : 20;
    const basePaddingBottom = mode === "strip" ? 26 : 40;

    return (
      <div
        ref={ref}
        className="relative mx-auto"
        style={{
          backgroundColor: bgColor,
          backgroundImage: bgImage ? `url(${bgImage})` : undefined,
          // Fit nicely on mobile: cap width and also respect viewport
          width: `min(${baseWidth}px, calc(100vw - 48px))`,
          padding: `${basePadding}px`,
          paddingBottom: `${basePaddingBottom}px`,
          borderRadius: "0",
          // Much lighter shadow so the strip looks softer
          boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          // Allow handles to overflow
          overflow: 'visible',
        }}
        onClick={(e) => {
          // Deselect sticker if clicking on canvas background (not on stickers or handles)
          const target = e.target as HTMLElement;
          const isSticker = target.closest('.sticker-container');
          const isHandle = target.closest('.resize-handle, .rotate-handle');
          const isPhotoFrame = target.closest('.photo-frame-container');
          
          if (!isSticker && !isHandle && (e.target === e.currentTarget || isPhotoFrame)) {
            onSelectSticker?.(null);
            onSelectText?.(null);
          }
        }}
      >
        {/* Frames column; for strip mode keep photos slightly narrower than the outer strip */}
        <div className="flex justify-center">
          <div
            className={`flex flex-col ${
              mode === "strip" ? "gap-1 w-[180px]" : "gap-0 w-full"
            }`}
          >
            {Array.from({ length: frameCount }).map((_, i) => (
              <PhotoFrame
                key={i}
                index={i}
                image={images[i] || null}
                filter={filter}
                onUpload={onUpload}
                onRemove={onRemove}
              />
            ))}
          </div>
        </div>

        {/* Stickers overlay */}
        {stickers.map((sticker) => (
          <DraggableSticker
            key={sticker.id}
            sticker={sticker}
            isSelected={selectedStickerId === sticker.id}
            onDrag={(x, y) => onStickerDrag(sticker.id, x, y)}
            onResize={onStickerResize ? (size) => onStickerResize(sticker.id, size) : undefined}
            onResizeStart={onStickerResizeStart ? () => onStickerResizeStart(sticker.id) : undefined}
            onRotate={onStickerRotate ? (rotation) => onStickerRotate(sticker.id, rotation) : undefined}
            onRotateStart={onStickerRotateStart ? () => onStickerRotateStart(sticker.id) : undefined}
            onRemove={() => onRemoveSticker(sticker.id)}
            onSelect={() => onSelectSticker?.(sticker.id)}
            onDeselect={() => onSelectSticker?.(null)}
          />
        ))}

        {/* Text overlay */}
        {texts.map((t) => (
          <DraggableItem
            key={t.id}
            x={t.x}
            y={t.y}
            onDrag={(x, y) => onTextDrag(t.id, x, y)}
            onRemove={() => onRemoveText(t.id)}
            isTextInput
          >
            <input
              type="text"
              value={t.text}
              onChange={(e) => onTextEdit(t.id, e.target.value)}
              onFocus={() => onSelectText?.(t.id)}
              className="bg-transparent outline-none border-b border-dashed border-foreground/30 text-center min-w-[80px] w-28 focus:border-primary focus:ring-0"
              placeholder="Type here..."
              style={{
                fontSize: `${t.fontSize ?? 14}px`,
                fontFamily: t.fontFamily ?? "var(--font-marker)",
                color: t.color ?? "hsl(var(--foreground))",
              }}
            />
          </DraggableItem>
        ))}

        {/* MagzME branding */}
        <div className="mt-3 pt-1 text-center">
          <span
            className="text-[12px] font-body font-bold opacity-90"
            style={{ letterSpacing: "0.04em", color: "hsl(336, 88.50%, 62.40%)" }}
          >
            created with love by MagzME
          </span>
        </div>
      </div>
    );
  }
);

BoothCanvas.displayName = "BoothCanvas";

const DRAG_THRESHOLD_PX = 8;

interface DraggableStickerProps {
  sticker: Sticker;
  isSelected: boolean;
  onDrag: (x: number, y: number) => void;
  onResize?: (size: number) => void;
  onResizeStart?: () => void;
  onRotate?: (rotation: number) => void;
  onRotateStart?: () => void;
  onRemove: () => void;
  onSelect: () => void;
  onDeselect: () => void;
}

const DraggableSticker = ({
  sticker,
  isSelected,
  onDrag,
  onResize,
  onResizeStart,
  onRotate,
  onRotateStart,
  onRemove,
  onSelect,
  onDeselect,
}: DraggableStickerProps) => {
  const size = sticker.size ?? 1.0;
  const rotation = sticker.rotation ?? 0;
  const baseSize = sticker.src ? 40 : 24; // Base size in pixels
  const displaySize = baseSize * size;

  const handlePointerDown = (e: React.PointerEvent) => {
    // Don't start drag if clicking on a handle or delete button
    if ((e.target as HTMLElement).closest('.resize-handle, .rotate-handle, [data-delete-sticker]')) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const el = e.currentTarget as HTMLElement;
    const parent = el.parentElement!;
    const parentRect = parent.getBoundingClientRect();
    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const startX = sticker.x;
    const startY = sticker.y;
    let dragStarted = false;

    // Select if not already selected (but still allow drag to start in same gesture)
    if (!isSelected) {
      onSelect();
    }

    const onMove = (ev: PointerEvent) => {
      dragStarted = true;
      const newX = Math.max(0, Math.min(ev.clientX - startClientX + startX, parentRect.width - displaySize));
      const newY = Math.max(0, Math.min(ev.clientY - startClientY + startY, parentRect.height - displaySize));
      onDrag(newX, newY);
    };

    const onUp = () => {
      el.releasePointerCapture(e.pointerId);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    el.setPointerCapture(e.pointerId);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const handleResizeStart = (e: React.PointerEvent, corner: 'tl' | 'tr' | 'bl' | 'br') => {
    e.preventDefault();
    e.stopPropagation();
    
    // Call start callback once
    onResizeStart?.();
    
    const el = e.currentTarget as HTMLElement;
    const stickerEl = el.closest('.sticker-container') as HTMLElement;
    const parent = stickerEl.parentElement!;
    const parentRect = parent.getBoundingClientRect();
    const stickerRect = stickerEl.getBoundingClientRect();
    
    const centerX = stickerRect.left + stickerRect.width / 2;
    const centerY = stickerRect.top + stickerRect.height / 2;
    const startDistance = Math.hypot(
      e.clientX - centerX,
      e.clientY - centerY
    );
    const startSize = size;

    const onMove = (ev: PointerEvent) => {
      const currentDistance = Math.hypot(
        ev.clientX - centerX,
        ev.clientY - centerY
      );
      const scale = currentDistance / startDistance;
      const newSize = Math.max(0.3, Math.min(3.0, startSize * scale));
      onResize?.(newSize);
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const handleRotateStart = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Call start callback once
    onRotateStart?.();
    
    const stickerEl = e.currentTarget.closest('.sticker-container') as HTMLElement;
    const stickerRect = stickerEl.getBoundingClientRect();
    // Get the center of the sticker element (accounting for rotation)
    const centerX = stickerRect.left + stickerRect.width / 2;
    const centerY = stickerRect.top + stickerRect.height / 2;
    
    // Calculate initial angle from center to mouse position
    const startAngle = Math.atan2(
      e.clientY - centerY,
      e.clientX - centerX
    ) * (180 / Math.PI);
    const startRotation = rotation;

    const onMove = (ev: PointerEvent) => {
      // Calculate current angle from center to mouse position
      const currentAngle = Math.atan2(
        ev.clientY - centerY,
        ev.clientX - centerX
      ) * (180 / Math.PI);
      
      // Calculate the difference in angle
      let delta = currentAngle - startAngle;
      
      // Normalize delta to handle crossing 180/-180 boundary
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      
      // Apply the rotation delta
      let newRotation = startRotation + delta;
      
      // Normalize rotation to 0-360 range
      while (newRotation < 0) newRotation += 360;
      while (newRotation >= 360) newRotation -= 360;
      
      onRotate?.(newRotation);
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <div
      className="sticker-container absolute cursor-grab active:cursor-grabbing"
      style={{
        left: sticker.x,
        top: sticker.y,
        zIndex: isSelected ? 30 : 20,
        transform: `rotate(${rotation}deg)`,
        transformOrigin: 'center center',
        // Allow handles to overflow
        overflow: 'visible',
        // Ensure sticker is always visible
        visibility: 'visible',
        opacity: 1,
      }}
      onPointerDown={handlePointerDown}
      onClick={(e) => {
        e.stopPropagation();
        if (!isSelected) {
          onSelect();
        }
      }}
    >
      <div
        style={{
          width: `${displaySize}px`,
          height: `${displaySize}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          visibility: 'visible',
          opacity: 1,
        }}
      >
        {sticker.src ? (
          <img
            src={sticker.src}
            alt=""
            className="w-full h-full object-contain select-none pointer-events-none"
            style={{ visibility: 'visible', opacity: 1 }}
          />
        ) : (
          <span
            className="text-2xl select-none pointer-events-none"
            style={{
              fontSize: `${displaySize * 0.8}px`,
              visibility: 'visible',
              opacity: 1,
            }}
          >
            {sticker.emoji}
          </span>
        )}
      </div>

      {/* Selection border and handles */}
      {isSelected && (
        <>
          {/* Selection border */}
          <div
            className="absolute inset-0 border-2 border-primary pointer-events-none"
            style={{
              borderRadius: '4px',
            }}
          />

          {/* Corner resize handles */}
          {onResize && (
            <>
              <div
                className="resize-handle absolute w-3 h-3 bg-primary border-2 border-background rounded-full cursor-nwse-resize"
                style={{ top: -6, left: -6 }}
                onPointerDown={(e) => handleResizeStart(e, 'tl')}
              />
              <div
                className="resize-handle absolute w-3 h-3 bg-primary border-2 border-background rounded-full cursor-nesw-resize"
                style={{ top: -6, right: -6 }}
                onPointerDown={(e) => handleResizeStart(e, 'tr')}
              />
              <div
                className="resize-handle absolute w-3 h-3 bg-primary border-2 border-background rounded-full cursor-nesw-resize"
                style={{ bottom: -6, left: -6 }}
                onPointerDown={(e) => handleResizeStart(e, 'bl')}
              />
              <div
                className="resize-handle absolute w-3 h-3 bg-primary border-2 border-background rounded-full cursor-nwse-resize"
                style={{ bottom: -6, right: -6 }}
                onPointerDown={(e) => handleResizeStart(e, 'br')}
              />
            </>
          )}

          {/* Rotation handle */}
          {onRotate && (
            <>
              {/* Connection line */}
              <div
                className="absolute pointer-events-none"
                style={{
                  top: -14,
                  left: '50%',
                  width: '2px',
                  height: '14px',
                  backgroundColor: 'hsl(var(--primary))',
                  transform: `translateX(-50%) rotate(${-rotation}deg)`,
                  transformOrigin: 'top center',
                }}
              />
              {/* Handle */}
              <div
                className="rotate-handle absolute w-4 h-4 bg-primary border-2 border-background rounded-full cursor-grab active:cursor-grabbing hover:scale-110 transition-all z-20 shadow-sm"
                style={{
                  top: -28,
                  left: '50%',
                  marginLeft: '-8px', // Center the handle (half of width)
                  transform: `rotate(${-rotation}deg)`,
                  transformOrigin: 'center center',
                  pointerEvents: 'auto',
                }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  handleRotateStart(e);
                }}
              />
            </>
          )}

          {/* Delete button */}
          <button
            type="button"
            data-delete-sticker
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center hover:bg-destructive/80 transition-colors z-10"
          >
            ×
          </button>
        </>
      )}
    </div>
  );
};

const DraggableItem = ({
  x,
  y,
  children,
  onDrag,
  onRemove,
  isTextInput,
}: {
  x: number;
  y: number;
  children: React.ReactNode;
  onDrag: (x: number, y: number) => void;
  onRemove: () => void;
  isTextInput?: boolean;
}) => {
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    const el = e.currentTarget as HTMLElement;
    const parent = el.parentElement!;
    const parentRect = parent.getBoundingClientRect();
    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const startX = e.clientX - x;
    const startY = e.clientY - y;
    let dragStarted = false;

    const onMove = (ev: PointerEvent) => {
      if (isTextInput && !dragStarted) {
        const dx = ev.clientX - startClientX;
        const dy = ev.clientY - startClientY;
        if (Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
          dragStarted = true;
          (el.querySelector("input") as HTMLInputElement | null)?.blur();
        }
      } else if (!isTextInput) {
        dragStarted = true;
      }
      if (dragStarted) {
        const newX = Math.max(0, Math.min(ev.clientX - startX, parentRect.width - 30));
        const newY = Math.max(0, Math.min(ev.clientY - startY, parentRect.height - 30));
        onDrag(newX, newY);
      }
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      if (isTextInput && !dragStarted) {
        (el.querySelector("input") as HTMLInputElement | null)?.focus();
      }
    };
    if (!isTextInput) dragStarted = true; // stickers: drag immediately on move
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <div
      className="absolute cursor-grab active:cursor-grabbing group/item"
      style={{ left: x, top: y, zIndex: 20 }}
      onPointerDown={handlePointerDown}
    >
      {children}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-4 h-4 text-[10px] flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity"
      >
        ×
      </button>
    </div>
  );
};

export default BoothCanvas;
