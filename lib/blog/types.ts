import type { ComponentType } from "react";

export type BlogPostEntry = {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt?: string;
  keywords: string[];
  /** Código promocional opcional mostrado en CTA del post. */
  promoCode?: string;
  /** Cuerpo del artículo (incluye el H1 principal). */
  Component: ComponentType;
};
