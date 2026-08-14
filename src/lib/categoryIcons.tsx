import {
  CupSoda,
  Droplets,
  Package,
  Pill,
  Shirt,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';
import type { Category } from '../types';

/**
 * Icons keyed by category id, not stored on the category itself.
 *
 * `Category.emoji` lives in IndexedDB, but nothing in the app writes to it —
 * `saveCategory` exists in the repository and is called from nowhere. So these
 * are seeded constants rather than user data, and a code-side lookup avoids a
 * schema migration on a device holding the only copy of a health log.
 *
 * It also survives restore-from-backup: a backup taken before any migration
 * would reinstate the old emoji and silently un-migrate the install. Keying off
 * the stable id sidesteps that entirely.
 */
const BY_ID: Record<string, LucideIcon> = {
  food: UtensilsCrossed,
  drink: CupSoda,
  medicine: Pill,
  skincare: Droplets,
  material: Shirt,
  other: Package,
};

interface CategoryIconProps {
  category?: Category;
  className?: string;
}

export function CategoryIcon({ category, className }: CategoryIconProps) {
  const Icon = category ? BY_ID[category.id] : undefined;

  if (Icon) {
    return <Icon className={className} strokeWidth={1.75} aria-hidden="true" />;
  }

  // A category the user added themselves keeps whatever glyph it was given.
  return (
    <span className={className} aria-hidden="true">
      {category?.emoji ?? '📦'}
    </span>
  );
}
