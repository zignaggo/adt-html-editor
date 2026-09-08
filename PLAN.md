# Plano — adt-html-editor

Biblioteca React de edição visual de HTML com drag and drop, painel de árvore de elementos (esquerda), canvas (centro) e painel de estilos (direita). Estilização via classes Tailwind primeiro; CSS puro depois. Consumida por outro projeto via `file:`/`bun link`, sem publicação no npm.

Prioridades, nesta ordem: **1) drag and drop confiável e fluido, 2) performance com documentos grandes, 3) tudo o resto.**

---

## 0. Pré-requisito: HTML entra, HTML sai

O editor é um passo de um workflow: recebe uma string HTML, o usuário edita, e o workflow recebe de volta uma string HTML. Esse contrato manda em tudo o que vem depois.

### Contrato

```ts
<HtmlEditor
  defaultValue={html}                       // não controlado
  value={html}                              // ou controlado: reparse quando muda por fora
  onChange={(html: string, doc: Document) => void}
  ref={editorRef}                           // editorRef.current.getHtml() / setHtml() / getDocument()
/>
```

- `onChange` dispara a cada ação confirmada (drop, classe aplicada, atributo, texto ao sair do `contentEditable`, undo/redo). Nunca por frame de drag nem por tecla digitada.
- Serialização é síncrona e barata (DOM `innerHTML` a partir do modelo; 2.000 nós < 5 ms). Prop opcional `changeDebounceMs` para quem preferir.
- `getHtml()` no ref para o workflow puxar o resultado no momento que quiser (ex.: botão "Concluir").
- `value` mudando por fora substitui o documento inteiro, limpa histórico e seleção. Documentado como comportamento esperado.

### Formatos aceitos

| Entrada | Como é tratada | Saída |
|---|---|---|
| Fragmento (`<section>…</section><p>…</p>`) | Filhos diretos viram filhos do nó raiz virtual | Fragmento |
| Documento completo (`<!doctype html><html><head>…</head><body>…</body></html>`) | Edita só o conteúdo de `<body>`; `<!doctype>`, `<html>` (attrs), `<head>` inteiro e attrs de `<body>` são guardados como texto opaco | Documento completo, com `<head>` idêntico ao original |
| Detecção | Presença de `<html`, `<head` ou `<body` na entrada | — |

### Garantias de fidelidade

- **Equivalência de DOM, não de bytes.** `serialize(parse(html))` produz um HTML cujo DOM é igual ao da entrada; indentação e quebras de linha originais não são preservadas. Teste de idempotência obrigatório: `serialize(parse(serialize(parse(x)))) === serialize(parse(x))` para todos os fixtures.
- Preservados: todos os atributos (`id`, `style`, `data-*`, `aria-*`, `href`…) na ordem original; ordem das classes; tags desconhecidas e custom elements; comentários HTML (nó `comment`, visível na árvore, não editável); entidades (escape correto via serializador DOM, não concatenação de string).
- `<script>`, `<style>`, `<svg>`, `<iframe>`, `<template>` dentro do body: nós **opacos**. Aparecem na árvore, podem ser movidos/removidos, não aceitam filhos, o conteúdo interno é reemitido byte a byte.
- Nós de texto só com whitespace entre elementos de bloco são descartados no parse (não aparecem na árvore); whitespace dentro de texto real é mantido. `<pre>`, `<textarea>` e opacos preservam whitespace integral.
- Nada do editor vaza para a saída: `data-adt-id`, classes de seleção e overlays existem só no canvas renderizado, nunca no modelo.
- `class` é o único atributo com tratamento especial (vira `classes: string[]`); no serialize volta para `class="a b c"`. Se não houver classes, o atributo é omitido.

### Playground

O playground simula o workflow: textarea de entrada → editor → textarea de saída atualizada por `onChange`, com botão "Rodar round-trip" que valida a idempotência do fixture carregado. Fixtures reais do workflow devem ir em `src/playground/fixtures/` antes da Fase 1.

---

## 1. Decisões de arquitetura

