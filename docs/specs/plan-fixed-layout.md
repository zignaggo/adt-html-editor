# Plano — Fixed layout mode

Modo do editor para livros de layout fixo (EPUB FXL e afins): páginas com dimensões declaradas e elementos posicionados de forma absoluta para reproduzir a página impressa. O modo atual (fluxo, Tailwind, reordenação por hitbox) continua existindo; o fixed layout é um segundo comportamento do canvas, do drag and drop e do inspector, escolhido por documento.

Prioridades, nesta ordem: **1) arrastar sem glitch e com precisão de 1 px, 2) fidelidade visual ao livro original, 3) tudo o resto.**

Os padrões aplicados vêm dos skills `pragmatic-dnd-core`, `pragmatic-dnd-react`, `vercel-composition-patterns`, `vercel-react-best-practices` e `react-doctor`. Cada seção cita a regra que a justifica quando não for óbvio.

---

## 0. O que muda em relação ao modo de fluxo

| Tema | Fluxo (hoje) | Fixed layout |
|---|---|---|
| Página | Largura por preset, altura pelo conteúdo | Largura × altura fixas vindas do documento; zoom por `transform: scale()` |
| Posição de um elemento | Dada pela ordem no DOM | `position: absolute; left; top` em `px`, escrita no atributo `style` |
| Drop de um elemento existente | Reordena/aninha conforme zona (borda/centro) e prioridade ao pai | Move para o **container da página** (primeiro pai da estrutura) e grava a nova posição; todos os elementos ficam no mesmo nível |
| Indicador | Linha/caixa de destino | Ghost do próprio elemento na posição final + guias de alinhamento |
| Preview nativo | Chip com tag e classes | Duas estratégias: **imagem** (preview nativo rasterizado) ou **cópia renderizada** (ghost vivo em camada própria) |
| Ordem na árvore | Ordem de leitura | Ordem de empilhamento (último = por cima); a árvore vira controle de z-order |
| CSS do documento | Só Tailwind compilado | `<style>` e `<link>` do `<head>` são aplicados no canvas, com escopo, para a página parecer o livro |
| Inspector | Categorias Tailwind | Seção **Position** (X, Y, W, H, z-order, travar) além do que já existe para `style` inline |

Nada muda no contrato de entrada e saída: a saída continua sendo o mesmo HTML, com `style` atualizado e nós movidos. As garantias de fidelidade do `PLAN.md` §0 valem integralmente.

---

## 1. Decisões de arquitetura

