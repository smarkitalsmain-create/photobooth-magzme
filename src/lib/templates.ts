export interface Template {
  id: string;
  name: string;
  emoji: string;
  bgColor: string;
  /** Optional background image URL or data URL */
  bgImage?: string;
  filter: string;
  defaultStickers: { emoji: string; x: number; y: number }[];
  overlayStyle?: string;
  borderStyle?: string;
  /** Marks templates created from the admin panel */
  isCustom?: boolean;
}

// No built-in templates; only admin-created custom templates are used now.
export const TEMPLATES: Template[] = [];
