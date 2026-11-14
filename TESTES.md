# Verificação da TravelBook v1.0

## Validações executadas durante a preparação do pacote

- Validação sintática de `assets/app.js`, `assets/db.js`, `assets/utils.js` e `service-worker.js` com Node.js.
- Validação de estrutura do projeto e integridade do ZIP.
- Teste automatizado de interface com viewport móvel (390 × 844), num Chromium controlado por Playwright **com armazenamento simulado**, para: criar viagem de demonstração, abrir lista de locais, acrescentar local, acrescentar visita, registar despesa, gerar CSV e backup JSON e abrir modal de privacidade.
- Nenhuma exceção JavaScript detetada nesse teste de interface.

## Ainda não validado neste ambiente

- Publicação numa conta GitHub Pages real.
- Funcionamento da PWA num iPhone físico / Safari iOS.
- Persistência real IndexedDB no iPhone após reinicialização.
- Mosaicos Leaflet/OpenStreetMap e pesquisas Nominatim com Internet (o ambiente de testes não tinha acesso a esses serviços).
- Comportamento offline real do Service Worker no iPhone.
- Sincronização de dados entre iPhones (não implementada na v1).

## Teste recomendado depois da publicação

1. Abrir o endereço HTTPS do repositório e criar a viagem de demonstração.
2. Verificar que o mapa carrega os cinco marcadores de Roma quando existe Internet.
3. Criar um local a partir da pesquisa do mapa, guardar e voltar ao mapa.
4. Editar o local, acrescentar uma nota e confirmar que a alteração persiste após fechar e abrir a aplicação.
5. Planear uma visita e verificar o dia correto.
6. Registar uma despesa de 10 EUR e exportar um CSV.
7. Fazer backup JSON, copiar para Ficheiros e importar noutro iPhone (atenção: substitui os dados locais desse segundo dispositivo).
8. Depois da primeira abertura online, ativar o modo de avião e verificar que Hoje, Roteiro, Despesas e locais são consultáveis. O mapa de fundo e direções não deverão funcionar sem rede.