| Tema | Decisão | Por quê |
|---|---|---|
| Ativação | Prop `layout="flow" \| "fixed" \| "auto"` no `<HtmlEditor>`, padrão `auto` | Detecção cobre a maioria; a prop explícita cobre fixtures fora do padrão. |
| Detecção `auto` | Documento completo **e** `<meta name="viewport" content="width=…, height=…">` no `<head>` (regra do EPUB FXL). Fallback: raiz com ≥ 80% dos filhos elemento com `position: absolute` computado após o primeiro layout | A meta é a fonte canônica do tamanho da página; o fallback pega HTML exportado de PDF sem meta. |
| Tamanho da página | Da meta viewport; sem meta, do bounding box do container da página; sem nada, 1200 × 1600 e aviso | Sempre existe um tamanho estável para o zoom e para as coordenadas. |
| Container da página | Função `pageContainerOf(doc)`: se a raiz tem exatamente um filho elemento, é ele; senão, a raiz. Substituível via prop `fixedLayout.pageContainer` | FXL costuma ter um `<div class="page">` único; quando não tem, o `<body>` é o plano. |
| Coordenadas | Tudo em **unidades da página** (px do documento), nunca em px de tela. Conversão: `(clientX − pageRect.left) / scale`, `scale` medido por `pageRect.width / page.width` a cada frame | Zoom, scroll e auto-scroll ficam corretos por construção; leitura de rect é uma por frame. |
| Onde a posição é gravada | Sempre `left`/`top` em `px` inteiros (opção `fixedLayout.precision: 1 \| 0.5 \| 0.1`) no atributo `style`, preservando as demais declarações e a ordem (`parseInlineStyle`/`formatInlineStyle` já existentes) | Inline vence classes do `<head>`; a saída fica legível e estável. |
| Elementos posicionados por `right`/`bottom`, `%` ou `transform: translate` | No primeiro movimento, o valor é **congelado** em `left`/`top` px a partir do rect medido; `right`/`bottom` são removidos; `translate` é mantido e o delta é aplicado a `left`/`top` | Um só modelo de escrita; o elemento não pula porque o rect medido já inclui tudo. |
| Reparent ao soltar | `moveNode(id, { parentId: pageContainer, index })` + `setAttr(style)` na **mesma entrada de histórico** (nova ação `placeNode`) | Undo desfaz movimento e posição juntos. |
| Índice ao reparentar | Por padrão, no fim (fica por cima). Opção `fixedLayout.keepStacking: true` insere logo após o ancestral de nível superior de origem | Fim é o que o usuário espera ao "puxar" algo; a opção preserva a pintura original. |
| Herança ao reparentar | Antes de mover, comparar `font-family`, `font-size`, `line-height`, `color`, `text-align`, `letter-spacing` computados no pai antigo e no container; o que diverge vira declaração inline (**freeze de herança**) | Sair de um pai estilizado não pode mudar a aparência do texto. |
| Ghost | Estratégia registrada no `CanvasContext` por **parts explícitas** `Canvas.ImageGhost` e `Canvas.LiveGhost` (padrão `LiveGhost`); sem prop booleana | `architecture-avoid-boolean-props`, `patterns-explicit-variants`. |
| Estado transiente do drag | `fixedDragStore` imperativo (posição do ghost, guias ativas), escrita direta de `transform` como o `DropIndicator` faz hoje | Zero re-render por frame (`rerender-use-ref-transient-values`). |
| Carregamento | Todo o módulo `src/lib/fixed/**` entra por `React.lazy`/`import()` quando o modo é `fixed` | `bundle-conditional`, `bundle-dynamic-imports`: quem só usa fluxo não paga. |
| DnD | Continua `@atlaskit/pragmatic-drag-and-drop` (element adapter) para uniformidade com árvore e paleta. Movimento em página usa `onDrag` do `draggable` + um único `dropTargetForElements` no container da página | Um sistema de eventos só; `pickDropTarget` e hitboxes ficam desligados no modo fixo. |
| Plano B para o movimento | Se o spike (§6) mostrar cadência insuficiente do `dragover` nativo, o movimento **dentro** da página passa a pointer events (`pointerdown/move/up` + `setPointerCapture`), mantendo pdnd para paleta → página e árvore → página | Precisão manda; a decisão é tomada com medição, não com opinião. |

---

## 2. Estrutura de pastas

```
src/lib/fixed/
  detect.ts            # detectLayout(doc) → 'fixed' | 'flow'; readViewportMeta(head) → { width, height } | null
  geometry.ts          # toPage(client, pageRect, scale), snap(), roundTo(precision), rectsToGuides()
  position.ts          # readPosition(el), freezePosition(node, rect), writePosition(node, x, y) → StyleWrite[]
  inheritance.ts       # freezeInheritance(el, newParentEl) → declarações a copiar
  pageContainer.ts     # pageContainerOf(doc, override?)
  fixedDragStore.ts    # ghost transform, guias, elemento em drag (imperativo, sem React)
  useFixedDraggable.ts # draggable() por elemento posicionado; onDrag → fixedDragStore
  useFixedPageDropTarget.ts
  useFixedDropMonitor.ts
  ghost/
    ImageGhost.tsx     # registra estratégia 'image' (setCustomNativeDragPreview)
    LiveGhost.tsx      # registra estratégia 'live' (disableNativeDragPreview + camada viva)
    GhostLayer.tsx     # camada absoluta sobre a página onde o LiveGhost desenha
    snapshot.ts        # cloneForPreview(el, scale) usado pelo ImageGhost
  guides/
    Guides.tsx         # overlay de guias inteligentes (SVG), lê do fixedDragStore
    computeGuides.ts   # bordas e centros dos irmãos, threshold em unidades de página
  stylesheet/
    documentCss.ts     # extrai <style> e <link> do envelope.head
    useDocumentStylesheet.ts  # injeta com escopo (reusa scopeCss), resolve URLs via resolveAsset
  FixedPage.tsx        # part Canvas.FixedPage (página com tamanho fixo + zoom + GhostLayer + Guides)
  Zoom.tsx             # part Canvas.Zoom (fit, 50, 100, 200)
  InspectorPosition.tsx# part Inspector.Position
  __tests__/
```

