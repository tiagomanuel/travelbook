# TravelBook — PWA para viagens pessoais

**TravelBook v1.0 (MVP estático)** — aplicação em português europeu, concebida *mobile-first*, para publicação gratuita no GitHub Pages e utilização no Safari do iPhone.

## O que já funciona

- Criar, editar, selecionar e eliminar várias viagens.
- Guardar locais: atrações, restaurantes, hotéis, cafés, natureza, compras e transportes.
- Mapa interativo com marcadores e filtros por dia (Leaflet e OpenStreetMap, com Internet).
- Procurar um local por nome ou morada quando há Internet (Nominatim; pesquisa manual, nunca autocomplete).
- Tocar no mapa para adicionar coordenadas, ou usar o formulário de adição rápida.
- Planear visitas por dia/hora, editar visitas e assinalá-las como realizadas.
- Abrir direções a pé no Apple Maps para cada local (navegação e rede de transportes geridas pelo Apple Maps, não pela TravelBook).
- Registar despesas, com categoria, data, moeda e quem pagou.
- Exportar CSV por secção, CSV consolidado, GeoJSON dos locais e backup JSON integral.
- Importar backup JSON (substituição total dos dados locais).
- Instalação como aplicação no ecrã inicial do iPhone (PWA) e consulta offline do conteúdo guardado.
- Viagem de demonstração «Roma» para testar sem inserir dados pessoais.

## Limitações importantes da v1.0

1. **Não há sincronização automática entre aparelhos.** A informação fica na IndexedDB de *cada dispositivo*. Para copiar uma viagem do iPhone A para o iPhone B, exporta `travelbook-backup-AAAA-MM-DD.json` no A e importa no B. **A importação substitui tudo o que existe no dispositivo de destino**. Não editem, em simultâneo, dados separados esperando que se juntem depois.
2. **O GitHub Pages publica a aplicação, não as viagens.** Qualquer pessoa pode visitar o endereço da app, mas não vê os dados guardados nos vossos navegadores. Não existem login/contas nesta fase.
3. **Offline parcial:** formulários, viagens, locais, roteiro e despesas continuam disponíveis depois da primeira visita à app com rede e da instalação do Service Worker. O mapa de fundo OpenStreetMap, a pesquisa de locais e direções Apple Maps exigem Internet. Não fazemos prefetch dos mosaicos do OpenStreetMap, porque é proibido pelos respetivos termos de serviço.
4. As linhas do mapa que ligam locais de um dia são **segmentos em linha reta**, não rotas calculadas pela rede viária. A navegação real abre no Apple Maps.
5. Os dados armazenados no iPhone **não são uma cópia de segurança garantida**: podem ser eliminados pelo utilizador ou pelo iOS. Faz backups JSON regulares e guarda-os em Ficheiros, iCloud Drive ou no Mac.
6. O serviço gratuito de pesquisa Nominatim e os mosaicos OSM têm políticas e limites de utilização; são adequados a testes e utilização pessoal moderada, sem garantia de disponibilidade.
7. O projeto é **software livre (MIT)**, mas enquanto usar GitHub Pages e os serviços públicos de mapas depende desses operadores. O software pode ser migrado para outro alojamento estático.

## Publicação no GitHub Pages — sem Terminal

Segue **[GUIA_GITHUB_PAGES.md](GUIA_GITHUB_PAGES.md)**. Resumo:

1. Criar o repositório público `travelbook` na tua conta GitHub.
2. Descomprimir o ZIP e enviar **o conteúdo da pasta** (não o ZIP) para a raiz do repositório: `index.html`, `assets/`, `icons/`, `manifest.webmanifest`, `service-worker.js`, etc.
3. Em **Settings → Pages**, escolher **Deploy from a branch** → `main` → `/(root)` → **Save**.
4. Abrir `https://TEU_UTILIZADOR.github.io/travelbook/` num iPhone e instalar com **Partilhar → Adicionar ao ecrã principal**.

**Não carregues para o GitHub backups JSON reais, CSV com viagens pessoais, bilhetes, localizações privadas ou palavras-passe.** O repositório público contém apenas o código da aplicação.

## Teste local no Mac

Na pasta descomprimida:

```bash
python3 -m http.server 8000
```

Abre `http://localhost:8000` no Safari do Mac. O GitHub Pages utiliza HTTPS; o modo offline só deve ser validado na versão publicada ou em localhost. O servidor Python serve só para testes locais e não precisa de ficar ligado quando a app estiver publicada.

## Estrutura do projeto

```text
index.html                 Interface principal
assets/style.css           Estilos responsivos (mobile-first)
assets/app.js              Ecrãs, formulários, mapas, CSV e ações
assets/db.js               Base de dados local IndexedDB
assets/utils.js            Datas, moedas, CSV, ligações Apple Maps
icons/                     Ícones para Safari e PWA
manifest.webmanifest       Metadados da app instalável
service-worker.js          Cache da interface para utilização offline
.nojekyll                  Publicação estática no GitHub Pages
GUIA_GITHUB_PAGES.md       Instruções de publicação e teste
TESTES.md                  Checklist funcional
```

## Dependências e licenças

- **Sem build**: HTML, CSS e JavaScript ES modules. Não precisas de npm, Node.js nem Python para publicar no GitHub Pages.
- [Leaflet 1.9.4](https://leafletjs.com/) (BSD-2-Clause), carregado por CDN; para mostrar o mapa precisas de rede.
- [OpenStreetMap](https://www.openstreetmap.org/copyright) (© contribuidores, dados ODbL), mosaicos online com atribuição.
- [Nominatim](https://operations.osmfoundation.org/policies/nominatim/), pesquisa manual de locais.
- O código próprio da TravelBook está sob licença MIT (ver `LICENSE`).

## Próxima etapa: sincronização privada

Para teres exatamente as mesmas viagens nos dois iPhones, com alterações sincronizadas automaticamente, é necessário um serviço privado independente do GitHub Pages. Uma opção é **Cloudflare Workers + D1**, com autenticação por utilizador, controlo de permissões, backups e resolução de conflitos offline. Essa infraestrutura **ainda não está implementada nesta versão** e requer conta/configuração no fornecedor. O objetivo da v1 é validar a experiência de utilização antes de acrescentar a complexidade de sincronização.
