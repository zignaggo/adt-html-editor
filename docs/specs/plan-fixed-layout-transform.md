# Plano — Redimensionar e rotacionar no fixed layout mode

Extensão do fixed layout mode (`PLAN-fixed-layout.md`): alças de redimensionamento nas bordas e cantos do elemento selecionado, alça de rotação, campos numéricos no inspector e atalhos de teclado. Tudo gravado no atributo `style` (`width`, `height`, `transform: rotate()`), preservando o restante das declarações.

Prioridades, nesta ordem: **1) gesto preciso e sem glitch, 2) fidelidade do que já está no livro (transform, origem, tamanhos), 3) tudo o resto.**

Padrões aplicados: `pragmatic-dnd-core`/`pragmatic-dnd-react` (o que **não** usar pdnd para e como coexistir), `vercel-composition-patterns` (parts explícitas, estado no provider), `vercel-react-best-practices` (zero re-render por frame, refs para valores transientes, cache de medidas) e `react-doctor` como critério de aceite.

---

## 0. O que existe hoje e o que muda

| Tema | Hoje | Com esta feature |
|---|---|---|
| Seleção no canvas | `SelectionOverlay` desenha a bounding box do elemento | Uma nova part `Canvas.Handles` desenha a **caixa de layout** do elemento com a mesma rotação, e sobre ela as alças |
| Mover | Drag nativo via pdnd, ghost, guias | Inalterado; passa a usar a caixa de layout (não a bounding box) para elementos rotacionados |
| Tamanho | Só pelo inspector (`W`, `H`) | Alças de borda e canto, `Shift` trava proporção, `Alt` redimensiona pelo centro, snap das bordas nas guias |
| Rotação | Inexistente | Alça acima do topo, `Shift` snap de 15°, campo "Angle" no inspector, `[` e `]` no teclado |
| Escrita no modelo | `placeNode({ style })` | Mesma ação; os gestos escrevem **uma vez**, no `pointerup` |
| Ghost do drag | Clone sem `transform` | Clone mantém `rotate()`/`scale()` do original |

Contrato de entrada e saída intacto: só `style` muda. As garantias de fidelidade dos planos anteriores continuam valendo.

---

## 1. Decisões de arquitetura