| Tema | Decisão | Por quê |
|---|---|---|
| Stack | Vite 8 + React 19 + TS + React Compiler (já configurado) | Compiler elimina a maior parte de `memo`/`useCallback` manual. |
| DnD | `@atlaskit/pragmatic-drag-and-drop` (element adapter) + `-hitbox` + `-auto-scroll` + `-live-region` | Nativo, sem re-render por frame, sem provider; preview renderizado fora da main thread. |
| Modelo do documento | Mapa plano normalizado `Record<NodeId, Node>` + `children: NodeId[]` | Lookup O(1), mover nó = 2 splices, assinatura por nó, undo barato por structural sharing. |
| Store | `@tanstack/store` (uma `Store<EditorState, EditorActions>` por instância de editor) exposta por Context; hooks com `useSelector` | Re-render granular por nó; sem estado global; compatível com Compiler. |
| Estado transiente de drag | Store separada (`dragStore`) + escrita direta de `style` no indicador | Frames de drag nunca re-renderizam a árvore ou o canvas. |
| Canvas | **Mesmo documento** (sem iframe), subtree `.adt-canvas`, CSS Tailwind gerado em runtime dentro de `@scope (.adt-canvas)` | Mantém tree ↔ canvas ↔ paleta no mesmo `window`, onde o DnD nativo funciona sem gambiarras. Iframe quebraria o pdnd na fronteira. |
| Responsivo no canvas | Pós-processar CSS gerado: `@media (width >= X)` → `@container adt-canvas (width >= X)`; `.adt-canvas { container: adt-canvas / inline-size }` | Faz `md:`/`lg:` responderem à largura do canvas, não da janela do editor. |
| Compilação Tailwind | `tailwindcss` v4 `compile()` rodando em **Web Worker**, carregado sob demanda | JIT real para qualquer classe, fora da main thread, sem varrer o DOM do editor. |
| Parse/autocomplete de classes | `__unstable__loadDesignSystem` (mesmo worker): `parseCandidate`, `getClassList` | Fonte única de verdade para agrupar classes, validar e sugerir. |
| Conflito de classes | `tailwind-merge` | Já resolve `p-4` vs `px-2`, variantes, valores arbitrários. |
| Estilos do editor (UI) | CSS Modules + tokens em CSS variables (`--adt-*`) | Zero colisão com o Tailwind do consumidor ou do canvas; CSS único em `dist/style.css`. |
| API pública | Compound components + provider (`<HtmlEditor>` / `.Layers` / `.Canvas` / `.Inspector`) | Consumidor monta o layout que quiser; segue `architecture-compound-components`. |
| Build | Vite `build.lib` (ESM), `react`/`react-dom` como peerDependencies, playground separado em `src/playground` | Lib e app de teste no mesmo repo sem misturar. |

### O que foi descartado

- **Iframe no canvas**: isolamento perfeito, mas drag da árvore para dentro do iframe vira "external drag" (dados só no drop, sem hover), e drag iniciado no canvas não chega ao pdnd do pai. Se um dia for necessário, a fronteira `CanvasHost` (§3.3) é o único ponto a trocar.
- **`@tailwindcss/browser` via `<script>`**: varre o documento inteiro por MutationObserver (incluindo a UI do editor) e não dá controle de escopo.
- **dnd-kit / react-dnd**: baseados em pointer events com estado React por frame; mais pesados para árvores grandes.

---

## 2. Estrutura de pastas