Módulos puros (`detect`, `geometry`, `position`, `inheritance`, `pageContainer`, `computeGuides`, `documentCss`) sem React e sem DOM além de `DOMRect`, testáveis em jsdom.

---

## 3. Design detalhado

### 3.1 Contexto e composição

`EditorContextValue` ganha `layout: 'flow' | 'fixed'` (já resolvido, nunca `auto`) e `fixedLayout: { page: { width; height }, pageContainerId, precision, keepStacking, resolveAsset }`.

`CanvasContextValue` passa ao formato `state / actions / meta` (`state-context-interface`), mantendo os campos atuais por compatibilidade:

```ts
type CanvasState = { width; presetId; isDark; stylesReady; zoom: number; scale: number }
type CanvasActions = { setPreset; setIsDark; setZoom; registerGhost(strategy: GhostStrategy): () => void }
type CanvasMeta = { pageRef: RefObject<HTMLElement | null>; registerGhostLayer(el: HTMLElement | null): void }
```

Parts novas, todas opcionais e sem props booleanas:

```tsx
<HtmlEditor layout="auto" fixedLayout={{ resolveAsset: (url) => cdn(url) }}>
  <HtmlEditor.Canvas>
    <HtmlEditor.Canvas.Toolbar>
      <HtmlEditor.History />
      <HtmlEditor.Canvas.Zoom />
    </HtmlEditor.Canvas.Toolbar>
    <HtmlEditor.Canvas.FixedPage>
      <HtmlEditor.Canvas.Guides />
      <HtmlEditor.Canvas.LiveGhost />      {/* ou <HtmlEditor.Canvas.ImageGhost /> */}
    </HtmlEditor.Canvas.FixedPage>
  </HtmlEditor.Canvas>
  <HtmlEditor.Inspector>
    <HtmlEditor.Inspector.Position />
    <HtmlEditor.Inspector.Attributes />
  </HtmlEditor.Inspector>
</HtmlEditor>
```

`Canvas.Viewport` (fluxo) e `Canvas.FixedPage` (fixo) são variantes explícitas. O `DefaultLayout` escolhe pela `layout` resolvida. `Canvas.WidthPresets` renderiza nada em modo fixo; `Canvas.Zoom` renderiza nada em modo fluxo.

### 3.2 Página e zoom

`FixedPage` renderiza:

```
.scroll (overflow: auto, auto-scroll do pdnd)
  .stage (padding, centraliza)
    .page  (width/height da página em px, transform: scale(zoom), transform-origin: 0 0)
      .adt-canvas  (raiz editável, position: relative, overflow: hidden)
        <CanvasNode …/>
      GhostLayer   (position: absolute; inset: 0; pointer-events: none)
    Guides (SVG absoluto sobre a stage, coordenadas de tela)
```

`scale` real é medido (`pageRect.width / page.width`) e não assumido igual ao `zoom`, para tolerar `devicePixelRatio` fracionário e wrappers com `transform` do próprio livro. Zoom "fit" recalcula em `ResizeObserver` do `.scroll`.