| Tema | Decisão | Por quê |
|---|---|---|
| Mecanismo dos gestos | **Pointer events** (`pointerdown` na alça, `setPointerCapture`, `pointermove`, `pointerup`/`pointercancel`), não pdnd | Redimensionar e rotacionar são gestos contínuos sobre um único elemento, sem alvo de drop. O drag nativo é throttled, perde eventos fora da janela e não entrega ângulo. O skill pdnd cita "resizing" como uso do element adapter, mas aqui a precisão manda. Pointer events dão touch de graça. |
| Coexistência com pdnd | As alças ficam numa camada acima do elemento; `pointerdown` na alça chama `preventDefault()` e o drag nativo nunca começa porque o ponteiro não está sobre o `draggable` | Zero mudança no `useFixedDraggable`. Durante um gesto, `fixedDragStore` fica intocado. |
| Pré-visualização | **Imperativa no próprio elemento** (`element.style.width/height/transform`) durante o gesto; commit único com `placeNode` no `pointerup` | Texto precisa refluir para o usuário ver o resultado; um ghost não mostra isso. Um só commit = uma entrada de histórico e zero re-render por frame (`rerender-use-ref-transient-values`). `useDomAttributes` reaplica o `style` do modelo no commit, então o DOM converge. |
| Cancelamento | `Esc` ou `pointercancel` restaura o `style` inline original do elemento a partir do snapshot tirado no `pointerdown` | Sem passar pelo store. |
| Caixa de referência | **Caixa de layout** (`offsetWidth/Height` e posição acumulada por `offsetLeft/Top` até a origem de coordenadas), nunca a bounding box | A bounding box de um elemento rotacionado é maior que o elemento. Toda a geometria de alças, drag e inspector usa a caixa de layout mais a rotação. |
| Onde a rotação mora | `transform` inline. Lista de funções é parseada; `rotate()` é atualizado ou inserido **ao final**; `translate`, `scale`, `skew` e `matrix` existentes são mantidos | Livros FXL usam `transform` para escala responsiva e posicionamento fino. Sobrescrever apagaria isso. |
| Leitura do ângulo | `rotate()` declarado inline quando existe; senão decomposição da matriz computada (`atan2(b, a)`), separando escala | O inline é a fonte de verdade editável; a matriz cobre rotação vinda de classes no `<head>`. |
| Origem da rotação | Respeita `transform-origin` computado. Se não é `50% 50%`, o cálculo de âncora e da alça usa a origem real | Não introduzir `transform-origin` no `style` a menos que o usuário rotacione um elemento sem origem definida (aí grava `center center` explicitamente para a saída ser determinística). |
| Redimensionar rotacionado | Delta do ponteiro é levado ao espaço local do elemento (rotação de `−θ`), aplicado a `width`/`height`, e `left`/`top` são recalculados para o **ponto âncora** (canto ou borda oposta) ficar parado na página | É o que o usuário espera; sem isso o elemento "anda" ao redimensionar. Matemática pura, testável. |
| Unidades | `px` inteiros por padrão (`fixedLayout.precision`); ângulo com 0,1° | Coerente com posição. |
| Elementos `display: inline` | Ao redimensionar, grava `display: inline-block` junto | `width`/`height` não têm efeito em inline. Documentado. |
| `<img>` | Escreve `width`/`height` em CSS; atributos `width`/`height` do HTML permanecem | CSS vence os atributos; nada é perdido. |
| Altura automática | Toggle "Auto height" no inspector remove `height` do `style` | Caixas de texto reflow por conteúdo continuam possíveis. |
| Estado transiente | Store imperativo `transformGestureStore` (tipo do gesto, alça, ângulo/tamanho corrente) para badge e guias | Igual ao `fixedDragStore`; overlay e badge assinam sem React. |
| Composição | `Canvas.Handles` (root, sem props booleanas) com sub-parts `Canvas.Handles.Resize` e `Canvas.Handles.Rotate`; `Inspector.Transform` com `Angle`, `AspectLock`, `AutoHeight`; sem children renderiza tudo | `architecture-compound-components`, `patterns-explicit-variants`. Quem não quer rotação não renderiza `Handles.Rotate`. |
| Elementos aninhados | Alças operam na caixa de layout relativa ao `offsetParent` e escrevem no `style` do próprio elemento; ancestrais rotacionados/escalados ficam **fora de escopo** (alças desabilitadas com dica) | Composição de matrizes de ancestrais é o caso raro que mais complica; drag já leva o elemento ao nível da página, onde tudo funciona. |
| Carregamento | Dentro do chunk `FixedPage` (lazy) | `bundle-conditional`. |

---

## 2. Estrutura de pastas

```
src/lib/fixed/
  transform/
    layoutBox.ts          # readLayoutBox(el, origin) → { x, y, width, height } sem transform
    transformValue.ts     # parseTransform(str) → funções; withRotation(str, deg); rotationOf(el, style)
    rotation.ts           # angleFromPointer(center, pointer), snapAngle(deg, step), normalizeAngle
    resize.ts             # resizeBox({ box, angle, origin, handle, delta, keepRatio, fromCenter, min }) → box
    handles.ts            # HANDLES: 8 alças + rotate; posição de cada alça na caixa local
    transformGestureStore.ts
    useResizeGesture.ts   # pointer events de uma alça de tamanho
    useRotateGesture.ts   # pointer events da alça de rotação
    gestureCommit.ts      # applyPreview(el, box, angle) e commit(store, id, style)
    Handles.tsx           # Canvas.Handles root + Resize + Rotate (overlay imperativo)
    Handles.module.css
    AngleBadge.tsx        # badge com ângulo/tamanho durante o gesto
    InspectorTransform.tsx
    useTransformKeys.ts   # [ ] rotação; Ctrl/⌘+setas tamanho
  __tests__/
    layoutBox.test.ts transformValue.test.ts rotation.test.ts resize.test.ts handles.test.ts
    Handles.test.tsx  (pointer events em jsdom)
```

Módulos puros (`transformValue`, `rotation`, `resize`, `handles`) sem DOM; `layoutBox` só usa `offset*`.

---

## 3. Design detalhado

### 3.1 Caixa de layout e rotação

