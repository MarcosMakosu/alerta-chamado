# Alerta de "pendente" – Userscript para Tampermonkey

Script para Tampermonkey que monitora uma página web a cada 5 segundos em busca da palavra **"pendente"**. Quando uma nova ocorrência é detectada, ele emite um alerta completo:

- 🔔 Som de sino (3 toques)
- 🔴 Flash vermelho na tela
- 📌 Pop-up no canto superior
- 🔔 Notificação do navegador

**Persistente**: mantém o estado mesmo após recarregamentos automáticos da página (ex.: extensões que dão refresh a cada 20s).

## Funcionalidades

- Verificação automática a cada 5 segundos.
- Contagem case-insensitive (maiúsculas/minúsculas não diferenciam).
- Som de sino sintetizado via Web Audio API (sem arquivos externos).
- Flash visual na tela (três piscadas rápidas em vermelho).
- Pop-up informativo que desaparece sozinho.
- Notificação do navegador (necessário conceder permissão).
- Uso de `localStorage` para manter a última contagem, evitando alarmes repetidos após refresh.

## Instalação

1. Instale a extensão [Tampermonkey](https://www.tampermonkey.net/) no seu navegador.
2. Acesse o arquivo `alerta-pendente.user.js` deste repositório.
3. O Tampermonkey deve reconhecê‑lo e oferecer a instalação. Clique em **Install**.
4. Acesse a página que deseja monitorar. O script será executado automaticamente.

## Configuração

Você pode personalizar o comportamento editando o cabeçalho do script ou as variáveis no início do código:

| Variável              | Descrição                                              | Valor padrão |
|-----------------------|--------------------------------------------------------|--------------|
| `INTERVALO_VERIFICACAO` | Intervalo entre verificações (ms)                      | `5000`       |
| `MAX_ALERTAS`         | Número de toques de sino e flashes por evento          | `3`          |
| `DURACAO_SINO`        | Duração do decaimento do sino (segundos)               | `1.5`        |
| `INTERVALO_SINOS`     | Intervalo entre os toques de sino (ms)                 | `600`        |
| `FREQ_BASE`           | Frequência fundamental do sino (Hz)                    | `800`        |
| `HARMONICOS`          | Array de objetos com `fator` (multiplicador da frequência) e `amp` (amplitude) | (ver código) |

Para monitorar um termo diferente, altere a palavra `"pendente"` na função `contarPendentes()` (linha `matches = texto.match(/pendente/gi)`).

## Como funciona

- A cada 5 segundos o script extrai todo o texto visível da página (`document.body.innerText`) e conta quantas vezes a palavra aparece.
- Compara com o valor salvo no `localStorage` (chave única por URL). Se o número atual for **maior** que o armazenado, o alerta é disparado.
- O alerta consiste em:
  1. Geração de um som de sino usando 5 osciladores senoidais com harmônicos e envelope de decaimento.
  2. Criação de um overlay vermelho que pisca 3 vezes.
  3. Exibição de um pop‑up no canto superior direito.
  4. Envio de uma notificação nativa (se autorizado).
- O valor da contagem é atualizado no `localStorage` a cada verificação, garantindo que novos “pendente” sejam detectados mesmo após um refresh da página.

## Compatibilidade

- Navegadores modernos com suporte a Tampermonkey (Chrome, Firefox, Edge, Opera, etc.).
- Requer permissão para notificações (será solicitada na primeira detecção).
- O áudio pode exigir uma interação prévia com a página (clique, por exemplo) para funcionar em alguns navegadores, devido a políticas de autoplay.

## Licença

Este projeto está sob a licença MIT. Sinta‑se livre para modificar e distribuir.

---

**Desenvolvido para monitorar ambientes com atualização automática e garantir que nenhuma pendência passe despercebida.**