O `SelectionOverlay` já usa `getBoundingClientRect`; funciona sem mudança. Os handles de redimensionar ficam fora do escopo desta versão (§7).

### 3.3 CSS do documento

`documentCss.ts` extrai do `envelope.head` cada `<style>` e cada `<link rel="stylesheet" href>`. `useDocumentStylesheet` injeta uma `<style data-adt-document>` no `document.head`:

- Escopo com `@scope (.adt-canvas)` e fallback por prefixo, reusando `scopeCss`. Seletores `html`, `body`, `:root` são reescritos para `.adt-canvas`.
- `@font-face` fica **fora** do escopo (regra global) com URLs reescritas por `resolveAsset`.
- `<link>` é buscado com `fetch` só se `resolveAsset` devolver URL; sem resolvedor, é ignorado com aviso no console em dev.
- `url(...)` relativos em `background`, `src` de `<img>` e `<link>` passam por `resolveAsset`. Sem resolvedor, ficam como estão.
- Sanitização igual à dos nós opacos (remove `expression()`, `javascript:` e `@import` para origens não resolvidas).

Isso também melhora o modo de fluxo em documentos completos; fica atrás de `layout="fixed"` nesta fase e vira opção geral depois.

### 3.4 Posição: leitura, congelamento e escrita

- **Leitura** para o inspector e para o início do drag: `readPosition(el, pageEl, scale)` devolve `{ x, y, w, h }` em unidades de página a partir dos rects. Nunca faz parse de CSS para saber onde o elemento está.
- **Congelamento** (`freezePosition`): se o `style` inline não tem `left`/`top` em px, ou tem `right`/`bottom`, ou há `%`, o primeiro `placeNode` grava `position: absolute; left: Xpx; top: Ypx`, remove `right`/`bottom`, mantém `width`/`height` se existiam e mantém `transform`. Elementos `position: fixed` são tratados como `absolute`.
- **Escrita** (`writePosition`): `inlineCssAdapter.write` para `left` e `top` com `roundTo(precision)`. Uma escrita de `style` só, coalescida por `attr:${id}:style` (já existe).
- Ordem de operações do `placeNode(id, { x, y, parentId, index })` no store: freeze de herança → freeze de posição → `setAttr(style)` → `moveNode` se o pai muda, tudo dentro de um único `commit` (nova opção `batch` no `commit`, ou uma ação que compõe as duas mutações no mesmo `draftNodes`).

### 3.5 Drag dentro da página (pixel perfect)

`useFixedDraggable(el, id)` registra `draggable()` em cada filho elemento do container da página **e** em elementos aninhados (para permitir puxar algo de dentro de um grupo para o nível da página):

```ts
draggable({
  element,
  getInitialData: () => nodeDrag({ nodeId, surface: 'canvas', label }),
  onGenerateDragPreview: (args) => ghost.strategy.generatePreview(args, { element, scale }),
  onDragStart: ({ location }) => {
    fixedDragStore.begin({
      id: nodeId,
      grab: toPage(location.initial.input, pageRect(), scale()) - readPosition(element).xy,
      origin: readPosition(element),
      siblings: cacheSiblingRects(),        // js-cache-function-results: uma leitura por drag
    })
    ghost.strategy.start(element)
    if (ghost.strategy.hidesNativePreview) preventUnhandled.start()
  },
  onDrag: ({ location }) => {
    const pointer = toPage(location.current.input, pageRect(), scale())
    const raw = pointer - grab
    const { position, guides } = snapWithGuides(raw, size, siblings, threshold / scale)
    fixedDragStore.update(position, guides)   // ghost.transform e Guides leem daqui, sem React
  },
  onDrop: ({ location }) => {
    const cancelled = location.current.dropTargets.length === 0
    ghost.strategy.end()
    preventUnhandled.stop()
    if (!cancelled) actions.placeNode(nodeId, { ...fixedDragStore.position, parentId: pageContainerId, index })
    fixedDragStore.end()
  },
})
```

