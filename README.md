# adt-html-editor

Biblioteca React de edição visual de HTML: árvore de elementos, canvas e painel de estilos Tailwind. Recebe uma string HTML, o usuário edita, e devolve uma string HTML.

Consumida por `file:` / `bun link` — não é publicada no npm.

## Instalação

```bash
bun add file:../adt-html-editor
```

`react` e `react-dom` (>= 19) são peer dependencies.

```tsx
import { HtmlEditor } from 'adt-html-editor'
import 'adt-html-editor/style.css'
```

## Uso

### Layout pronto (3 painéis)

```tsx
<HtmlEditor.DefaultLayout defaultValue={html} onChange={(next) => setHtml(next)} />
```

### Escolhendo os painéis

Cada painel é independente. Use só o que você quer, no arranjo que quiser:

```tsx
<HtmlEditor defaultValue={html} onChange={(next) => setHtml(next)}>
  <HtmlEditor.Layout>
    <HtmlEditor.Palette />
    <HtmlEditor.Layers />
    <HtmlEditor.Canvas />
    <HtmlEditor.Inspector />
  </HtmlEditor.Layout>
</HtmlEditor>
```

Só o `<HtmlEditor>` é obrigatório — ele cria a store da instância. `<HtmlEditor><HtmlEditor.Inspector /></HtmlEditor>` sozinho funciona, e `HtmlEditor.Layout` é opcional (use seu próprio grid).

### Customizando o interior de cada painel

Cada painel é um `Root` que aceita `children`. **Sem children ele renderiza a composição padrão; com children, você controla tudo** — quais partes existem, em que ordem, e com quais rótulos.

```tsx
<HtmlEditor defaultValue={html} onChange={setHtml}>
  <MeuLayout>
    <HtmlEditor.Layers>
      <HtmlEditor.Layers.Header>
        <HtmlEditor.Layers.Title>Estrutura</HtmlEditor.Layers.Title>
        <HtmlEditor.Layers.Count />
      </HtmlEditor.Layers.Header>
      <HtmlEditor.Layers.Tree />
    </HtmlEditor.Layers>

    <HtmlEditor.Canvas>
      <HtmlEditor.Canvas.Viewport />
      <HtmlEditor.Canvas.Toolbar>
        <HtmlEditor.Canvas.DarkToggle>Tema escuro</HtmlEditor.Canvas.DarkToggle>
        <HtmlEditor.Canvas.WidthPresets
          presets={[
            { id: 'narrow', label: '360', width: 360 },
            { id: 'fluid', label: 'Fluido', width: 0 },
          ]}
        />
      </HtmlEditor.Canvas.Toolbar>
    </HtmlEditor.Canvas>

    <HtmlEditor.Inspector>
      <HtmlEditor.Inspector.Header />
      <HtmlEditor.Inspector.Empty>Nada selecionado.</HtmlEditor.Inspector.Empty>
      <HtmlEditor.Inspector.Variants />
      <HtmlEditor.Inspector.Body>
        <HtmlEditor.Inspector.Section title="Atalhos">
          <HtmlEditor.Inspector.Control id="display" />
          <HtmlEditor.Inspector.Control id="gap" />
        </HtmlEditor.Inspector.Section>
        <HtmlEditor.Inspector.Category id="typography" />
      </HtmlEditor.Inspector.Body>
    </HtmlEditor.Inspector>
  </MeuLayout>
</HtmlEditor>
```

O `src/playground/CustomLayout.tsx` é um exemplo completo — o playground alterna entre ele e o layout padrão.

### Partes disponíveis

| Painel | Partes |
|---|---|
| `HtmlEditor.Layers` | `Header`, `Title`, `Count`, `Tree`, `Row`, `Empty` |
| `HtmlEditor.Canvas` | `Toolbar`, `WidthPresets`, `DarkToggle`, `Viewport` |
| `HtmlEditor.Inspector` | `Header`, `Empty`, `Variants`, `Body`, `Section`, `Category`, `Control`, `ClassInput`, `ClassList`, `Attributes` |
| `HtmlEditor.Palette` | `Header`, `Grid`, `Item` |

`Category` e `Control` recebem um `id` das `CATEGORIES` exportadas — categorias: `layout`, `flex`, `spacing`, `sizing`, `typography`, `color`, `border`, `effects`; controles: `display`, `gap`, `p`, `text-size`, etc.

Para trocar a aparência das linhas da árvore sem perder o drag and drop, passe `renderRow` para `Tree` e monte sua linha em volta de `HtmlEditor.Layers.Row`.

Cada parte também é exportada solta (`LayersTree`, `InspectorCategory`, `CanvasViewport`…), e os contextos ficam acessíveis por `useLayersContext()`, `useInspectorContext()` e `useCanvasContext()` se você precisar escrever partes próprias.

## Contrato de entrada e saída

```tsx
const editor = useRef<HtmlEditorHandle>(null)

<HtmlEditor
  defaultValue={html}            // não controlado
  value={html}                   // ou controlado: reparse quando muda por fora
  onChange={(html, doc) => {}}
  changeDebounceMs={0}
  handleRef={editor}             // editor.current.getHtml() / setHtml() / getDocument()
/>
```

- `onChange` dispara a cada ação confirmada (drop, classe aplicada, atributo, texto ao sair do `contentEditable`, undo/redo). Nunca por frame de drag nem por tecla digitada.
- `getHtml()` pode ser chamado a qualquer momento (ex.: botão "Concluir" do workflow).
- `value` mudando por fora substitui o documento inteiro e limpa histórico e seleção.

### Formatos aceitos

