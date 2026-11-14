# Publicar a TravelBook no GitHub Pages (MacBook Air + iPhones)

## 1 — Descarregar e preparar a pasta

1. Descarrega `travelbook-github-pages.zip` da conversa e abre-o no Finder.
2. Faz duplo clique no ZIP para descomprimir.
3. Entra na pasta `travelbook-github-pages`. Confirma que vês `index.html`, `assets`, `icons`, `manifest.webmanifest` e `service-worker.js`.

> **Atenção:** vais enviar os ficheiros descomprimidos. Não basta carregar o ZIP para o repositório.

## 2 — Criar o repositório

1. Abre <https://github.com/new> (depois de iniciar sessão).
2. Em **Repository name**, escreve `travelbook`.
3. Seleciona **Public**. O GitHub Pages gratuito para um repositório normal funciona mais diretamente assim.
4. Podes deixar a opção de criar README desmarcada; o ZIP já inclui um.
5. Carrega em **Create repository**.

Um repositório público não significa que as tuas viagens serão públicas: **esta versão nunca publica dados pessoais no repositório**. Os registos são criados e guardados no navegador do dispositivo. Ainda assim, não envies backups reais para o repositório.

## 3 — Carregar a aplicação

1. No repositório, escolhe **Add file → Upload files** (podes abrir `https://github.com/TEU_UTILIZADOR/travelbook/upload/main` após substituir o teu nome de utilizador).
2. Arrasta para a área de upload **o conteúdo da pasta descomprimida**; conserva as subpastas `assets/` e `icons/`.
3. Confirma que `index.html` fica na **raiz**, não dentro de `travelbook-github-pages/`.
4. Em **Commit changes**, escreve `Publicar primeira versão TravelBook` e confirma.

Se o navegador não aceitar arrastar uma pasta inteira, usa o **GitHub Desktop** no Mac: cria/clona o repositório, copia os ficheiros descomprimidos para a pasta do repositório, faz **Commit** e depois **Push**.

## 4 — Ativar o GitHub Pages

1. No repositório, abre **Settings → Pages**.
2. Na área **Build and deployment**, escolhe **Source: Deploy from a branch**.
3. Escolhe a branch **main** e a pasta **/(root)**.
4. Carrega em **Save**.
5. Na própria página **Pages**, encontra o URL publicado após a publicação.

O endereço costuma ser:

`https://TEU_UTILIZADOR.github.io/travelbook/`

É importante incluir a barra final `/`: a aplicação usa caminhos relativos para funcionar num repositório do GitHub Pages.

**Se aparecer 404:** confirma que `index.html` está na raiz, que a branch é `main`, que escolheste `/(root)` e que o estado da publicação está concluído. A primeira publicação pode demorar alguns minutos.

## 5 — Testar no iPhone

1. Abre o endereço HTTPS da TravelBook no **Safari** do teu iPhone.
2. Experimenta **«Viagem de demonstração»** e confirma que consegues navegar por Hoje, Mapa, Roteiro, Despesas e Mais.
3. No Safari, toca em **Partilhar → Adicionar ao ecrã principal**. Se aparecer a opção **«Abrir como aplicação web»**, ativa-a.
4. Abre a aplicação a partir do novo ícone. Recomendo que **cries os teus dados reais a partir da aplicação instalada**, porque o armazenamento do Safari e o de uma PWA instalada podem comportar-se de forma distinta no iOS.
5. No segundo iPhone, repete a instalação. Importa o backup JSON do primeiro se quiseres copiar os roteiros.

## 6 — Checklist operacional

- Cria uma viagem com datas.
- Abre o mapa e procura uma atração (ligação à Internet necessária).
- Seleciona uma posição no mapa ou preenche latitude/longitude para guardar um restaurante.
- Adiciona uma visita à agenda do dia.
- Toca em **Direções** para abrir o Apple Maps.
- Regista uma despesa.
- Em **Mais**, exporta `tudo.csv` e um backup JSON.
- Abre o ficheiro CSV no Numbers, e guarda o JSON em **Ficheiros**.
- Ativa o modo de avião e verifica os ecrãs de Hoje/Roteiro/Despesas (mapa de fundo e pesquisas não funcionam offline).

## 7 — Atualizar a aplicação

Para uma versão nova, substitui os ficheiros do repositório e cria um novo commit. O Pages publicará a nova versão automaticamente. As viagens guardadas no iPhone **não são substituídas** pelo código novo, embora seja sempre prudente exportar um backup antes de grandes atualizações.

## 8 — Restrições desta fase

O GitHub Pages é gratuito e oferece HTTPS, mas aloja apenas ficheiros estáticos. Não executa Django/Python, não tem autenticação de utilizadores e não oferece uma base de dados de escrita partilhada. A TravelBook v1 permite guardar/editar offline dados **locais a cada aparelho** e importá-los/exportá-los; **não sincroniza alterações entre os dois iPhones**.

Para sincronização automática privada será preciso adicionar uma API e base de dados segura (por exemplo, Workers+D1) numa segunda versão.