Regras para não haver glitch:

- O elemento original **nunca** é movido, escondido nem desmontado durante o drag (Chrome cancela o drag nativo se a fonte sai do DOM). Ele recebe `data-dragging` e uma opacidade reduzida via CSS; a posição final só é aplicada no `onDrop`.
- O ghost e as guias mudam só por `transform`, com `will-change: transform` e `pointer-events: none`. Nenhum layout é invalidado por frame.
- `pageRect` é lido uma vez por frame (um `getBoundingClientRect`), o resto vem do cache de rects dos irmãos feito no `onDragStart`; o cache é invalidado por scroll e zoom.
- `user-select: none` na página durante o drag; `<img>` e `<a>` aninhados recebem `draggable="false"` na renderização do canvas em modo fixo, para o drag nativo da imagem não roubar o gesto.
- `getDropEffect: () => 'move'` no container da página, para o cursor não piscar entre copy/move.
- Ponteiro saindo da janela: o pdnd para de emitir `onDrag`; o ghost congela na última posição e o `onDrop` posterior decide (drop fora da página = cancelamento, sem efeito).
- Teclado: setas movem 1 px, Shift+setas 10 px, tudo por `placeNode` com coalescência de 500 ms para virar uma entrada de histórico. É o caminho pixel-perfect quando o mouse não basta.
- Snap: grade de 1 px por padrão (`precision`); guias inteligentes em bordas e centros dos irmãos e da página, threshold de 4 px de tela convertido para unidades de página. Alt desliga o snap durante o drag (lido de `location.current.input.altKey`).

### 3.6 Reparent para o container da página

Quando o elemento arrastado está aninhado (ex.: `div.group > p`), ao soltar ele vai para `pageContainerId`:

1. `freezeInheritance(el, pageEl)` compara estilos computados no pai atual e no container; diferenças entram no `style`.
2. Posição final calculada em unidades de página já é relativa ao container, porque `readPosition` mede contra a página; não há conversão adicional.
3. Índice: fim do container, ou logo após o ancestral de nível superior se `keepStacking`.
4. Se o pai antigo ficar vazio e for um wrapper sem estilo próprio (sem `style`, sem `class`, sem `id`), ele **não** é removido automaticamente; fica visível na árvore como vazio. Remoção automática seria uma perda silenciosa.

Drops vindos da paleta e da árvore no modo fixo usam o mesmo `placeNode`: paleta insere em `pointer − metade do tamanho padrão do template`; árvore sobre a página reparenta e posiciona no ponteiro. A árvore continua aceitando reordenação entre irmãos como controle de z-order, e o `pickDropTarget` do modo fluxo não roda quando `layout === 'fixed'`.

### 3.7 Ghost — versão A: imagem (preview nativo)

`ImageGhost` registra `{ id: 'image', hidesNativePreview: false, generatePreview, start, end }`:

- `generatePreview` usa `setCustomNativeDragPreview` com `render({ container })`: `cloneForPreview(element, scale)` faz `cloneNode(true)`, copia `width`/`height` computados, aplica `transform: scale(scale)` e `transform-origin: 0 0`, remove `data-adt-id` e `contenteditable`, marca `<img>` como `draggable=false`. Para um `<img>` puro, o clone é o próprio `<img>` (o browser usa a bitmap decodificada). O container recebe `getOffset: preserveOffsetOnSource({ element, input })`, então o ponteiro segura o ghost exatamente onde pegou.
- Enquanto o preview nativo é uma foto tirada no início, a **posição final** é mostrada por um retângulo fino (`outline`) desenhado pela `GhostLayer` na posição snapada, mais as guias. Assim o usuário vê tanto a "foto" quanto o encaixe exato.
- Vantagens: renderização fora da main thread, zero custo por frame, sem risco de flicker. Limitações documentadas: o SO pode aplicar transparência e sombra; Chrome limita o tamanho do preview (fallback: se o clone escalado passar de 2000 px em um eixo, reduzir a escala do clone e manter o retângulo de destino correto); a foto não reflete zoom alterado durante o drag.