`readLayoutBox(element, originElement)` acumula `offsetLeft/offsetTop` pela cadeia de `offsetParent` até `originElement`, soma `clientLeft/clientTop` dos pais, e usa `offsetWidth/offsetHeight`. Não passa por `getBoundingClientRect`, então não sofre com o `transform` do elemento nem com o zoom da página (valores já estão em unidades da página).

`rotationOf(element, style)`: `parseTransform(style.transform)` → se há `rotate(Xdeg|rad|turn)`, converte para graus; senão `getComputedStyle(element).transform` → matriz → `atan2(b, a)`; `scaleOf` idem (`hypot(a, b)`, `hypot(c, d)`) para a alça desenhar a caixa escalada sem tocar na escala.

`withRotation(style, deg)`: reescreve a lista de funções mantendo ordem; `rotate()` atualizado no lugar ou anexado; `deg` normalizado para `(-180, 180]` com uma casa decimal; ângulo `0` remove o `rotate()` (e o `transform` inteiro se ficar vazio).

### 3.2 Overlay de alças (`Canvas.Handles`)

Um único elemento por vez (o selecionado). Renderiza uma `div.frame` dentro da `GhostLayer`-irmã (mesma camada absoluta em unidades da página), posicionada por `left/top/width/height` = caixa de layout e `transform: rotate(θ)` com `transform-origin` igual ao do elemento. Dentro da frame, 8 alças (`nw n ne e se s sw w`) e a alça `rotate` (acima do `n`, ligada por uma haste). Cursor de cada alça gira com θ (tabela de 8 cursores escolhida por `(direção + θ) mod 360`).

Atualização imperativa, como o `SelectionOverlay`: assina o store (seleção), `MutationObserver` (attrs/childList na raiz) e `ResizeObserver`, tudo coalescido em um `requestAnimationFrame`. Nenhum estado React por frame. Esconde-se durante um drag do pdnd (`subscribeFixedDrag`) e durante edição de texto.

Acessibilidade: alças são `button` com `aria-label` ("Resize from top-left", "Rotate"), `tabIndex=-1`; o teclado cobre o mesmo (3.5). Alvo mínimo de 24 px de tela: tamanho em unidades da página é `24 / scale`, recalculado quando o zoom muda.

### 3.3 Gesto de redimensionar

```
pointerdown(alça h):
  snapshot = { style: el.getAttribute('style'), box: readLayoutBox(el), angle, origin, ratio: w/h, display }
  el.setPointerCapture(pointerId); gestureStore.begin({ kind: 'resize', handle: h, id })
pointermove:
  delta = toPage(pointer) − toPage(pointerDown)          // unidades da página
  local = rotate(delta, −angle)                          // espaço do elemento
  box' = resizeBox({ box, angle, origin, handle: h, delta: local, keepRatio: shift, fromCenter: alt, min: 1 })
  box' = snapEdges(box', siblings, page, threshold)      // só quando angle === 0 (bordas alinháveis)
  applyPreview(el, roundTo(box', precision), angle)      // width/height/left/top inline direto no DOM
  gestureStore.update({ size })                          // badge "W × H"
pointerup:
  style = sizeDeclarations(positionDeclarations(snapshot.style, box'.x, box'.y), box'.w, box'.h)
  se display era inline → withDeclarations(style, { display: 'inline-block' })
  store.actions.placeNode(id, { style })                 // uma entrada de histórico
pointercancel / Esc:
  el.setAttribute('style', snapshot.style)
```

`resizeBox` (puro): calcula o novo tamanho a partir do delta local e da alça; recalcula `x, y` para que o ponto âncora — canto/borda oposta à alça, em coordenadas da página, considerando a rotação em torno da origem — permaneça no mesmo lugar. Com `fromCenter`, o centro é a âncora. Com `keepRatio`, o eixo dominante do delta manda e o outro segue a razão do snapshot. Mínimo 1 px; alças de borda só mexem em um eixo.

Rects dos irmãos para snap são lidos uma vez no `pointerdown` (`js-cache-function-results`) e invalidados por scroll/zoom.

### 3.4 Gesto de rotacionar

