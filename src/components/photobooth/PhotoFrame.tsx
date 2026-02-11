import { useRef, useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X } from "lucide-react";

interface PhotoFrameProps {
  index: number;
  image: string | null;
  filter: string;
  onUpload: (index: number, file: File) => void;
  onRemove: (index: number) => void;
}

const PhotoFrame = ({ index, image, filter, onUpload, onRemove }: PhotoFrameProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showFlash, setShowFlash] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setShowFlash(true);
        setJustAdded(true);
        setTimeout(() => setShowFlash(false), 400);
        setTimeout(() => setJustAdded(false), 700);
        onUpload(index, file);
      }
    },
    [index, onUpload]
  );

  const handleOpenCamera = useCallback(() => {
    setCameraError(null);
    setShowCamera(true);
  }, []);

  const handleCloseCamera = useCallback(() => {
    setShowCamera(false);
  }, []);

  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) return;

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `capture-${Date.now()}.png`, { type: "image/png" });

      setShowFlash(true);
      setJustAdded(true);
      setTimeout(() => setShowFlash(false), 400);
      setTimeout(() => setJustAdded(false), 700);

      onUpload(index, file);
      setShowCamera(false);
    }, "image/png");
  }, [index, onUpload]);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      if (!showCamera) return;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera error", err);
        setCameraError("Unable to access camera. Please check permissions.");
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [showCamera]);

  return (
    <div className="relative w-full aspect-[4/2.5] bg-muted overflow-hidden booth-border group">
      {/* Hidden canvas used for captures */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Camera overlay */}
      <AnimatePresence>
        {showCamera && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-booth-dark/90 z-40 flex flex-col items-center justify-center gap-3 p-3"
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            {cameraError && (
              <p className="text-xs text-red-300 text-center">{cameraError}</p>
            )}
            <div className="flex items-center gap-2 mt-1">
              <button
                onClick={handleCapture}
                className="flex-1 bg-primary text-primary-foreground text-xs font-semibold py-1.5 px-2 rounded-full"
              >
                Capture
              </button>
              <button
                onClick={handleCloseCamera}
                className="flex-1 bg-muted text-foreground text-xs font-semibold py-1.5 px-2 rounded-full"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Flash overlay */}
      <AnimatePresence>
        {showFlash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-white z-30 pointer-events-none"
          />
        )}
      </AnimatePresence>

      {image ? (
        <>
          <motion.img
            src={image}
            alt={`Photo ${index + 1}`}
            className="w-full h-full object-cover"
            style={{ filter }}
            initial={justAdded ? { y: "-100%", opacity: 0 } : false}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 120, damping: 15 }}
          />
          <button
            onClick={() => onRemove(index)}
            className="absolute top-1 right-1 bg-booth-dark/70 text-primary-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-20"
          >
            <X className="w-3 h-3" />
          </button>
        </>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <button
            onClick={() => inputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-1 hover:text-primary transition-colors"
          >
            <Upload className="w-6 h-6" />
            <span className="text-xs font-body font-semibold">Upload from gallery</span>
          </button>
          <button
            onClick={handleOpenCamera}
            className="text-[11px] font-body font-semibold px-3 py-1.5 rounded-full border border-dashed border-primary/60 text-primary hover:bg-primary/10 transition-colors"
          >
            Open camera
          </button>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
};

export default PhotoFrame;