### 3.8 Ghost — versão B: cópia renderizada (ghost vivo)

`LiveGhost` registra `{ id: 'live', hidesNativePreview: true, … }`:

- `generatePreview` chama `disableNativeDragPreview(nativeSetDragImage)`; `onDragStart` chama `preventUnhandled.start()` para suprimir a animação de "voltar" do drag nativo cancelado.
- `start(element)` monta na `GhostLayer` uma cópia do elemento. Duas formas, escolhidas pela estratégia: `cloneNode(true)` (barato, perde estado React, suficiente porque o ghost não é interativo) é o padrão; `createRoot(container).render(<CanvasNode id />)` fica como opção para quando o clone perder algo renderizado por React (ex.: placeholders de nós opacos). A cópia recebe `position: absolute; left: 0; top: 0; width; height; pointer-events: none; will-change: transform`.
- `fixedDragStore.update` escreve `transform: translate3d(x, y, 0)` em unidades de página (a `GhostLayer` está dentro da `.page`, então o `scale` já se aplica). O elemento original fica com `opacity: .35` e `outline` tracejado marcando a origem.
- Vantagens: encaixe e guias exatos ao vivo, nítido em qualquer zoom, sem transparência imposta pelo SO. Custo: um `transform` por frame na main thread; medido no spike (§6) com 300 elementos.
- Cancelamento (Esc ou drop fora da página): a cópia anima de volta à origem em 120 ms com `transition: transform` e é removida; respeita `prefers-reduced-motion`.

Ambas as estratégias implementam a mesma interface `GhostStrategy`; o `useFixedDraggable` só conhece a interface (`state-decouple-implementation`).

### 3.9 Inspector — Position

`Inspector.Position` mostra X, Y, W, H (px inteiros, `font-variant-numeric: tabular-nums`), z-order (índice no container com botões "trazer para frente"/"enviar para trás" que chamam `moveNode`) e "travar posição" (atributo `data-adt-locked` **não**: travar precisa ficar fora da saída, então vai para um `Set<NodeId>` no estado do editor, não no documento). Inputs escrevem no `onBlur`/Enter via `placeNode`, com coalescência.

Leitura de X, Y, W, H vem de um `ResizeObserver`/`MutationObserver` sobre o elemento selecionado (mesmo esquema do `SelectionOverlay`), não do parse do `style`, para refletir o que está renderizado.

---

## 4. Regras de performance (aplicadas em todas as fases)

- Zero re-render de React por frame de drag: ghost, guias e retângulo de destino são atualizados por store imperativo e `style.transform` (`rerender-use-ref-transient-values`, `js-batch-dom-css`).
- Uma leitura de `getBoundingClientRect` da página por frame; rects dos irmãos em cache por drag (`js-cache-function-results`); guias calculadas em um único loop sobre os irmãos (`js-combine-iterations`, saída antecipada quando o snap já casou nos dois eixos).
- `useEffectEvent` para ler `zoom`, `precision` e estratégia de ghost dentro dos callbacks do pdnd sem reregistrar `draggable` (`rerender-dependencies`, `advanced-effect-event-deps`).
- Componentes de overlay (`GhostLayer`, `Guides`) não assinam o store do editor; só o `fixedDragStore` (`rerender-defer-reads`).
- `src/lib/fixed/**` carregado sob demanda; o bundle do modo fluxo não cresce (`bundle-conditional`).
- CSS do documento injetado uma vez por documento, refeito só quando `envelope.head` muda.
- Aceite medido com `npx react-doctor scan <url>` gravando um drag de 5 s em página com 300 elementos posicionados: nenhum frame > 16 ms atribuído ao editor; `npx react-doctor --scope changed` em 100 a cada fase.

