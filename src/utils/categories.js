import { Ionicons } from '@expo/vector-icons';

// Stored course/certificate `category` values are a mix of category ids
// ("engineering") and labels ("AI & ML", "STEM"). Resolve either form against
// the DB-driven category list, case-insensitively. Returns { id, label, icon,
// color } or null.
export const resolveCategory = (value, categories = []) => {
  if (!value) return null;
  const v = String(value).trim().toLowerCase();
  return (
    categories.find(
      (c) =>
        String(c.id).toLowerCase() === v ||
        String(c.label).toLowerCase() === v
    ) || null
  );
};

// Dashboard-authored categories may carry an icon name that isn't a valid
// Ionicons glyph (e.g. "brain"); fall back so the chip still renders.
export const safeIcon = (name) =>
  name && Ionicons.glyphMap?.[name] ? name : 'pricetags-outline';
