## Plano: Receitas (nova aba), Lugares (edição + categoria) e Entretenimento (detalhes + progresso)

Três áreas independentes, todas preservando o visual atual (tokens, `rounded-3xl border border-border bg-card`, `Instrument Serif` + `Inter`, paleta existente). Zero alteração em `styles.css`, navegação, home, calendário, wishlist ou perfil — exceto adicionar o link de Receitas na navegação principal (mesmo padrão dos outros itens).

---

### 1. RECEITAS (nova aba)

**Banco (migration única):**

- `recipes` — `id`, `couple_id`, `name`, `description`, `category` (enum `recipe_category`: cafe_da_manha, almoco, jantar, sobremesa, lanche, drinks, outros — nullable), `cover_url`, `photos text[]`, `planned_date date`, `created_by`, `created_at`, `updated_at`.
- `recipe_ingredients` — `id`, `recipe_id`, `text`, `checked bool`, `position int`, `created_at`. Cascade delete.
- `recipe_comments` — `id`, `recipe_id`, `user_id`, `comment text`, `created_at`.
- RLS espelhando `places`/`wishlist_items`: `is_in_couple(couple_id)` + insert exige `created_by = auth.uid()`. Para ingredientes/comentários, usa subquery via `recipes`.
- Storage: reaproveita bucket `photos` (já privado, já assinado).

**Categorias:** adicionar em `src/lib/categories.ts` (`RECIPE_CATEGORIES`, `RECIPE_CATEGORY_LABEL`).

**Rotas:**
- `src/routes/_authenticated/receitas.tsx` — lista (cards igual aos de Lugares/Wishlist), filtro por categoria, busca, botão "Nova receita" → abre modal de criação. Click no card abre modal de detalhes/edição com:
  - foto destaque + galeria (upload/remover via storage), nome, categoria, descrição, data, checklist de ingredientes (input inline para adicionar, checkbox para marcar, X para remover, autosave debounced), comentários (lista + input).
  - mesmo padrão de `Dialog` shadcn já usado.

**Navegação:** adicionar item "Receitas" no nav principal (mesmo componente que abriga Lugares/Calendário/Wishlist/Entretenimento — preservando exatamente o estilo dos demais itens).

---

### 2. LUGARES

**Banco (migration):**
- Adicionar valor `'diversao'` ao enum `place_category`.
- Atualizar `src/lib/categories.ts`: incluir `"diversao"` em `CATEGORIES`, labels "Diversão"/"Diversões".

**UI:**
- `src/routes/_authenticated/lugares/index.tsx` — adicionar filtro Diversão (gerado pela lista de categorias, sem hardcode).
- `src/routes/_authenticated/lugares/$id.tsx` — converter a página atual em **modo edição inline** dentro de um modal elegante:
  - clicar no card da lista abre `Dialog` (em vez de navegar) com todos os campos editáveis: nome, categoria, nota (estrelas), comentário, endereço (PlaceAutocomplete já existe), data (visited_at), status (favoritado), upload/remover fotos.
  - manter rota `$id.tsx` funcional como fallback (deep link), reusando o mesmo componente de detalhes.
- Upload de fotos pós-criação: botão "Adicionar fotos" → faz upload no bucket `photos` e dá `UPDATE places SET photos = array_append(...)`.
- Remover foto: `array_remove` + delete do arquivo no storage.
- Ranking (`ranking.tsx`): incluir nova categoria automaticamente se gerado por `CATEGORIES`.

---

### 3. ENTRETENIMENTO

**Banco (migration):**
- `entertainment_items` adicionar colunas: `description text`, `progress_current int`, `progress_total int`, `progress_unit text` (free: "min", "ep", "temp", "cap"), `progress_note text`, `updated_at`.
- Renomear/usar `cover_url` (já existe).

**Storage:** bucket `photos` para capas.

**UI:** `src/routes/_authenticated/entretenimento.tsx`
- Cards passam a mostrar capa (16:9 ou 2:3 para filme/série/livro, 16:9 para jogo) com fallback elegante quando ausente — usando `bg-muted` e ícone.
- Agrupar lista em 3 seções colapsadas/visíveis por status: **Quero ver**, **Em andamento**, **Concluído**. Mantém abas de tipo existentes.
- Click no card → `Dialog` com:
  - upload de capa (substituir / remover)
  - editar título, tipo, descrição, status
  - nota (StarRating já existe) + comentário (via `entertainment_reviews`)
  - se status = `consumindo`: bloco "Progresso" com `progress_current/progress_total/unit/note` (e atalhos por tipo: filme → minutos; série → temporada/episódio; livro → capítulo/página; jogo → horas).
  - histórico de comentários (lista de reviews existentes).

---

### Arquivos

**Migrations**
- `supabase/migrations/<ts>_recipes.sql`
- `supabase/migrations/<ts>_places_diversao.sql`
- `supabase/migrations/<ts>_entertainment_progress.sql`

**Novos**
- `src/routes/_authenticated/receitas.tsx`

**Editados**
- `src/lib/categories.ts` (Diversão + Recipes)
- componente de navegação principal (adicionar item Receitas)
- `src/routes/_authenticated/lugares/index.tsx` (modal de detalhes/edição no click)
- `src/routes/_authenticated/lugares/$id.tsx` (reusa modo edição)
- `src/routes/_authenticated/entretenimento.tsx` (capas, seções por status, modal detalhes + progresso)

### Fora de escopo
- Calendário, Wishlist, Perfil, Home, Onboarding, Ranking estrutural, estilos globais, integrações novas. APIs externas de capas/posters não serão usadas (apenas upload manual conforme pedido).