```
pointerdown(alça rotate):
  center = ponto de origem do transform em coordenadas da página (caixa + transform-origin)
  startAngle = angleFromPointer(center, pointer) − rotationAtual
pointermove:
  deg = angleFromPointer(center, pointer) − startAngle
  deg = shift ? snapAngle(deg, 15) : roundTo(deg, 0.1)
  applyPreview(el, box, deg); gestureStore.update({ angle: deg })   // badge "12.5°"
pointerup:
  placeNode(id, { style: withRotation(snapshot.style, deg) })       // + transform-origin explícito se não havia
```

Snap adicional sem `Shift`: dentro de 1° de múltiplos de 90° gruda (comportamento comum em editores), desligável com `Alt`.

### 3.5 Teclado e inspector

- `Ctrl/⌘ + setas`: largura/altura ±1 px (`Shift` = 10 px), âncora no canto superior esquerdo. Não colide com `Alt+setas` (árvore) nem com as setas simples (posição).
- `[` e `]`: rotação ∓1°; com `Shift`, ∓15°. `Ctrl/⌘+0` fora do zoom já é usado? Não; `Ctrl/⌘+Shift+R` "reset rotation" fica no inspector, não no teclado, para não brigar com o browser.
- Coalescência: repetição da tecla vira uma entrada (`placeNode` com `coalesce: true`).
- `Inspector.Transform`: `Angle` (número, °), `Aspect lock` (afeta alças e campos W/H), `Auto height` (remove `height`), `Reset rotation`. `Inspector.Position` continua com X, Y, W, H; W/H passam a respeitar o aspect lock.

### 3.6 Ajustes no que já existe

- `fixedDrag.ts`: origem do drag e snap usam `readLayoutBox` (não `readBox`); a posição final é `left/top = box + delta`, então elementos rotacionados não pulam. As guias continuam usando a bounding box para alinhar visualmente.
- `snapshot.ts` (`cloneForPreview`): preserva `transform` original, aplicando só o `scale` do zoom por fora (wrapper), para o ghost do drag mostrar a rotação.
- `SelectionOverlay`: em modo fixo, cede lugar ao `Canvas.Handles` (não desenha os dois). Em fluxo, inalterado.
- `InspectorPosition`: W/H com aspect lock; medidas via `readLayoutBox`.
- `HtmlEditor` namespace: `Canvas.Handles`, `Canvas.Handles.Resize`, `Canvas.Handles.Rotate`, `Inspector.Transform`. `DefaultCanvas` em modo fixo inclui `Handles` completo.

---

## 4. Regras de performance

- Zero re-render de React por frame: preview escreve direto em `element.style`; overlay e badge são atualizados por `transform`/`style` a partir dos stores imperativos.
- Um `readLayoutBox` por frame no máximo; rects de irmãos, ângulo inicial, origem e razão de aspecto vêm do snapshot do `pointerdown`.
- Handlers de `pointermove` em `useEffect` com `setPointerCapture`, removidos no `pointerup`; nada global permanente (`client-event-listeners`).
- `useEffectEvent`/ref "latest" para ler `precision`, `snapThreshold` e `scale` dentro dos handlers sem re-registrar (`advanced-use-latest`).
- Escrita de `style` agrupada em uma atribuição por frame (`js-batch-dom-css`).
- Aceite: `npx react-doctor scan` gravando 5 s de redimensionamento de uma caixa de texto com 300 irmãos, sem frame > 16 ms atribuído ao editor; `react-doctor --scope changed` em 100.

---

## 5. Fases

### Fase T0 — Geometria pura e leitura de transform (1 dia)
- [ ] `layoutBox.ts`, `transformValue.ts`, `rotation.ts`, `resize.ts`, `handles.ts`.
- [ ] Testes: parse/reescrita de `transform` com funções mistas e unidades (`deg`, `rad`, `turn`); decomposição de matriz com escala; `resizeBox` em 0°, 45°, 90° e −30° com âncora parada (tolerância 0,01 px), `keepRatio`, `fromCenter`, mínimo; snap de ângulo.
- **Pronto quando**: 100% dos casos de `resizeBox` mantêm o ponto âncora e `withRotation(withRotation(s, a), b) === withRotation(s, b)`.

### Fase T1 — Drag consciente de rotação (0,5 dia)
- [ ] `fixedDrag.ts` usa `readLayoutBox`; ghost preserva `transform`.
- [ ] Fixture `fixed-rotated.html` com elementos rotacionados e escalados por classe e inline.
- **Pronto quando**: arrastar um elemento a 30° não altera `transform` e o `left/top` gravado é `original + delta`.