---

## 5. Fases

### Fase F0 — Spikes (1 dia)
- [ ] Cadência do `onDrag` do pdnd em Chrome, Firefox e Safari com um `translate3d` por evento; comparar com pointer events. Decide o plano B do §1.
- [ ] `disableNativeDragPreview` + `preventUnhandled` em Safari e Firefox: confirmar que não sobra ghost nativo nem animação de retorno.
- [ ] Limite de tamanho do preview nativo em Chrome com clone escalado a 200%.
- [ ] Fixtures reais: pelo menos dois livros FXL (um com `<style>` no head e posições por classe; outro com `style` inline e `%`) em `src/playground/fixtures/fixed/`.
- **Pronto quando**: as três medições estão anotadas neste arquivo e as decisões do §1 confirmadas ou trocadas.

### Fase F1 — Detecção, página e CSS do documento (2 dias)
- [ ] `detect.ts`, `readViewportMeta`, `pageContainerOf`; prop `layout` e `fixedLayout` no `EditorProvider`; `layout` resolvido no contexto.
- [ ] `FixedPage`, `Zoom` (fit/50/100/200), `scale` medido, `CanvasContext` em `state/actions/meta` mantendo campos antigos.
- [ ] `documentCss.ts` + `useDocumentStylesheet` com escopo, `@font-face` global, `resolveAsset`.
- [ ] `<img>`/`<a>` com `draggable="false"` no canvas em modo fixo.
- [ ] Testes: detecção (com e sem meta), tamanho da página, extração e escopo do CSS (snapshot), `html/body → .adt-canvas`.
- **Pronto quando**: os fixtures FXL abrem no playground visualmente iguais ao browser abrindo o arquivo original, em 100% de zoom, com diferença ≤ 1 px nas posições dos elementos (medido por script que compara rects).

### Fase F2 — Modelo de posição e `placeNode` (1–2 dias)
- [ ] `geometry.ts` (`toPage`, `roundTo`, `snap`), `position.ts` (`readPosition`, `freezePosition`, `writePosition`), `inheritance.ts`.
- [ ] Ação `placeNode` no store: freeze + `style` + `moveNode` em um commit, coalescência `place:${id}`.
- [ ] Setas do teclado no canvas em modo fixo (1 px / 10 px).
- [ ] Testes: freeze de `right/bottom`, `%`, `translate`; herança congelada só quando diverge; um `placeNode` = uma entrada de histórico; round-trip idempotente dos fixtures após várias `placeNode`.
- **Pronto quando**: mover por teclado e por inspector grava `left/top` inteiros corretos e a saída continua passando no round-trip.

### Fase F3 — Drag na página com ghost vivo (2–3 dias)
- [ ] `fixedDragStore`, `useFixedDraggable`, `useFixedPageDropTarget`, `useFixedDropMonitor`; `pickDropTarget` e hitbox desligados em modo fixo.
- [ ] `GhostLayer` + `LiveGhost` (clone), retângulo de origem, cancelamento com animação, `preventUnhandled`.
- [ ] `Guides` + `computeGuides` (bordas e centros, página incluída), Alt desliga snap.
- [ ] Reparent para o container da página com `keepStacking` opcional; drops de paleta e de árvore.
- [ ] Testes: `computeGuides` e `snap` puros; monitor com eventos sintéticos (mesma técnica usada na prioridade ao pai) verificando posição final, reparent e cancelamento.
- **Pronto quando**: arrastar qualquer elemento, inclusive aninhado, e soltar em 100% e 200% de zoom resulta em `left/top` iguais à posição do ghost no frame do drop, sem salto visual, e o elemento fica filho do container da página.

