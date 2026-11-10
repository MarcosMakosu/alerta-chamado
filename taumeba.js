// ==UserScript==
// @name         Alerta Pendente + Suporte TI
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Pisca a tela com cores fortes por 4s quando há 2+ "Pendente" e "Suporte TI" na página
// @match        *://*/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    // ===== CONFIGURAÇÕES =====
    const CORES = ['#ff0000', '#ffff00', '#00ff00', '#00ffff', '#ff00ff', '#ff8800', '#ffffff', '#0000ff'];
    const DURACAO_PISCA = 4000;   // 4 segundos
    const INTERVALO_COR = 200;    // troca de cor a cada 200ms
    const DEBOUNCE = 300;         // espera mudanças na página antes de verificar
    const VERIFICACAO_PERIODICA = 2000; // verificação de segurança a cada 2s

    // ===== ESTADO =====
    let ultimoPendente = 0;
    let ultimoSuporte = 0;
    let overlay = null;
    let flashInterval = null;
    let flashTimeout = null;

    // ===== CONTAGEM =====
    function contar(texto, regex) {
        const m = texto.match(regex);
        return m ? m.length : 0;
    }

    function contarTudo() {
        const texto = document.body ? document.body.innerText : '';
        return {
            pendente: contar(texto, /pendente/gi),
            // aceita "Suporte TI", "suporte ti", "SuporteTI", etc.
            suporte: contar(texto, /suporte\s*ti/gi)
        };
    }

    // ===== OVERLAY QUE PISCA =====
    function criarOverlay() {
        const el = document.createElement('div');
        el.id = 'tm-alerta-pisca';
        Object.assign(el.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100vw',
            height: '100vh',
            pointerEvents: 'none',
            zIndex: '2147483647',
            display: 'none',
            opacity: '0.75',
            backgroundColor: '#ff0000'
        });
        (document.body || document.documentElement).appendChild(el);
        return el;
    }

    function piscar() {
        if (!overlay) overlay = criarOverlay();

        // Se já estava piscando, reinicia (garante nova alerta)
        if (flashInterval) clearInterval(flashInterval);
        if (flashTimeout) clearTimeout(flashTimeout);

        overlay.style.display = 'block';

        let i = 0;
        const trocarCor = () => {
            overlay.style.backgroundColor = CORES[i % CORES.length];
            i++;
        };

        trocarCor(); // primeira cor imediata
        flashInterval = setInterval(trocarCor, INTERVALO_COR);

        flashTimeout = setTimeout(() => {
            clearInterval(flashInterval);
            flashInterval = null;
            flashTimeout = null;
            overlay.style.display = 'none';
        }, DURACAO_PISCA);
    }

    // ===== VERIFICAÇÃO =====
    function verificar() {
        const { pendente, suporte } = contarTudo();

        const condicaoAtual = pendente >= 2 && suporte >= 1;
        const condicaoAnterior = ultimoPendente >= 2 && ultimoSuporte >= 1;

        const cresceuPendente = pendente > ultimoPendente;
        const cresceuSuporte = suporte > ultimoSuporte;

        // Dispara quando:
        //  - a condição acabou de ser satisfeita (primeira vez), OU
        //  - a condição já estava satisfeita e a contagem aumentou
        if (
            condicaoAtual &&
            (!condicaoAnterior || (condicaoAnterior && (cresceuPendente || cresceuSuporte)))
        ) {
            piscar();
        }

        ultimoPendente = pendente;
        ultimoSuporte = suporte;
    }

    // ===== OBSERVADOR DE MUDANÇAS =====
    let debounceTimer = null;
    function agendarVerificacao() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(verificar, DEBOUNCE);
    }

    function iniciarObservador() {
        const alvo = document.body || document.documentElement;
        if (!alvo) {
            setTimeout(iniciarObservador, 500);
            return;
        }

        const observer = new MutationObserver(() => agendarVerificacao());
        observer.observe(alvo, {
            childList: true,
            subtree: true,
            characterData: true
        });

        // Verificação inicial + periódica (garante funcionamento mesmo se o observer falhar)
        verificar();
        setInterval(verificar, VERIFICACAO_PERIODICA);
    }

    iniciarObservador();
})();
