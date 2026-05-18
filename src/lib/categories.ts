export type PlaceCategory = "restaurante" | "cafe" | "bar" | "viagem";

export const CATEGORIES: PlaceCategory[] = ["restaurante", "cafe", "bar", "viagem"];

export const CATEGORY_LABEL: Record<PlaceCategory, string> = {
  restaurante: "Restaurante",
  cafe: "Café",
  bar: "Bar",
  viagem: "Viagem",
};

export const CATEGORY_LABEL_PLURAL: Record<PlaceCategory, string> = {
  restaurante: "Restaurantes",
  cafe: "Cafés",
  bar: "Bares",
  viagem: "Viagens",
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

export const WISHLIST_STATUS_LABEL: Record<string, string> = {
  queremos_visitar: "Queremos visitar",
  planejado: "Planejado",
  visitado: "Visitado",
};