### Fase F4 — Ghost por imagem (1 dia)
- [ ] `ImageGhost` com `cloneForPreview`, `preserveOffsetOnSource`, fallback de tamanho.
- [ ] Retângulo de destino snapado na `GhostLayer` enquanto o preview nativo segue o ponteiro.
- [ ] Toggle no playground para alternar as duas estratégias no mesmo fixture.
- **Pronto quando**: as duas estratégias produzem a mesma posição final para o mesmo gesto (teste sintético) e a versão imagem não desenha nada na main thread por frame além do retângulo.

### Fase F5 — Inspector Position e z-order pela árvore (1–2 dias)
- [ ] `Inspector.Position` (X, Y, W, H, z-order, travar); travados não registram `draggable`.
- [ ] Árvore: rótulo de ordem de empilhamento em modo fixo; reordenar na árvore = z-order.
- [ ] Live region: "movido para X, Y".
- **Pronto quando**: editar X no inspector, arrastar e usar setas convergem para o mesmo `style`; `react-doctor design` sem erros nos componentes novos.

### Fase F6 — Endurecimento (1 dia)
- [ ] `react-doctor scan` com 300 elementos; corrigir hot paths.
- [ ] Auditoria de acessibilidade das parts novas (foco, `aria-pressed` no zoom, contraste das guias).
- [ ] README: seção "Fixed layout mode" com as parts, a prop `layout`, `resolveAsset` e as limitações.
- **Pronto quando**: `bun run test`, `lint`, `typecheck` e `react-doctor --scope changed` em 100; README atualizado.

---

## 6. Riscos e spikes

| Risco | Impacto | Mitigação / spike |
|---|---|---|
| `dragover` nativo com cadência baixa ou irregular em algum browser | F3 | Spike F0; plano B com pointer events só para o movimento dentro da página. |
| CSS do `<head>` com seletores que o `scopeCss` não cobre (`html[lang]`, `:root` com variáveis, `@page`, `@import`) | F1 | Snapshots por fixture; lista explícita de reescritas; `@page` descartado; `@import` só com `resolveAsset`. |
| Fontes e imagens relativas sem base URL | F1 | `resolveAsset` obrigatório para fidelidade; sem ele, aviso em dev e placeholders com o tamanho declarado (`width`/`height` do `<img>`) para o layout não desmontar. |
| Elementos com `transform: rotate/scale` próprios | F2–F3 | `left/top` recebem o delta; o rect medido é só para o ghost e para as guias, que usam o bounding box. Documentar que o snap é no bounding box. |
| Wrapper do livro com `transform: scale()` responsivo dentro do body | F1–F3 | `scale` medido, não assumido; `toPage` usa o rect do container da página, não da `.page`. |
| Herança perdida ao reparentar | F3 | Freeze de herança (§3.4) com lista fechada de propriedades; teste com fixture de texto dentro de grupo estilizado. |
| Chrome cancela o drag se a fonte sai do DOM | F3 | Fonte nunca desmonta; `CanvasNode` mantém a chave estável; `placeNode` só no `onDrop`. |
| Preview nativo grande demais ou transparente no SO | F4 | Fallback de escala do clone; retângulo de destino sempre desenhado pela `GhostLayer`; documentar. |
| Drop fora da janela ou em outra aplicação | F3 | `dropTargets.length === 0` no `onDrop` = cancelamento; `preventUnhandled` só ativo com `LiveGhost`. |
| Muitos elementos (páginas de revista com 500+ nós) | F3 | Cache de rects por drag; guias só com irmãos visíveis no viewport; medir com `react-doctor scan`. |
| Detecção `auto` errando em HTML exportado de PDF sem meta | F1 | Fallback por `position: absolute` computado após o primeiro layout; prop `layout="fixed"` sempre disponível. |
| Touch | Geral | Igual ao `PLAN.md`: desktop-first; pointer events do plano B já abriria caminho para touch depois. |

---

## 7. Fora de escopo (desta versão)

Redimensionar e girar por handles, seleção múltipla, alinhamento/distribuição em lote, edição de `<head>`, páginas duplas (spread) lado a lado, suporte a touch, exportação de PDF.
