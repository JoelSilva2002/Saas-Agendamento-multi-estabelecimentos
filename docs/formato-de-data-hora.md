# Formato de data e hora

O app inteiro é servido em português do Brasil (`<html lang="pt-BR">`) e toda formatação de
data/hora feita em código — a Agenda (FullCalendar), os e-mails de notificação, as telas de
relatórios — usa explicitamente o locale `pt-BR` em 24 horas (`hour12: false`). Não existe
nenhuma string `AM`/`PM` no código-fonte.

## Por que um campo de hora às vezes aparece em AM/PM

Os formulários usam `<input type="time">` e `<input type="date">` nativos do navegador (ex.:
Horário de funcionamento em Configurações, jornada de trabalho em Funcionários, os diálogos de
Encaixe e Bloqueio na Agenda). Esses controles **não seguem o idioma da página** — o Chrome e o
Edge renderizam o seletor de hora/data no **idioma do navegador do usuário**, não no `lang` do
HTML. Num navegador configurado em inglês, o mesmo campo aparece como `09:00 AM` e a data como
`mm/dd/aaaa`, mesmo com o restante da tela em português.

Isso é uma decisão deliberada: trocar por um componente de hora/data customizado resolveria para
todo mundo, mas os campos nativos continuam sendo usados por ora — ver o histórico da Fase 25
para o raciocínio.

## Como o estabelecimento/cliente ajusta

No Chrome ou Edge: **Configurações → Idiomas** → adicionar "Português (Brasil)" e movê-lo para o
topo da lista → reiniciar o navegador. Isso corrige tanto o formato de hora (24h) quanto o de
data (dd/mm/aaaa) em qualquer site, não só neste app.