```
src/
  lib/
    index.ts                      # exports públicos
    core/
      model.ts                    # Node, NodeId, Document, helpers puros
      store.ts                    # createEditorStore (@tanstack/store) + actions
      history.ts                  # undo/redo (pilha de snapshots do mapa)
      html/parse.ts               # HTML string -> Document (DOMParser)
      html/serialize.ts           # Document -> HTML string
      ids.ts
    dnd/
      data.ts                     # symbol type guards: isNodeDrag, isPaletteDrag
      dragStore.ts                # estado transiente (indicador, alvo atual)
      useNodeDraggable.ts
      useTreeDropTarget.ts        # attachInstruction (tree-item hitbox)
      useCanvasDropTarget.ts      # attachClosestEdge
      useEditorDropMonitor.ts     # monitor único que aplica moveNode/insertNode
      preview.tsx                 # setCustomNativeDragPreview
      resolveDrop.ts              # (target, instruction|edge) -> { parentId, index }
    tailwind/
      worker.ts                   # compile(), build(), parseCandidate, getClassList
      client.ts                   # RPC com o worker, debounce, cache de classes
      scopeCss.ts                 # @scope + media->container rewrite
      categories.ts               # famílias de utilitários -> controles do Inspector
      useCanvasStylesheet.ts      # injeta <style> gerado
    components/
      Editor/EditorProvider.tsx
      Layers/{LayersPanel,LayerRow,TreeDropIndicator}.tsx
      Canvas/{Canvas,CanvasNode,SelectionOverlay,CanvasDropIndicator}.tsx
      Inspector/{InspectorPanel,ClassChips,ClassCombobox,VariantBar}.tsx
      Inspector/controls/{Display,Spacing,Sizing,Typography,Color,Border}.tsx
      Palette/{Palette,PaletteItem}.tsx
    styles/tokens.css + *.module.css ao lado de cada componente
  playground/
    main.tsx, App.tsx, fixtures/*.html
```

---

## 3. Design detalhado

### 3.1 Modelo

```ts
type NodeId = string
type ElementNode = { id; kind: 'element'; tag: string; attrs: Record<string, string>; classes: string[]; parentId: NodeId | null; children: NodeId[] }
type TextNode    = { id; kind: 'text'; value: string; parentId: NodeId }
type CommentNode = { id; kind: 'comment'; value: string; parentId: NodeId }
type OpaqueNode  = { id; kind: 'opaque'; tag: string; attrs: Record<string, string>; classes: string[]; rawInnerHtml: string; parentId: NodeId }
type Envelope    = { kind: 'fragment' } | { kind: 'document'; doctype: string; htmlAttrs: string; head: string; bodyAttrs: string }
type Document    = { rootId: NodeId; nodes: Record<NodeId, AnyNode>; envelope: Envelope }
```

`Envelope` guarda o que fica fora do body como texto opaco, para o serialize devolver o documento completo idêntico fora da área editada (ver §0).

Ações da store (todas imutáveis, cada uma gera 1 entrada de histórico): `insertNode`, `moveNode(id, parentId, index)`, `removeNode`, `duplicateNode`, `setClasses`, `setAttr`, `setText`, `select`, `toggleCollapsed`, `undo`, `redo`.

`moveNode` valida ciclo (destino não pode ser descendente da origem) usando um `Set` de ancestrais.

Selectors por nó: `useNode(id)` assina só `nodes[id]`; `useChildren(id)` assina só `nodes[id].children`. Mudar a classe de um nó re-renderiza um único `CanvasNode` e uma única `LayerRow`.

### 3.2 Drag and drop (pdnd)

**Dados tipados** (`dnd/data.ts`): chave `Symbol` + type guard, nunca cast.

```ts
{ [nodeKey]: true, nodeId }           // arrastar nó existente (árvore ou canvas)
{ [paletteKey]: true, template }      // arrastar da paleta
```

**Origens (`draggable`)**
- `LayerRow`: `element` = a linha inteira. `getInitialData` com `nodeId`. Preview customizado (chip com `<tag>` + resumo de classes) via `setCustomNativeDragPreview` + `pointerOutsideOfPreview`.
- `CanvasNode`: mesmo `draggable`. Nunca usar `canDrag` para bloquear (cancela o drag do pai); nó raiz simplesmente não registra `draggable`.
- `PaletteItem`: `getInitialData` com o template.

**Alvos (`dropTargetForElements`)**
- `LayerRow`: `getData` com `attachInstruction` do `@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item` (instruções `reorder-above` / `reorder-below` / `make-child` / `reparent`), `getIsSticky: () => true` para cobrir gaps entre linhas, `canDrop` rejeita ancestral-em-descendente. *Verificar a assinatura atual de `attachInstruction` na doc do pacote antes de implementar.*
- `CanvasNode`: `getData` com `attachClosestEdge`; `allowedEdges` derivado do layout do pai (`flex-row` → `left/right`, senão `top/bottom`). Containers vazios aceitam "inside".
- Contêiner da árvore e o `.adt-canvas` são alvos estáveis de fallback: garantem um evento `drop` real mesmo quando a linha arrastada foi desmontada (virtualização).

