# Guia de Estilo - Classic System UI

## Descrição
Interface no estilo **Windows 95 / Classic Desktop Application** - visual de sistema legado/ERP corporativo.

## Prompt para aplicar este estilo

> Aplique o estilo "Classic System UI" com as seguintes características:
>
> **Layout Geral:**
> - Fundo cinza claro (`bg-gray-200`)
> - Sem bordas arredondadas em nenhum elemento
> - Tipografia pequena (10-12px)
> - Layout compacto e denso
>
> **Header/Barra de Título:**
> - Altura fixa de 28px (`h-7`)
> - Fundo cinza escuro (`bg-gray-700`)
> - Texto branco, fonte pequena e semibold
> - Botão de fechar com "✕" no canto direito
>
> **Modais/Dialogs:**
> - Borda sólida cinza (`border-2 border-gray-500`)
> - Sem border-radius
> - Sombra "hard" não difusa (`box-shadow: 4px 4px 0 rgba(0,0,0,0.3)`)
> - Header escuro + conteúdo em `bg-gray-100`
>
> **Fieldsets:**
> - Borda sólida cinza (`border border-gray-400`)
> - Legend com texto pequeno (10px), cinza (`text-gray-600`), semibold
> - Padding interno de 8px (`p-2`)
>
> **Inputs e Selects:**
> - Borda sólida cinza (`border border-gray-400`)
> - Fundo branco (`bg-white`)
> - Padding horizontal 8px, vertical 4px (`px-2 py-1`)
> - Fonte pequena (`text-xs`)
> - Sem outline decorativo
>
> **Botões:**
> - Borda sólida cinza (`border border-gray-400`)
> - Fundo cinza claro (`bg-gray-200` ou `bg-gray-300`)
> - Hover mais escuro (`hover:bg-gray-300` ou `hover:bg-gray-400`)
> - Fonte pequena (`text-xs`)
> - Botões de ação principal: fundo `bg-gray-300`, borda `border-gray-500`, fonte `font-semibold`
>
> **Tabelas:**
> - Header com fundo cinza (`bg-gray-200`)
> - Bordas sólidas em todas as células (`border border-gray-400`)
> - Linhas alternadas (zebra striping) sutis
> - Linha selecionada com fundo azul claro (`bg-blue-100`)
>
> **Painéis Laterais (Aside):**
> - Borda esquerda grossa (`border-l-2 border-gray-500`)
> - Header escuro igual aos modais
> - Footer com fundo cinza e borda superior
>
> **Cores principais:**
> - Fundo: `#e5e7eb` (gray-200)
> - Bordas: `#9ca3af` (gray-400) ou `#6b7280` (gray-500)
> - Header: `#374151` (gray-700)
> - Texto: `#1f2937` (gray-800)
> - Texto secundário: `#4b5563` (gray-600)
>
> **Ícones:**
> - Preferir caracteres de texto (✕, ✓, +, ☰) em vez de SVGs quando possível
> - Tamanho pequeno, integrados aos botões

## Exemplo de estrutura HTML

```html
<!-- Modal -->
<dialog class="dialog-base">
    <div class="h-7 bg-gray-700 text-white text-xs font-semibold flex items-center px-2 justify-between">
        <span>Título do Modal</span>
        <button class="text-white hover:text-gray-300 px-1">✕</button>
    </div>
    <div class="p-3 w-[400px]">
        <fieldset class="border border-gray-400 p-2 mb-3">
            <legend class="text-[10px] text-gray-600 font-semibold px-1">Seção</legend>
            <label class="flex flex-col gap-0.5">
                <span class="text-[10px] text-gray-600">Campo:</span>
                <input type="text" class="border border-gray-400 bg-white px-2 py-1 text-xs">
            </label>
        </fieldset>
        <div class="flex justify-end gap-2 pt-2 border-t border-gray-300">
            <button class="px-3 py-1 border border-gray-400 bg-gray-100 hover:bg-gray-200 text-xs">Cancelar</button>
            <button class="px-3 py-1 border border-gray-500 bg-gray-300 hover:bg-gray-400 text-xs font-semibold">Confirmar</button>
        </div>
    </div>
</dialog>
```

## CSS base necessário

```css
.dialog-base {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    border: 2px solid #6b7280;
    border-radius: 0;
    padding: 0;
    background: #f3f4f6;
    box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.3);
    margin: 0;
    max-height: 90vh;
    overflow: hidden;
}

.dialog-base::backdrop {
    background: rgba(0, 0, 0, 0.4);
}
```

## Referências visuais
- Windows 95/98 UI
- Classic Win32 Applications
- Legacy ERP Systems
- Brutalist Web Design