| Entrada | Como é tratada | Saída |
|---|---|---|
| Fragmento (`<section>…</section><p>…</p>`) | Filhos diretos viram filhos do nó raiz virtual | Fragmento |
| Documento completo | Edita só o conteúdo de `<body>`; `<!doctype>`, attrs de `<html>`, `<head>` inteiro e attrs de `<body>` são guardados como texto opaco | Documento completo, com `<head>` idêntico ao original |

A detecção é pela presença de `<html`, `<head` ou `<body` na entrada.

### Garantias de fidelidade

- **Equivalência de DOM, não de bytes.** `serialize(parse(html))` produz um HTML cujo DOM é igual ao da entrada; a indentação original entre blocos não é preservada. O round-trip é idempotente: `serialize(parse(serialize(parse(x)))) === serialize(parse(x))`.
- Preservados: todos os atributos na ordem original, ordem das classes, tags desconhecidas e custom elements, comentários HTML, entidades.
- `<script>`, `<style>`, `<svg>`, `<math>`, `<iframe>`, `<template>`, `<noscript>` são **nós opacos**: aparecem na árvore, podem ser movidos e removidos, não aceitam filhos, e o conteúdo interno é reemitido **byte a byte**.
- Nós de texto só com whitespace entre elementos de bloco são descartados no parse. Whitespace adjacente a elementos inline é mantido. `<pre>` e `<textarea>` preservam whitespace integral.
- Nada do editor vaza para a saída: `data-adt-id`, overlays e indicadores existem só no DOM renderizado.

No canvas, o conteúdo de nós opacos passa por um sanitizador (remove `on*`, `<script>`, urls `javascript:`) **apenas para a pré-visualização** — o modelo e a saída continuam byte a byte.

## API headless

```ts
import { parseHtml, serializeHtml, createEditorStore } from 'adt-html-editor'

const doc = parseHtml(html)      // puro, usável fora do React
const out = serializeHtml(doc)
```

Também exportados: `useEditor()`, `useNode()`, `useChildren()`, `useDocument()`, `useEditorSelector()` e os tipos do modelo.

## Zonas de drop no canvas

Cada elemento do canvas tem duas zonas:

- **Faixa de borda** (16 px, ou 30% do tamanho em elementos pequenos) — insere como irmão antes/depois. O eixo segue o layout do pai: `left`/`right` em flex-row, `top`/`bottom` no resto.
- **Centro** — insere *dentro*, quando o elemento aceita aninhamento: pode ter filhos e está vazio ou já tem ao menos um filho elemento. Um `<p>Texto</p>` ou `<h1>` só com texto **não** aceita, então a faixa de borda cobre o elemento inteiro.

Dentro de um container, a posição exata vem da comparação do ponteiro com o meio de cada filho — soltar no vão entre dois filhos insere entre eles.

O indicador é desenhado por um único monitor, sempre a partir do alvo mais interno (`dropTargets[0]`), então ele mostra exatamente onde o elemento vai cair.

## Atalhos

| Tecla | Ação |
|---|---|
| `↑` / `↓` | Navega na árvore |
| `←` / `→` | Recolhe/expande, ou sobe/desce um nível |
| `Alt+↑` / `Alt+↓` | Reordena entre irmãos |
| `Alt+←` | Move para fora (reparent) |
| `Alt+→` | Move para dentro do irmão anterior |
| `Del` / `Backspace` | Remove |
| `Ctrl/Cmd+D` | Duplica |
| `Ctrl/Cmd+C` / `X` / `V` | Copia / recorta / cola (clipboard interno) |
| `Ctrl/Cmd+Z` / `Shift+Z` / `Ctrl+Y` | Undo / redo |
| `Enter` (no canvas) | Edita texto inline |
| `Esc` | Cancela edição / limpa seleção |

## Tailwind no canvas

O CSS é compilado em runtime pelo `tailwindcss` v4 rodando em um **Web Worker** (carregado sob demanda quando o primeiro `<Canvas>` monta). Só as classes presentes no documento são compiladas.

O CSS gerado é isolado em `@scope (.adt-canvas)` — com fallback de prefixação de seletores em browsers sem `@scope`. As media queries de breakpoint são reescritas para container queries:

```
@media (width >= 48rem)  →  @container adt-canvas (width >= 48rem)
```

Ou seja, `sm:` / `md:` / `lg:` respondem à **largura do canvas**, não à da janela do editor. Media queries de recurso (`hover`, `prefers-color-scheme`, …) não são reescritas.

Conflitos entre classes são resolvidos com `tailwind-merge`. O modo escuro do canvas usa a variante `dark:` ligada à classe `.adt-dark`.

## Desenvolvimento

```bash
bun run dev          # playground em http://localhost:5173
bun run test         # vitest
bun run typecheck    # tsc -b
bun run lint         # oxlint
bun run build        # dist/index.js + dist/style.css + dist/index.d.ts
```

O playground (`src/playground`) simula o workflow: textarea de entrada → editor → textarea de saída atualizada por `onChange`, com botão de validação de round-trip. Fixtures em `src/playground/fixtures`.

## Limitações conhecidas (v1)

- Drag and drop usa a API nativa do HTML5: **desktop-first**, sem suporte a touch.
- O canvas renderiza no mesmo documento (sem iframe). Um `<style>` dentro do HTML editado pode afetar a UI do editor — por isso `<style>` é renderizado como placeholder inerte no canvas.
- `DOMParser` normaliza HTML inválido (fecha `<p>` implícito, insere `<tbody>`). A saída é HTML válido equivalente, não o original não normalizado.
- Sem edição de `<head>`, sem colaboração em tempo real, sem símbolos/componentes reutilizáveis.
- Modo CSS puro (`styleMode="inline-css"`) tem só o adaptador (`StyleAdapter`), sem controles dedicados.
