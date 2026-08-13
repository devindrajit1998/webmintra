export const TEMPLATE_CATALOG = [
  { id: "studio", name: "Studio", category: "Creative", description: "A bold portfolio for agencies and creators." },
  { id: "local-business", name: "Local Business", category: "Business", description: "A polished presence for service businesses." },
  { id: "restaurant", name: "Restaurant", category: "Food & Drink", description: "Menus, reservations, and local discovery." },
  { id: "consulting", name: "Consulting", category: "Professional", description: "A trusted digital home for expert services." },
  { id: "wellness", name: "Wellness", category: "Health & Wellness", description: "A calm and clear experience for wellbeing brands." },
  { id: "retail", name: "Retail", category: "Commerce", description: "A conversion-ready storefront presentation." },
];

export function findCatalogTemplate(id) {
  return TEMPLATE_CATALOG.find((template) => template.id === id);
}
