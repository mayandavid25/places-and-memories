## Plano: Sistema Multi-Board com Gerenciamento Completo

Transformar o sistema atual (1 usuário ↔ 1 couple via `profiles.couple_id`) em multi-board (N ↔ N) sem alterar UI/design, apenas adicionando seções novas na aba Perfil.

---

### 1. Banco de Dados (migration)

**Nova tabela `couple_members`** (relacionamento N↔N):
- `couple_id uuid` (FK couples)
- `user_id uuid`
- `joined_at timestamptz default now()`
- PK composta `(couple_id, user_id)`
- RLS: usuário vê suas próprias membresias + membresias de boards onde participa

**`profiles.couple_id`** continua existindo como **"board ativo"** (compatibilidade total com código atual). Nenhum dado é apagado.

**Migração de dados**: para todo `profiles` com `couple_id` não-nulo, inserir linha em `couple_members` (idempotente, `ON CONFLICT DO NOTHING`).

**Atualizar `is_in_couple()`** para checar `couple_members` (em vez de `profiles.couple_id`) — assim usuário acessa dados de qualquer board do qual é membro, mas `current_couple_id()` retorna apenas o ativo.

**Novas funções RPC**:
- `create_new_couple(_name text)` — cria couple + invite + insere em `couple_members` + opcionalmente define como ativo
- `join_couple_with_code(_code text)` — valida código, insere em `couple_members`, define como ativo
- `set_active_couple(_couple_id uuid)` — valida membresia, atualiza `profiles.couple_id`
- `regenerate_invite_code(_couple_id uuid)` — invalida códigos antigos (não-usados) e cria novo
- `leave_couple(_couple_id uuid)` — remove membresia; se era o ativo, define outro como ativo (ou null)
- `reset_couple_data(_couple_id uuid)` — DELETE em places, wishlist_items, events, entertainment_items, e suas reviews, do board específico
- `delete_user_account()` — remove membresias do usuário; chama `auth.admin.deleteUser` via serverFn separada (RPC não tem acesso); aqui apenas limpa dados pessoais

**Atualizar policies** em couples (SELECT/UPDATE) e couple_invites para usar `couple_members` ao invés de `is_in_couple` baseado em `profiles.couple_id`. Comportamento idêntico para usuários atuais (que já têm 1 board).

---

### 2. Server Function

`src/lib/account.functions.ts`:
- `deleteAccount` (createServerFn + requireSupabaseAuth) — usa `supabaseAdmin.auth.admin.deleteUser(userId)` após limpar membresias.

Registrar `attachSupabaseAuth` em `src/start.ts` se ainda não estiver.

---

### 3. UI — apenas Perfil

Editar **somente** `src/routes/_authenticated/perfil.tsx`. Adicionar três seções novas abaixo do card existente, reusando os tokens/estilos atuais (`rounded-3xl border border-border bg-card`, `Button`, `Input`, `Dialog`):

**a) "Convidar parceiro/a"**
- Mostra código atual do board ativo (busca `couple_invites` mais recente não-usado, ou regenera se nenhum)
- Botão "Copiar código" (clipboard + toast)
- Botão "Compartilhar" (Web Share API com fallback para copiar)
- Botão "Gerar novo código"
- Instrução curta abaixo

**b) "Meus espaços"**
- Lista todos os boards via `couple_members` join `couples` + count de membros
- Cada item: nome, código atual, nº participantes, data criação, botão "Tornar ativo" (ou badge "Ativo")
- Botão "Entrar em outro espaço" (modal com input de código → `join_couple_with_code`)
- Botão "Criar novo espaço" (modal com nome → `create_new_couple`)
- Botão "Sair deste espaço" (com dupla confirmação)

**c) "Zona de risco"**
- "Resetar espaço atual" — dupla confirmação → `reset_couple_data`
- "Excluir conta" — dupla confirmação → serverFn `deleteAccount` → signOut → redirect `/login`
- Botão "Sair" já existe; manter

**Componente `ConfirmDialog`** reutilizável (em `src/components/confirm-dialog.tsx`) implementando o fluxo de dupla confirmação (primeiro "Tem certeza?", depois "Ação irreversível"). Visual usa shadcn `Dialog` + tokens existentes — zero CSS novo.

---

### 4. Invalidação e troca de board

Após `set_active_couple`: `queryClient.invalidateQueries()` + `refreshProfile()` — toda a app reflete o novo board sem reload (já que tudo filtra por `profile.couple_id`).

---

### Arquivos a editar/criar

- `supabase/migrations/<new>.sql` (tabela, policies, funções, migração de dados)
- `src/lib/account.functions.ts` (novo)
- `src/start.ts` (verificar middleware)
- `src/components/confirm-dialog.tsx` (novo)
- `src/routes/_authenticated/perfil.tsx` (editar — adicionar seções; preservar tudo existente)

### Fora de escopo (não tocar)

- Calendário, Wishlist, Lugares, Entretenimento, Home, Ranking — nenhuma alteração
- Estilos globais, tokens, tipografia — nenhuma alteração
- Onboarding existente — continua funcionando (cria primeiro board via fluxo atual)