**Monitor único** (`useEditorDropMonitor`, no provider): `canMonitor` filtra pelos type guards; `onDrop` lê `location.current.dropTargets[0]`, chama `resolveDrop` e despacha `moveNode`/`insertNode`. Nenhum alvo individual muda a store.

**Indicadores**: um componente `TreeDropIndicator` e um `CanvasDropIndicator`, ambos posicionados por `getBoundingClientRect` do alvo, atualizados por `onDropTargetChange` via `dragStore`. Só o indicador re-renderiza; as linhas não. Feedback de "dragging" na origem via `data-state` e CSS.

**Auto-scroll**: `autoScrollForElements` no scroll da árvore e no canvas.

**Acessibilidade**: mover por teclado (`Alt+↑/↓` reordena, `Alt+←/→` reparenta) e anúncios com `-live-region`.

### 3.3 Canvas

- `Canvas` renderiza `CanvasNode(rootId)` recursivamente dentro de `.adt-canvas`. Cada `CanvasNode` cria o elemento real (`createElement(tag)`) com `className={classes.join(' ')}` e `data-adt-id`.
- Hover e seleção: **um** `SelectionOverlay` absoluto (não uma borda por nó), reposicionado com `ResizeObserver` + `scroll` do canvas. Hover via `pointerover` delegado no contêiner (lê `data-adt-id` mais próximo).
- Interface `CanvasHost { root: HTMLElement; elementFromPoint; getRect }` — único ponto de acoplamento se um dia for para iframe.
- `useCanvasStylesheet`: coleta o `Set` de classes do documento (mantido incrementalmente na store), envia ao worker só quando aparecem classes novas, injeta o CSS retornado em `<style data-adt-canvas>`.

### 3.4 Worker Tailwind

- Entrada: `compile()` de um CSS com `@layer theme, base, utilities`, importando `tailwindcss/theme.css`, `tailwindcss/preflight.css` e `tailwindcss/utilities.css` nas respectivas layers, mais `@custom-variant dark (&:where(.adt-dark, .adt-dark *))`. `loadStylesheet` resolve os `.css` do pacote via import `?raw`.
- Mensagens: `build(candidates: string[]) → css`, `parse(className) → { root, value, variants, valid }`, `classList() → string[]`.
- `scopeCss`: envolve em `@scope (.adt-canvas)` e reescreve as media queries de breakpoint para container queries.
- Carregamento lazy (só quando o primeiro `<Canvas>` monta); cache de resultados por classe.

### 3.5 Inspector (modo Tailwind)

- `VariantBar`: base | sm | md | lg | xl | hover | focus | dark. Todo controle aplica o prefixo ativo.
- `ClassChips`: lista das classes do nó, filtrada pela variante ativa, com remover e reordenar.
- `ClassCombobox`: input livre com autocomplete (`getClassList` + `useDeferredValue` no filtro); Enter aplica via `twMerge`.
- Controles por família (`categories.ts` mapeia família → controle): Display, Flex/Grid, Spacing (`p/m/gap` com escala + arbitrário), Sizing, Typography, Color (bg/text/border com paleta do tema), Border/Radius, Effects. Cada controle lê o valor atual via `parseCandidate` e escreve com `twMerge(existing, next)`.
- Edição de texto inline no canvas (`contentEditable` no `TextNode` selecionado, commit no blur).
- Interface `StyleAdapter` (`tailwind` agora, `inline-css` depois) para o modo CSS puro.

### 3.6 API pública

```tsx
<HtmlEditor defaultValue={html} onChange={(html) => ...} styleMode="tailwind">
  <HtmlEditor.Layers />
  <HtmlEditor.Canvas />
  <HtmlEditor.Inspector />
</HtmlEditor>

<HtmlEditor.DefaultLayout defaultValue={html} onChange={...} />   // atalho 3 painéis
```

Contrato completo de entrada/saída (`value`, `onChange`, `ref.getHtml()`, formatos) em §0.

