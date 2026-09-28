# Aba Tools

Vitrine das ferramentas da Elixir em `/tools`. Cada ferramenta tem um **banner 3:1**, uma **prévia**
(modal) e uma **página própria** em `/tools/<link>`, montada em blocos pelo admin.

## Fluxo

```
/tools  → banners 3:1 empilhados (ordem do admin; tools Alpha com selo 🔒/⚡ ALPHA)
   │ clique
   ▼
Prévia  → banner, nome, linha de apoio, texto, "Dentro: 1 vídeo · 2 links"
   │      com acesso: "Acessar ferramenta"   ·   sem acesso: "Desbloquear com Alpha" (→ /planos)
   ▼
/tools/<link> → blocos (texto, vídeo, imagem, botões, arquivo) + cartão "Nesta ferramenta"
                sem acesso: só o topo + cartão "Conteúdo exclusivo Alpha" (os blocos nem são enviados)
```

## Quem vê o quê

| | Tool pública | Tool Alpha |
|---|---|---|
| Visitante / logado sem Alpha | tudo | banner + prévia; página só com o topo e o cartão de desbloqueio |
| Alpha (ou admin) | tudo | tudo |

Rascunhos não aparecem na vitrine; só o admin abre a página deles (com o aviso "Rascunho").

## Admin (`/admin` → cartão **Tools**)

- **Lista:** miniatura do banner, link, selos (Pública/Alpha · Publicada/Rascunho · nº de blocos), ↑↓ ordem,
  Publicar/Despublicar, Editar, Página, Ver ↗, Apagar.
- **Tool:** banner (PNG/JPG/WEBP até 5 MB, ideal **2100×700**; o admin avisa se a proporção fugir de 3:1 ou
  a resolução for baixa), nome, link (gerado do nome, editável), linha de apoio, texto da prévia (até 600),
  acesso (Pública / Exclusiva Alpha), status (Rascunho / Publicada). Não publica sem banner.
- **Página (blocos):** Texto (`**negrito**`, parágrafo = linha em branco, links https clicáveis) · Vídeo
  (link do YouTube + capa opcional) · Imagem (formato original, sem corte) · Botão (texto + link externo
  ou `/página`, estilo principal/secundário; botões seguidos ficam lado a lado) · Arquivo (até 50 MB).

**Dica pras artes:** o nome da tool vai dentro da arte, à esquerda. Deixe o **canto superior direito livre**
(é onde entra o selo Alpha, que no celular ocupa mais espaço proporcionalmente).

## Por baixo

- **Banco:** `Tool` (slug único, título, tagline, summary, imageUrl, access, active, position) e `ToolBlock`
  (type, position, title, body, url, imageUrl, fileName, fileSize, variant; cascata ao apagar a tool).
  Migração `20260928000000_tools`.
- **Imagens → `server/media/`**, servidas em `/media` **públicas** (a vitrine abre pra qualquer visitante),
  com nome aleatório, cache de 1 ano (`immutable`) e `nosniff`. O tipo é conferido pelos **bytes** do arquivo;
  SVG é recusado (pode conter script). Separado do `/uploads`, que continua exclusivo Alpha.
- **Arquivos → `server/tool-files/`** (privado, não é servido direto). O download passa por
  `GET /api/tools/file/:id`, que confere o acesso da tool antes de entregar (com o nome original).
- **Vídeo:** o link/ID do YouTube nunca vai na página — só sai em `GET /api/tools/video/:id` na hora do play,
  depois de conferir o acesso. Toca no mesmo player da Área do Aluno (`SecureVideo`).
- **Login opcional** (`optionalAuth`): as rotas públicas identificam quem está logado sem barrar visitante.
- **Links de botão** aceitam só `http(s)://` ou `/página`; `javascript:`, `data:`, `//site` e `/\site` são recusados.
- Trocar/apagar banner, imagem, capa ou arquivo apaga o arquivo antigo do disco.

## Endpoints

| Rota | Quem | O quê |
|---|---|---|
| `GET /api/tools` | todos | tools publicadas (com `locked` e contagem de conteúdo) |
| `GET /api/tools/:slug` | todos | tool + blocos (vazio + `reason` se sem acesso; rascunho só admin) |
| `GET /api/tools/video/:id` | com acesso | ID do YouTube |
| `GET /api/tools/file/:id` | com acesso | download |
| `GET/POST/PATCH/DELETE /api/admin/tools…` | admin | CRUD + `POST …/:id/move` |
| `POST /api/admin/tools/:id/blocks`, `PATCH/DELETE /api/admin/tool-blocks/:id`, `POST …/:id/move` | admin | blocos |
| `POST /api/admin/media` · `POST /api/admin/tool-files` | admin | upload de imagem · de arquivo |

## Deploy

Tem migração → API parada no passo do banco:

```bash
cd /var/www/elixir && git pull && npm run build
cd server && pm2 stop elixir-api && npx prisma migrate deploy && npx prisma generate && pm2 start elixir-api
```

As pastas `server/media` e `server/tool-files` são criadas sozinhas no start (e ficam fora do git).
**Backup:** inclua as duas junto com o `dev.db` — são os banners e arquivos das tools.
