import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, LayoutTemplate, Sparkles, Lock, Image as ImageIcon } from "lucide-react";
import { BG_COLORS, FILTERS } from "@/lib/stickers";
import { Template, TEMPLATES } from "@/lib/templates";
import {
  loadCustomTemplates,
  saveCustomTemplates,
  loadCustomStickers,
  saveCustomStickers,
  CustomSticker,
} from "@/lib/templateStorage";

const Admin = () => {
  const navigate = useNavigate();

  const [isAuthed, setIsAuthed] = useState(false);
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("✨");
  const [bgColor, setBgColor] = useState(BG_COLORS[0]?.value ?? "hsl(0,0%,100%)");
  const [bgImage, setBgImage] = useState<string | undefined>(undefined);
  const [bgColorInput, setBgColorInput] = useState(bgColor);
  const [filter, setFilter] = useState(FILTERS[0]?.id ?? "none");
  const [saving, setSaving] = useState(false);
  const [customTemplates, setCustomTemplates] = useState<Template[]>([]);
  const [customStickers, setCustomStickers] = useState<CustomSticker[]>([]);

  useEffect(() => {
    // Simple client-side "lock" for admin page
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("magzme_admin_authed");
      if (stored === "true") {
        setIsAuthed(true);
      }
    }
    setCustomTemplates(loadCustomTemplates());
    setCustomStickers(loadCustomStickers());
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Very basic hardcoded credentials; change these as you like
    const validUser = "admin";
    const validPass = "magzme123";
    if (loginUser === validUser && loginPass === validPass) {
      setIsAuthed(true);
      setLoginError(null);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("magzme_admin_authed", "true");
      }
    } else {
      setLoginError("Incorrect username or password");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      const id = `custom-${Date.now()}`;
      const tmpl: Template = {
        id,
        name: name.trim(),
        emoji: emoji || "✨",
        bgColor: bgColorInput || bgColor,
        bgImage,
        filter,
        defaultStickers: [],
        borderStyle: "3px dashed hsl(350 20% 85%)",
        isCustom: true,
      };

      const next = [...customTemplates, tmpl];
      setCustomTemplates(next);
      saveCustomTemplates(next);
      setName("");
      setBgImage(undefined);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    const next = customTemplates.filter((t) => t.id !== id);
    setCustomTemplates(next);
    saveCustomTemplates(next);
  };

  const handleStickerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const src = String(reader.result || "");
        const id = `sticker-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const sticker: CustomSticker = { id, src, name: file.name };
        setCustomStickers((prev) => {
          const next = [...prev, sticker];
          saveCustomStickers(next);
          return next;
        });
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const handleDeleteSticker = (id: string) => {
    setCustomStickers((prev) => {
      const next = prev.filter((s) => s.id !== id);
      saveCustomStickers(next);
      return next;
    });
  };

  const allTemplates = [...TEMPLATES, ...customTemplates];

  if (!isAuthed) {
    return (
      <div className="min-h-screen bg-background grain-overlay flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-card/80 border border-border rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <Lock className="w-5 h-5 text-muted-foreground" />
            </div>
            <h1 className="font-display text-xl text-foreground">Admin login</h1>
            <p className="text-[11px] text-muted-foreground font-body text-center">
              Enter your admin username and password to access template controls.
            </p>
          </div>
          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Username</label>
              <input
                value={loginUser}
                onChange={(e) => setLoginUser(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm font-body focus:outline-none focus:border-primary"
                placeholder="admin"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Password</label>
              <input
                type="password"
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm font-body focus:outline-none focus:border-primary"
                placeholder="••••••••"
              />
            </div>
            {loginError && (
              <p className="text-[11px] text-destructive font-body">{loginError}</p>
            )}
            <button
              type="submit"
              className="w-full bg-primary text-primary-foreground font-display py-2.5 rounded-xl retro-shadow flex items-center justify-center gap-2 text-sm"
            >
              <Lock className="w-4 h-4" />
              Unlock admin
            </button>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="w-full text-[11px] text-muted-foreground hover:text-foreground font-body mt-1"
            >
              Back to home
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background grain-overlay flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/80 backdrop-blur-sm">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-display text-xl text-primary">MagzME Admin</span>
        </button>
        <button
          onClick={() => navigate("/admin/photos")}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-display hover:opacity-90"
        >
          <ImageIcon className="w-4 h-4" />
          Photo Management
        </button>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row">
        <section className="w-full lg:w-96 border-b lg:border-b-0 lg:border-r border-border bg-card/60 p-4 space-y-4">
          <h1 className="font-display text-2xl text-foreground flex items-center gap-2">
            <LayoutTemplate className="w-5 h-5" />
            Create Template
          </h1>
          <p className="text-xs text-muted-foreground font-body">
            This is a simple local admin panel. Templates you create here are saved in this browser and
            appear in the editor&apos;s Templates tab.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm font-body focus:outline-none focus:border-primary"
                placeholder="My cute template"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Emoji</label>
              <input
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm font-body"
                placeholder="⭐"
                maxLength={2}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-foreground mb-1">Background color</label>
              <div className="grid grid-cols-4 gap-2">
                {BG_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setBgColor(c.value);
                      setBgColorInput(c.value);
                    }}
                    className={`w-full aspect-square rounded-xl border-2 ${
                      bgColorInput === c.value ? "border-primary ring-2 ring-primary ring-offset-2" : "border-border"
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                ))}
              </div>
              <input
                type="text"
                value={bgColorInput}
                onChange={(e) => setBgColorInput(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-xs font-body"
                placeholder="Any CSS color (e.g. #ff99cc or hsl(...))"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-foreground mb-1">Background image (optional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => setBgImage(String(reader.result || ""));
                  reader.readAsDataURL(file);
                }}
                className="w-full text-xs"
              />
              {bgImage && (
                <div className="mt-1">
                  <p className="text-[11px] text-muted-foreground mb-1">Preview</p>
                  <div className="w-24 h-24 rounded-lg border border-border overflow-hidden">
                    <img src={bgImage} alt="" className="w-full h-full object-cover" />
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Filter</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm font-body"
              >
                {FILTERS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="w-full bg-primary text-primary-foreground font-display py-3 rounded-xl retro-shadow flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <Sparkles className="w-4 h-4" />
              {saving ? "Saving..." : "Save template"}
            </button>
          </form>
        </section>

        <section className="flex-1 p-4 space-y-6">
          <div>
            <h2 className="font-display text-lg text-foreground mb-3">All templates (including customs)</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {allTemplates.map((t) => (
              <div
                key={t.id}
                className="rounded-xl border border-border bg-card/80 p-3 flex flex-col gap-2"
              >
              <div
                className="w-full aspect-[3/4] rounded-lg flex items-center justify-center text-2xl overflow-hidden"
                style={{
                  backgroundColor: t.bgColor,
                  backgroundImage: t.bgImage ? `url(${t.bgImage})` : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  border: t.borderStyle || "3px solid hsl(350 20% 85%)",
                }}
              >
                {!t.bgImage && t.emoji}
              </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    {t.isCustom && (
                      <Lock className="w-3 h-3 text-muted-foreground" />
                    )}
                    <p className="text-xs font-body font-semibold text-foreground truncate max-w-[120px]">
                      {t.name}
                    </p>
                  </div>
                  {t.isCustom && (
                    <button
                      type="button"
                      onClick={() => handleDelete(t.id)}
                      className="text-[11px] text-destructive hover:underline font-body"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          </div>

          <div>
            <h2 className="font-display text-lg text-foreground mb-3">Custom sticker images</h2>
            <div className="space-y-3">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleStickerUpload}
                className="text-xs"
              />
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                {customStickers.map((s) => (
                  <div key={s.id} className="relative">
                    <div className="w-14 h-14 rounded-lg border border-border overflow-hidden bg-card flex items-center justify-center">
                      <img src={s.src} alt={s.name || ""} className="w-full h-full object-contain" />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteSticker(s.id)}
                      className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-4 h-4 text-[10px] flex items-center justify-center"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Admin;