### Fase T2 — Alças de redimensionar (2 dias)
- [ ] `Handles.tsx` (root + `Resize`), `useResizeGesture`, `gestureCommit`, `transformGestureStore`, `AngleBadge` (mostra W × H).
- [ ] `Shift` proporção, `Alt` centro, snap de bordas em 0°, `display: inline-block` automático, `Esc` cancela.
- [ ] Testes em jsdom com `fireEvent.pointerDown/Move/Up`: uma entrada de histórico por gesto, `style` final, cancelamento restaura.
- **Pronto quando**: redimensionar por qualquer alça em 100% e 200% de zoom grava `width/height/left/top` iguais aos exibidos no badge, e o canto oposto não se move (teste com rects antes/depois).

### Fase T3 — Rotação (1 dia)
- [ ] `Handles.Rotate`, `useRotateGesture`, cursor das alças girando, snap de 15° e de 90°, `transform-origin` explícito quando necessário.
- [ ] Testes: ângulo a partir do ponteiro em quadrantes; commit único; livro com `transform: scale()` mantém a escala.
- **Pronto quando**: rotacionar e depois redimensionar mantém a âncora parada e o `transform` original (fora o `rotate`) intacto na saída.

### Fase T4 — Inspector e teclado (1 dia)
- [ ] `Inspector.Transform`, aspect lock compartilhado com `Inspector.Position`, `Auto height`, `Reset rotation`.
- [ ] `useTransformKeys` (`Ctrl/⌘+setas`, `[`/`]`) com coalescência; live region ("Resized to 200 × 80", "Rotated to 15°").
- **Pronto quando**: inspector, teclado e alças convergem para o mesmo `style`; `react-doctor design` sem erros nas parts novas.

### Fase T5 — Endurecimento (0,5 dia)
- [ ] `react-doctor scan` (300 irmãos), a11y (labels, foco, alvos ≥ 24 px), README: seção "Resize and rotate" e limitações.
- **Pronto quando**: `test`, `lint`, `typecheck`, hook do react-doctor limpos; README atualizado.

---

## 6. Riscos e spikes

| Risco | Impacto | Mitigação / spike |
|---|---|---|
| `transform-origin` não central ou em `px` | T2–T3 | Ler o valor computado e converter para coordenadas da caixa; testes com `0 0` e `100% 50%`. |
| Ancestral rotacionado ou escalado | T2 | Fora de escopo: alças desabilitadas com dica "move o elemento para a página para editar"; drag para a página resolve. |
| Livro com `transform: matrix(...)` inline | T0 | Decompor a matriz para rotação e escala, reescrever como `matrix(...)` mantendo os demais componentes; snapshot em teste. |
| Texto refluindo muda a altura ao mexer só na largura | T2 | Alças laterais gravam só `width`; `height` só é gravado por alças verticais ou de canto. |
| `%` ou `em` em `width/height` existentes | T2 | Primeiro gesto congela para `px` a partir da caixa de layout (mesma regra da posição). |
| Pointer capture perdido (janela perde foco) | T2–T3 | `pointercancel` e `blur` da janela cancelam o gesto restaurando o snapshot. |
| Conflito com o drag nativo ao iniciar o gesto na alça | T2 | Alça em camada própria com `pointer-events: auto`, `draggable=false`, `preventDefault()` no `pointerdown`; teste manual em Chrome, Firefox e Safari. |
| Cursor das alças errado em ângulos intermediários | T3 | Tabela de 8 cursores por setor de 45°; teste unitário do mapeamento. |
| Precisão de 1 px após rotação (arredondamento de `left/top` recalculados) | T2 | Arredondar só no commit, nunca no meio do gesto; a âncora é recalculada a partir do snapshot, não do frame anterior. |
| Touch | Geral | Pointer events já funcionam com um dedo; multitouch (pinça) fora de escopo. |

---

## 7. Fora de escopo

Seleção múltipla, alinhamento e distribuição em lote, skew, edição de `transform-origin` pela UI, rotação 3D, redimensionar por pinça, alças em elementos dentro de ancestrais transformados.
