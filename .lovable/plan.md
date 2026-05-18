# Nossos lugares e memórias

App web responsivo (mobile-first) para casais registrarem lugares, memórias e planos juntos. Estética clean inspirada em Letterboxd + Pinterest, com paleta neutra e detalhes em rosa queimado / vinho claro.

## Stack

- TanStack Start + React + TailwindCSS (template atual)
- Lovable Cloud (Supabase) para auth, banco e storage
- Auth: Email/senha + Google (via broker Lovable) + recuperação de senha
- shadcn/ui para componentes base

## Design system

- Paleta neutra (off-white, areia, carvão) + acento rosa queimado (`#B5654E` aprox) e vinho claro
- Tipografia: serif elegante para títulos (Instrument Serif / Cormorant), sans minimalista para corpo (Inter / Work Sans)
- Cantos arredondados generosos (rounded-2xl), bastante whitespace
- Dark mode opcional (toggle no perfil)
- Animações sutis (fade/slide) com tailwindcss-animate
- Tokens semânticos em `src/styles.css` (oklch) — sem cores hardcoded

## Estrutura de rotas

```
src/routes/
  __root.tsx            shell + QueryClient + auth listener + theme
  index.tsx             redirect para /login ou /home
  login.tsx             tela de login/cadastro/reset (pública)
  reset-password.tsx    fluxo de recuperação
  _authenticated.tsx    layout protegido (sidebar desktop + bottom nav mobile)
    home.tsx
    lugares.tsx         lista + filtros + busca
    lugares.$id.tsx     detalhe + avaliações dos dois
    lugares.novo.tsx
    wishlist.tsx
    ranking.tsx
    entretenimento.tsx           tabs: filmes / séries / jogos / livros
    calendario.tsx
    perfil.tsx
```

## Schema do banco (Lovable Cloud)

- `profiles` (id → auth.users, username, display_name, avatar_url, couple_id)
- `couples` (id, created_at) — duas pessoas compartilham um `couple_id`
- `couple_invites` (code, couple_id, expires_at) — primeiro usuário cria o casal, segundo entra com código
- `places` (id, couple_id, name, category[restaurante|café|bar|viagem], location, visited_at, photos[], created_by, favorited, created_at)
- `place_reviews` (id, place_id, user_id, rating 1-5, comment, created_at) — uma por usuário por lugar
- `wishlist_items` (id, couple_id, name, category, note, priority, status, created_by)
- `entertainment_items` (id, couple_id, type[filme|série|jogo|livro], title, cover_url, status, created_by)
- `entertainment_reviews` (id, item_id, user_id, rating, comment)
- `events` (id, couple_id, title, description, date, time, location, status, created_by)
- Storage bucket `photos` (público) para fotos de lugares, capas e avatares

RLS: tudo restrito por `couple_id == (select couple_id from profiles where id = auth.uid())`. `has_couple_access(couple_id)` security definer para evitar recursão.

## Telas (resumo)

- **Login**: card centralizado, frase em itálico ("Só é preciso encontrar alguém por quem ter coragem" — Devoradores de estrelas), email/senha, Entrar, Criar conta, Entrar com Google, link "Esqueci minha senha".
- **Onboarding casal**: após cadastro, criar casal ou colar código de convite do parceiro.
- **Home**: grid Pinterest com últimos lugares, próximos eventos, top 3 do ranking, últimos comentários.
- **Lugares**: grid de cards com foto, nota média, badges; filtros por categoria/nota; busca; FAB para adicionar. Detalhe mostra duas avaliações lado a lado (avatar + nota + comentário de cada um).
- **Wishlist**: lista agrupada por status com prioridade visual.
- **Ranking**: 4 seções (restaurantes/cafés/bares/viagens) ordenadas por média ponderada.
- **Entretenimento**: tabs estilo Letterboxd, grid de capas, status pill.
- **Calendário**: visão mensal + lista de próximos; destaque para datas especiais.
- **Perfil**: avatar, nome, stats (lugares adicionados, avaliações, favoritos), toggle dark mode, logout.

## Navegação

- Mobile: bottom nav com 5 itens principais (Home, Lugares, Wishlist, Calendário, Perfil) + acesso a Ranking/Entretenimento via Home/menu
- Desktop: sidebar shadcn colapsável com todos os 7 itens

## Entregáveis por fase

1. **Setup**: ativar Lovable Cloud, design tokens, layout autenticado, bottom nav + sidebar
2. **Auth**: login/cadastro/Google/reset + onboarding de casal
3. **Lugares + Wishlist + Ranking** (núcleo)
4. **Entretenimento**
5. **Calendário**
6. **Perfil + dark mode + polish**

Aprove para eu começar pela fase 1 (setup + auth + estrutura de navegação).
