export type PlaceCategory = "restaurante" | "cafe" | "bar" | "viagem" | "diversao";

export const CATEGORIES: PlaceCategory[] = ["restaurante", "cafe", "bar", "viagem", "diversao"];

export const CATEGORY_LABEL: Record<PlaceCategory, string> = {
  restaurante: "Restaurante",
  cafe: "Café",
  bar: "Bar",
  viagem: "Viagem",
  diversao: "Diversão",
};

export const CATEGORY_LABEL_PLURAL: Record<PlaceCategory, string> = {
  restaurante: "Restaurantes",
  cafe: "Cafés",
  bar: "Bares",
  viagem: "Viagens",
  diversao: "Diversões",
};

export type EntertainmentType = "filme" | "serie" | "jogo" | "livro";
export const ENT_TYPES: EntertainmentType[] = ["filme", "serie", "jogo", "livro"];
export const ENT_LABEL: Record<EntertainmentType, string> = {
  filme: "Filmes",
  serie: "Séries",
  jogo: "Jogos",
  livro: "Livros",
};

export const ENT_STATUS_LABEL: Record<string, string> = {
  quero_consumir: "Quero ver",
  consumindo: "Em andamento",
  concluido: "Concluído",
};

export const ENT_PROGRESS_UNIT_BY_TYPE: Record<EntertainmentType, { label: string; unit: string }> = {
  filme: { label: "minuto", unit: "min" },
  serie: { label: "episódio", unit: "ep" },
  jogo: { label: "hora", unit: "h" },
  livro: { label: "capítulo", unit: "cap" },
};

export const WISHLIST_STATUS_LABEL: Record<string, string> = {
  queremos_visitar: "Queremos visitar",
  planejado: "Planejado",
  visitado: "Visitado",
};

export type RecipeCategory =
  | "cafe_da_manha"
  | "almoco"
  | "jantar"
  | "sobremesa"
  | "lanche"
  | "drinks"
  | "outros";

export const RECIPE_CATEGORIES: RecipeCategory[] = [
  "cafe_da_manha",
  "almoco",
  "jantar",
  "sobremesa",
  "lanche",
  "drinks",
  "outros",
];

export const RECIPE_CATEGORY_LABEL: Record<RecipeCategory, string> = {
  cafe_da_manha: "Café da manhã",
  almoco: "Almoço",
  jantar: "Jantar",
  sobremesa: "Sobremesa",
  lanche: "Lanche",
  drinks: "Drinks",
  outros: "Outros",
};
