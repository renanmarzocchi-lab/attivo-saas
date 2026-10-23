# Site institucional ATTIVO (versão 2)

Site estático de attivocorretora.com.br. HTML, CSS e JS puros, sem build no servidor.

- Marca: wordmark "attivo" em Bricolage Grotesque com o escudo azul no lugar do pingo do i. Textos em Figtree.
- Cores: marinho #0A2540, azul #1F5BFF, névoa #F3F6FB, verde WhatsApp #17A75A.
- Fotos: Pexels (licença gratuita para uso comercial), otimizadas em WebP e JPG.
- Formulários abrem o WhatsApp (19) 99424-1018 com os dados preenchidos e registram o evento generate_lead no Google Analytics.
- `/afiliados/` redireciona para a home.

## Publicar na VPS

No terminal da VPS (Hostinger > VPS > Web console), como root:

    curl -fsSL "https://raw.githubusercontent.com/renanmarzocchi-lab/attivo-saas/site-institucional/site-institucional/_fonte/publicar-vps.sh?v=4" -o /root/publicar-site.sh && bash /root/publicar-site.sh --aplicar

O script faz backup do site atual, publica, ajusta o cache do nginx (HTML sem cache) e confere as páginas no ar.

## Editar

`_fonte/content.py` tem os textos e seguros; `_fonte/build.py` gera as páginas.