Também exportados: `parseHtml`, `serializeHtml`, `useEditor()` (headless), tipos. `parseHtml`/`serializeHtml` são puros e podem ser usados pelo workflow fora do React (ex.: validar ou pré-processar o HTML antes de abrir o editor).

---

## 4. Regras de performance (aplicadas em todas as fases)

- Frames de drag nunca passam por `setState` de lista: indicador e overlay escrevem `style` direto (`rerender-use-ref-transient-values`).
- Store por nó, selectors primitivos, `functional setState` (`rerender-*`).
- `getData`/`canDrop` puros e baratos; ancestrais calculados com `once` no início do drag.
- Imports do pdnd só por entry point; worker Tailwind e `tailwind-merge` carregados lazy (`bundle-*`).
- Linhas da árvore e nós do canvas com `content-visibility: auto`; virtualização da árvore (`@tanstack/react-virtual`) quando a lista visível passar de ~300 linhas.
- `startTransition` ao aplicar classes vindas do combobox; `useDeferredValue` no filtro de autocomplete.
- Sem componentes definidos dentro de componentes; sem barrel `index.ts` interno além do público.
- Orçamento: 2.000 nós, drag a 60 fps, aplicar classe → CSS visível em < 50 ms, `npx react-doctor` sem regressão (hook de Stop já configurado).

---

## 5. Fases

### Fase 0 — Fundação (1 dia)
- [x] Instalar: `@atlaskit/pragmatic-drag-and-drop`, `-hitbox`, `-auto-scroll`, `-live-region`, `@tanstack/store`, `@tanstack/react-store`, `tiny-invariant`, `tailwindcss`, `tailwind-merge`; dev: `vitest`, `@testing-library/react`, `@atlaskit/pragmatic-drag-and-drop-unit-testing`, `@tanstack/react-virtual` (fase 6).
- [x] Reorganizar `src/` em `lib/` e `playground/`; `vite.config.ts` com `build.lib`; `package.json` com `exports`, `peerDependencies`, `files`.
- [x] `tokens.css`, tema claro/escuro, remover assets do template.
- **Pronto quando**: `bun run build` gera `dist/index.js` + `dist/style.css`; playground roda.

### Fase 1 — Núcleo do documento (1–2 dias)
- [x] `model.ts`, `store.ts` com todas as ações, `history.ts`.
- [x] `parse.ts`: fragmento e documento completo (envelope), nós `comment` e `opaque`, descarte de whitespace insignificante, `class` → `classes`.
- [x] `serialize.ts`: construção via DOM (`innerHTML`) para escape correto; reemissão do envelope; `rawInnerHtml` dos opacos byte a byte.
- [x] `EditorProvider` com `value`/`defaultValue`/`onChange`/`ref` (§0), ainda sem UI.
- [x] Testes unitários: move com ciclo, undo/redo, idempotência de round-trip em todos os fixtures, equivalência de DOM (`isEqualNode`) entre entrada e saída, ausência de `data-adt-*` na saída.
- **Pronto quando**: 100% das ações testadas sem UI e todos os fixtures reais do workflow passam no round-trip.

### Fase 2 — Painel de camadas + DnD (o marco principal, 3–4 dias)
- [x] `LayersPanel` com linhas planas derivadas do documento (respeitando collapsed), indentação por nível, expandir/colapsar, seleção.
- [x] `useNodeDraggable`, `useTreeDropTarget` com `attachInstruction`, `TreeDropIndicator`, preview customizado, stickiness.
- [x] `useEditorDropMonitor` + `resolveDrop` (todas as instruções).
- [x] Auto-scroll, teclado, live region.
- [x] Testes de `resolveDrop` contra o pacote `-hitbox` real (o pacote `-unit-testing` só entrega polyfills) + drag nativo verificado no browser.
- **Pronto quando**: reordenar/reparentar em árvore de 1.000 nós sem frame > 16 ms (medir com `react-doctor scan`).

