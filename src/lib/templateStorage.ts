import { Template } from "./templates";

const CUSTOM_TEMPLATES_KEY = "magzme_custom_templates";
const UNLOCKED_TEMPLATES_KEY = "magzme_unlocked_templates";
const CUSTOM_STICKERS_KEY = "magzme_custom_stickers";

export interface CustomSticker {
  id: string;
  src: string;
  name?: string;
}

export function loadCustomTemplates(): Template[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_TEMPLATES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Template[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCustomTemplates(templates: Template[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(templates));
}

export function loadUnlockedTemplateIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(UNLOCKED_TEMPLATES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveUnlockedTemplateIds(ids: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(UNLOCKED_TEMPLATES_KEY, JSON.stringify(ids));
}

export function loadCustomStickers(): CustomSticker[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_STICKERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CustomSticker[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCustomStickers(stickers: CustomSticker[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CUSTOM_STICKERS_KEY, JSON.stringify(stickers));
}

