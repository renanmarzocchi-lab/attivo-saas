# Site Institucional — ATTIVO Engenharia & Consultoria

Site da empresa de consultoria e engenharia em **meio ambiente** e **segurança do trabalho**.

Arquivo único (`index.html`), sem build e sem dependências — HTML + CSS + JavaScript puros.

## Como visualizar localmente

Basta abrir o `index.html` no navegador, ou servir a pasta:

```bash
npx serve website
# ou
python3 -m http.server 8080 --directory website
```

## Como publicar

Por ser um site 100% estático, pode ser hospedado gratuitamente em qualquer um destes:

- **Vercel / Netlify** — arraste a pasta `website/` no painel
- **GitHub Pages** — aponte o Pages para a pasta
- **Cloudflare Pages**

## Personalização (checklist antes de ir ao ar)

| Item | Onde alterar |
|------|--------------|
| Número do WhatsApp | Buscar `5500000000000` e substituir pelo número real (formato: 55 + DDD + número) |
| E-mail | Buscar `contato@attivoeng.com.br` |
| Nome da empresa | Buscar `ATTIVO` (logo, títulos, rodapé) |
| Números de resultados | Atributos `data-alvo` na seção `#numeros` |
| Depoimentos | Seção `#depoimentos` |
| Cores da marca | Variáveis CSS em `:root` (`--verde-*`, `--amber-*`) |

## Recursos do site

- Hero imersivo com partículas animadas em canvas e onda em SVG
- Animações de entrada ao rolar (IntersectionObserver)
- Contadores animados de resultados
- Barra de progresso de leitura
- Cards de serviços com micro-interações
- Linha do tempo do método de trabalho
- FAQ em acordeão
- Formulário que abre o WhatsApp com a mensagem preenchida
- Botão flutuante de WhatsApp
- Totalmente responsivo (mobile-first) e com suporte a `prefers-reduced-motion`