### Fase 3 — Canvas (3 dias)
- [x] `Canvas`, `CanvasNode`, `SelectionOverlay` (hover + seleção), clique seleciona e sincroniza com a árvore (scroll into view).
- [x] Worker Tailwind + `scopeCss` + `useCanvasStylesheet`; variantes responsivas via container query; toggle dark.
- [x] `useCanvasDropTarget` com closest-edge e "inside"; `CanvasDropIndicator`; drag iniciado no canvas.
- [x] Controle de largura do canvas (presets mobile/tablet/desktop).
- **Pronto quando**: soltar da árvore no canvas e vice-versa funciona com indicador correto; `md:flex` reage à largura do canvas.

### Fase 4 — Inspector Tailwind (3 dias)
- [x] `VariantBar`, `ClassChips`, `ClassCombobox` com autocomplete.
- [x] `categories.ts` + controles (Display, Flex/Grid, Spacing, Sizing, Typography, Color, Border, Effects).
- [x] Resolução de conflitos com `tailwind-merge`; leitura do valor atual via `parseCandidate`.
- [x] Atributos básicos (`id`, `href`, `src`, `alt`) e edição de texto inline.
- **Pronto quando**: qualquer classe válida é aplicável por controle ou por texto e aparece no canvas em < 50 ms.

### Fase 5 — Paleta e operações (2 dias)
- [x] `Palette` com templates (div, section, h1–h6, p, img, button, a, ul/li) arrastáveis para árvore e canvas.
- [x] Deletar, duplicar, copiar/colar (clipboard interno), atalhos (Del, Ctrl+D, Ctrl+Z/Y).
- [ ] Drop externo de texto/HTML com `dropTargetForExternal` (opcional).

### Fase 6 — Performance (2 dias)
- [x] Virtualizar a árvore (janela própria de altura fixa, sem `@tanstack/react-virtual`); alvo estável de drop no contêiner.
- [x] Perfil com `npx react-doctor scan` em documento de 2.000 nós; corrigir hot paths.
- [x] `npx react-doctor --verbose` completo, score ≥ 90.

### Fase 7 — Endurecimento e empacotamento (2 dias)
- [x] Auditoria com web-design-guidelines (foco visível, contraste, alvos ≥ 24 px, `prefers-reduced-motion`, labels).
- [x] `StyleAdapter` para CSS puro (esqueleto + controles básicos de `style`).
- [x] README de uso da lib.
- [ ] Testar consumo real via `file:` no outro projeto (precisa do outro repo).

---

## 6. Riscos e spikes (fazer antes das fases que dependem deles)

| Risco | Impacto | Mitigação / spike |
|---|---|---|
| API do `hitbox/tree-item` diferente do lembrado | Fase 2 | Spike de 1 h lendo a doc do pacote instalado antes de codar `useTreeDropTarget`. |
| `tailwindcss` `compile()` no browser/worker (resolução dos `.css` internos, tamanho ~300 KB) | Fase 3 | Spike de 2 h: worker mínimo que compila `["flex","p-4","md:grid"]`. Se falhar, plano B: `@tailwindcss/browser` restrito ao `.adt-canvas` por fork do scanner. |
| Reescrita `@media` → `@container` deixar escapar variantes (`max-md:`, `min-[...]`) | Fase 3 | Cobrir com testes de snapshot do CSS gerado. |
| `@scope` sem suporte em browser alvo do consumidor | Fase 3 | Verificar alvo; fallback: prefixar seletores com `.adt-canvas ` via reescrita. |
| `DOMParser` normaliza HTML inválido ou frouxo (fecha `<p>` implícito, insere `<tbody>`, reordena `<head>`/`<body>`) e a saída diverge da entrada | Fase 1 e o workflow | Rodar os fixtures reais cedo; documentar que a saída é HTML válido equivalente. Se o workflow exigir preservar HTML não normalizado, trocar por parser tolerante (`parse5`) no parse. |
| DnD nativo em touch | Geral | Aceito para v1 (desktop-first); avaliar polyfill depois. |
| React Compiler + efeitos do pdnd | Fase 2 | Efeitos com deps mínimas (`nodeId`), cleanup sempre retornado; remount mid-drag é seguro por reconciliação. |

---

## 7. Fora de escopo (v1)

Publicação no npm, colaboração em tempo real, edição de `<head>`/scripts, componentes reutilizáveis (símbolos), modo CSS puro completo, suporte a touch.
