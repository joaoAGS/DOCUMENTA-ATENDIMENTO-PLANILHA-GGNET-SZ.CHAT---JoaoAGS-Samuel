// ==UserScript==
// @name         Documeta atendimento/planilha GGNET SZ.CHAT - JoaoAGS/Samuel
// @namespace    http://tampermonkey.net/
// @version      13.1
// @description  Envia Regional, Nome, Protocolo, Tel e Anotações para a Planilha
// @author       João/Samuel
// @icon         https://avatars.githubusercontent.com/u/179055349?v=4
// @match        *://*.clusterscpr.sz.chat/*
// @grant        GM_xmlhttpRequest

// ==/UserScript==
// @updateURL    https://raw.githubusercontent.com/joaoAGS/DOCUMENTA-ATENDIMENTO-PLANILHA-GGNET-SZ.CHAT---JoaoAGS-Samuel/main/Documeta%20atendimento/planilha%20GGNET%20SZ.CHAT.user.js
// @downloadURL  https://raw.githubusercontent.com/joaoAGS/DOCUMENTA-ATENDIMENTO-PLANILHA-GGNET-SZ.CHAT---JoaoAGS-Samuel/main/Documeta%20atendimento/planilha%20GGNET%20SZ.CHAT.user.js

(function() {
    'use strict';

    // =================================================================
    // 🟢 COLE SUA URL DO APPS SCRIPT AQUI (/exec):
    const URL_DA_PLANILHA = "https://script.google.com/macros/s/AKfycbzslaujmYcL5ko_rXYXLstvLQSxjOdbIeUvtiFyEhXzbTsrCH4rYfE2lrZOmpCicGm2/exec";
    // =================================================================

    // --- 1. PEGAR A REGIONAL (Do seu script de botões coloridos) ---
    function pegarRegionalSalva() {
        // O seu outro script salva isso no navegador. A gente só lê.
        return localStorage.getItem('sz_regional_selecionada') || "Não Selecionada";
    }

    // --- 2. PEGAR DADOS DO CLIENTE (Do script Luiz Toledo) ---
    function buscarDadosBasicos() {
        const botoesAtuais = Array.from(document.querySelectorAll('a.item.text-ellipsis'));

        // Protocolo
        const protocoloEl = botoesAtuais.find(el => el.textContent.includes('Protocolo:'));
        const protocolo = protocoloEl ? protocoloEl.textContent.match(/Protocolo:\s*([0-9]+)/)?.[1] || '' : 'Não encontrado';

        // Nome
        const nomeEl = document.querySelector('h3.ui.header.mt-0.text-ellipsis');
        const nome = nomeEl ? nomeEl.textContent.trim() : 'Nome não encontrado';

        // Telefone
        const telefoneEl = document.querySelector('small.mt-2');
        let telefone = telefoneEl ? telefoneEl.textContent.trim() : '';
        telefone = telefone.replace(/[^\d+]/g, '');

        return { nome, protocolo, telefone };
    }

    // --- 3. LER AS ANOTAÇÕES (Abre, copia, fecha) ---
    async function lerAnotacoes() {
        return new Promise((resolve) => {
            const botoes = Array.from(document.querySelectorAll('button, a.item'));
            const btnAnotacoes = botoes.find(b => b.textContent.includes("Anotações"));

            if (!btnAnotacoes) {
                resolve(""); // Se não achar botão, manda vazio
                return;
            }

            btnAnotacoes.click();

            setTimeout(() => {
                const textArea = document.querySelector('textarea');
                let textoAnotacao = textArea ? textArea.value.trim() : "";

                // Tenta fechar
                const btnFechar = document.querySelectorAll('.modal .actions .button, .modal .close');
                if(btnFechar.length > 0) {
                     btnFechar[btnFechar.length - 1].click();
                } else {
                    document.body.dispatchEvent(new KeyboardEvent('keydown', {'key': 'Escape'}));
                }
                resolve(textoAnotacao);
            }, 800);
        });
    }

    // --- 4. EXECUTAR E ENVIAR ---
    async function executarProcesso() {
        let btn = document.getElementById("btn-topo-sz-ggnet");

        if (URL_DA_PLANILHA.includes("###")) {
            alert("⚠️ Configure a URL no código!");
            return;
        }

        let textoOriginal = btn.innerHTML;
        btn.innerHTML = "⏳ Lendo...";
        btn.style.backgroundColor = "#e6b800";

        try {
            // Coleta tudo
            const dados = buscarDadosBasicos();
            const regional = pegarRegionalSalva();

            btn.innerHTML = "⏳ Anotações...";
            const descricao = await lerAnotacoes();

            btn.innerHTML = "🚀 Enviando...";

            // Prepara pacote
            let pacoteDados = JSON.stringify({
                regional: regional,
                nome: dados.nome,
                protocolo: dados.protocolo,
                telefone: dados.telefone,
                descricao: descricao
                // Obs: O "Sz.Chat" agora é colocado direto pela Planilha, não precisa enviar aqui
            });

            // Envia
            GM_xmlhttpRequest({
                method: "POST",
                url: URL_DA_PLANILHA,
                data: pacoteDados,
                headers: { "Content-Type": "application/json" },
                onload: function(response) {
                    if (response.status === 200 || response.status === 302) {
                        btn.innerHTML = "✅ Sucesso!";
                        btn.style.backgroundColor = "#1e7e34";
                    } else {
                        btn.innerHTML = "⚠️ Erro " + response.status;
                    }

                    setTimeout(() => {
                        btn.innerHTML = textoOriginal;
                        btn.style.backgroundColor = "#28a745";
                    }, 3000);
                },
                onerror: function(err) {
                    console.error(err);
                    btn.innerHTML = "❌ Falha Net";
                }
            });

        } catch (e) {
            console.error(e);
            btn.innerHTML = "❌ Erro";
        }
    }

    // --- 5. INSERIR O BOTÃO ---
    function inserirBotaoTopo() {
        if (document.getElementById("btn-topo-sz-ggnet")) return;

        let xpathHeader = '//*[@id="app"]/main/span/header';
        let result = document.evaluate(xpathHeader, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        let header = result.singleNodeValue;

        if (header) {
            let btn = document.createElement("button");
            btn.id = "btn-topo-sz-ggnet";
            btn.innerHTML = "📥 Enviar Planilha";

            Object.assign(btn.style, {
                position: "absolute",
                right: "180px",
                top: "50%",
                transform: "translateY(-50%)",
                backgroundColor: "#28a745",
                color: "white",
                border: "none",
                borderRadius: "20px",
                padding: "8px 15px",
                fontWeight: "bold",
                fontSize: "12px",
                cursor: "pointer",
                zIndex: "9999",
                boxShadow: "0 2px 5px rgba(0,0,0,0.2)"
            });

            btn.onmouseover = () => btn.style.backgroundColor = "#218838";
            btn.onmouseout = () => btn.style.backgroundColor = "#28a745";
            btn.onclick = executarProcesso;

            header.appendChild(btn);
        }
    }

    setInterval(inserirBotaoTopo, 1000);

})();