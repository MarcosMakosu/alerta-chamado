// ==UserScript==
// @name         Alerta "pendente" com som de sino e flash
// @namespace    http://tampermonkey.net/
// @version      2.1
// @description  Monitora "pendente" a cada 5s. Ao detectar novo termo: toca sino 3x, pisca tela, pop-up e notificação. Persiste estado após refresh.
// @author       marcosmakosu
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // ===== CONFIGURAÇÕES =====
    const INTERVALO_VERIFICACAO = 5000;   // verificação a cada 5 segundos
    const MAX_ALERTAS = 3;                // toques de sino por evento
    const DURACAO_SINO = 1.5;            // duração do decaimento do sino (segundos)
    const INTERVALO_SINOS = 600;          // ms entre os toques consecutivos
    const FREQ_BASE = 800;                // frequência fundamental do sino (Hz)

    // Harmônicos e suas amplitudes relativas (para o timbre de sino)
    const HARMONICOS = [
        { fator: 1.00, amp: 0.4 },   // fundamental
        { fator: 1.20, amp: 0.25 },  // ligeiramente desafinado
        { fator: 1.50, amp: 0.15 },
        { fator: 2.00, amp: 0.1 },
        { fator: 2.52, amp: 0.05 }
    ];

    // ===== ESTADO PERSISTIDO =====
    const STORAGE_KEY = `pendente_last_${location.hostname}${location.pathname}`;
    let ultimaQuantidade = null;

    // ===== FUNÇÕES DE APOIO =====
    function contarPendentes() {
        const texto = document.body.innerText || "";
        const matches = texto.match(/pendente/gi);
        return matches ? matches.length : 0;
    }

    // ---- SOM DE SINO ----
    function tocarSino() {
        try {
            const AC = window.AudioContext || window.webkitAudioContext;
            const ctx = new AC();
            if (ctx.state === 'suspended') {
                ctx.resume().then(() => reproduzirSino(ctx)).catch(() => {});
            } else {
                reproduzirSino(ctx);
            }
        } catch (e) {
            // falha silenciosa se áudio não suportado
        }
    }

    function reproduzirSino(ctx) {
        // Nó master para controlar o volume geral
        const masterGain = ctx.createGain();
        masterGain.gain.value = 0.5;   // volume geral
        masterGain.connect(ctx.destination);

        // Para cada harmônico, cria um oscilador com envelope de decaimento
        HARMONICOS.forEach(h => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';             // tom puro, combinação gera o timbre
            osc.frequency.value = FREQ_BASE * h.fator;

            // Envelope: ataque rápido, decaimento exponencial longo
            const now = ctx.currentTime;
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(h.amp, now + 0.02);          // ataque
            gain.gain.exponentialRampToValueAtTime(0.001, now + DURACAO_SINO); // decaimento

            osc.connect(gain);
            gain.connect(masterGain);

            osc.start(now);
            osc.stop(now + DURACAO_SINO + 0.1); // margem extra
        });
    }

    // ---- ALERTAS VISUAIS ----
    function piscarTela() {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(255, 0, 0, 0.5);
            z-index: 9999998;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.2s ease;
        `;
        document.body.appendChild(overlay);

        let contador = 0;
        function acender() {
            overlay.style.opacity = '1';
            setTimeout(() => {
                overlay.style.opacity = '0';
                contador++;
                if (contador < MAX_ALERTAS) {
                    setTimeout(acender, INTERVALO_SINOS);
                } else {
                    setTimeout(() => overlay.remove(), 200);
                }
            }, 200);
        }
        acender();
    }

    function mostrarPopUp() {
        const popup = document.createElement('div');
        popup.textContent = '🔔 Nova palavra "pendente" detectada!';
        popup.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ff4444;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 16px;
            font-family: Arial, sans-serif;
            z-index: 9999999;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: pendenteFadeInOut 4s forwards;
        `;
        const style = document.createElement('style');
        style.textContent = `
            @keyframes pendenteFadeInOut {
                0% { opacity: 0; transform: translateY(-10px); }
                10% { opacity: 1; transform: translateY(0); }
                80% { opacity: 1; }
                100% { opacity: 0; transform: translateY(-10px); }
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(popup);
        setTimeout(() => {
            popup.remove();
            style.remove();
        }, 4000);
    }

    function notificarNavegador() {
        if (Notification.permission === 'granted') {
            new Notification('Pendente detectado!', {
                body: 'Uma nova ocorrência de "pendente" foi encontrada.',
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🔔</text></svg>'
            });
        } else if (Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }

    function emitirAlerta() {
        // 1. Som de sino (3 toques, um a cada INTERVALO_SINOS ms)
        for (let i = 0; i < MAX_ALERTAS; i++) {
            setTimeout(tocarSino, i * INTERVALO_SINOS);
        }

        // 2. Flash na tela sincronizado com os toques
        piscarTela();

        // 3. Pop-up
        mostrarPopUp();

        // 4. Notificação do navegador
        notificarNavegador();
    }

    // ===== LÓGICA DE VERIFICAÇÃO =====
    function verificar() {
        const agora = contarPendentes();

        // Inicialização do estado na primeira execução
        if (ultimaQuantidade === null) {
            const salvo = localStorage.getItem(STORAGE_KEY);
            if (salvo !== null) {
                ultimaQuantidade = parseInt(salvo, 10);
            } else {
                ultimaQuantidade = agora;
                localStorage.setItem(STORAGE_KEY, agora);
            }
            return; // não dispara alerta na inicialização
        }

        // Só dispara se houver um aumento
        if (agora > ultimaQuantidade) {
            emitirAlerta();
            ultimaQuantidade = agora;
            localStorage.setItem(STORAGE_KEY, agora);
        } else {
            ultimaQuantidade = agora;
            localStorage.setItem(STORAGE_KEY, agora);
        }
    }

    // ===== INICIAR =====
    setTimeout(() => {
        verificar();  // inicializa o estado
        setInterval(verificar, INTERVALO_VERIFICACAO);
    }, INTERVALO_VERIFICACAO);

})();
