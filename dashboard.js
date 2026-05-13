class Dashboard {
    constructor() {
        this.usuarioNome = localStorage.getItem('SAD_USER_NAME') || "Técnico";
        this.init();
    }

    init() {
        document.addEventListener('DOMContentLoaded', () => {
            this.renderizarBoasVindas();
            showScreen('home-screen');
            atualizarData();
            updateStats();
            aplicarTemaSalvo();
            this.inicializarGrafico();
            this.configurarSortable(); // Novo: Drag and Drop
        });
    }

    renderizarBoasVindas() {
        const welcomeElement = document.getElementById('welcome-text');
        if (welcomeElement) {
            welcomeElement.innerText = `Bem-vindo, Técnico ${this.usuarioNome}!`;
        }
    }

    inicializarGrafico() {
        const ctx = document.getElementById('meuGrafico');
        if (!ctx) return;
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
                datasets: [{
                    label: 'Faturamento R$',
                    data: [120, 190, 300, 500, 230, 400],
                    borderColor: '#8b5cf6',
                    tension: 0.4
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    // --- NOVO: DRAG AND DROP ---
    configurarSortable() {
        const colunas = ['cards-pendente', 'cards-analise', 'cards-concluido'];
        colunas.forEach(colId => {
            const el = document.getElementById(colId);
            if (el && typeof Sortable !== 'undefined') {
                new Sortable(el, {
                    group: 'kanban',
                    animation: 150,
                    onEnd: (evt) => {
                        const osId = evt.item.dataset.id;
                        const novoStatusRaw = evt.to.id.split('-')[1]; // extrai 'pendente' de 'cards-pendente'
                        const statusFormatado = novoStatusRaw.charAt(0).toUpperCase() + novoStatusRaw.slice(1);
                        mudarStatusKanban(osId, statusFormatado === 'Analise' ? 'Análise' : statusFormatado);
                    }
                });
            }
        });
    }
}

const appDashboard = new Dashboard();

// --- TEMA DARK/LIGHT ---
function toggleTheme() {
    const body = document.body;
    const btnText = document.getElementById('theme-text');
    
    if (body.classList.contains('dark-theme')) {
        body.classList.replace('dark-theme', 'light-theme');
        localStorage.setItem('SAD_PRO_THEME', 'light');
        btnText.innerText = "Modo Claro";
    } else {
        body.classList.replace('light-theme', 'dark-theme');
        localStorage.setItem('SAD_PRO_THEME', 'dark');
        btnText.innerText = "Modo Escuro";
    }
}

// --- GESTÃO DE FOTOS (CONVERSÃO PARA BASE64) ---
async function processarFotos() {
    const input = document.getElementById('os-fotos');
    const fotosBase64 = [];
    
    for (const file of input.files) {
        const base64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(file);
        });
        fotosBase64.push(base64);
    }
    return fotosBase64;
}

// --- SUBMISSÃO DA OS ATUALIZADA ---
const serviceForm = document.getElementById('serviceForm');
if (serviceForm) {
    serviceForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const checklist = [];
        document.querySelectorAll('.os-check:checked').forEach(el => checklist.push(el.value));

        const pecaId = document.getElementById('os-peca-usada').value;
        const tipoPagamento = document.getElementById('os-pagamento').value;
        let custoPecaSelecionada = 0;

        // Processar fotos (espera converter as imagens)
        const fotos = await processarFotos();

        // Lógica de Estoque
        if (pecaId) {
            let estoque = JSON.parse(localStorage.getItem('SAD_PRO_STOCK') || '[]');
            const index = estoque.findIndex(p => p.id == pecaId);
            if (index !== -1 && estoque[index].qtd > 0) {
                custoPecaSelecionada = parseFloat(estoque[index].preco);
                estoque[index].qtd -= 1; 
                localStorage.setItem('SAD_PRO_STOCK', JSON.stringify(estoque));
            }
        }

        const novaOS = {
            id: Math.floor(100 + Math.random() * 899),
            cliente: document.getElementById('cli-nome').value,
            cpf: document.getElementById('cli-cpf').value,
            aparelho: document.getElementById('apa-nome').value,
            defeito: document.getElementById('apa-defeito').value,
            data: document.getElementById('apa-data').value,
            maodeobra: parseFloat(document.getElementById('os-maodeobra').value) || 0,
            pagamento: tipoPagamento,
            idPeca: pecaId,
            custoPeca: custoPecaSelecionada,
            checklist: checklist,
            fotos: fotos, // Salva o array de imagens
            logs: [{ data: new Date().toLocaleString(), texto: "Ordem de serviço aberta." }],
            status: 'Pendente'
        };

        let osList = JSON.parse(localStorage.getItem('SAD_PRO_OS') || '[]');
        osList.push(novaOS);
        localStorage.setItem('SAD_PRO_OS', JSON.stringify(osList));

        serviceForm.reset();
        openConfirm("Sucesso", "OS Criada com fotos e histórico!", () => showScreen('lista-screen'));
    });
}

// --- FINANCEIRO COM TAXAS ---
function renderFinanceiro() {
    const osList = JSON.parse(localStorage.getItem('SAD_PRO_OS') || '[]');
    const tbody = document.getElementById('fin-table-body');
    if (!tbody) return;
    
    let faturamentoBruto = 0;
    let custoTotalReal = 0; // Peças + Taxas de Cartão

    const concluidos = osList.filter(os => os.status === 'Concluído');

    tbody.innerHTML = concluidos.map(os => {
        const maoDeObra = parseFloat(os.maodeobra || 0);
        const custoPeca = parseFloat(os.custoPeca || 0);
        
        // Cálculo de Taxa de Cartão
        let taxaCartao = 0;
        if (os.pagamento === 'debito') taxaCartao = maoDeObra * 0.019;
        if (os.pagamento === 'credito') taxaCartao = maoDeObra * 0.049;

        const lucroOS = maoDeObra - custoPeca - taxaCartao;
        
        faturamentoBruto += maoDeObra;
        custoTotalReal += (custoPeca + taxaCartao);
        
        return `
            <tr>
                <td>#${os.id}</td>
                <td>${os.cliente} <br><small>${os.pagamento.toUpperCase()}</small></td>
                <td>R$ ${maoDeObra.toFixed(2)}</td>
                <td style="color: #ef4444;">R$ ${(custoPeca + taxaCartao).toFixed(2)}</td>
                <td style="color: #10b981; font-weight: bold;">R$ ${lucroOS.toFixed(2)}</td>
            </tr>
        `;
    }).join('') || '<tr><td colspan="5" style="text-align:center;">Sem dados.</td></tr>';

    document.getElementById('fin-bruto').innerText = `R$ ${faturamentoBruto.toFixed(2)}`;
    document.getElementById('fin-custo').innerText = `R$ ${custoTotalReal.toFixed(2)}`;
    document.getElementById('fin-lucro').innerText = `R$ ${(faturamentoBruto - custoTotalReal).toFixed(2)}`;
    
    // Atualiza barra de meta (Ex: Meta de 5000)
    const meta = 5000;
    const porc = Math.min((faturamentoBruto / meta) * 100, 100);
    document.getElementById('goal-bar').style.width = porc + "%";
    document.getElementById('goal-percent').innerText = porc.toFixed(1) + "%";
}

// --- SISTEMA DE LOGS / HISTÓRICO ---
let currentOsIdLog = null;

function abrirDetalhes(id) {
    const os = JSON.parse(localStorage.getItem('SAD_PRO_OS')).find(o => o.id == id);
    if (!os) return;
    
    currentOsIdLog = id;
    document.getElementById('modal-os-titulo').innerText = `OS #${os.id} - ${os.aparelho}`;
    document.getElementById('os-info-cliente').innerHTML = `
        <p><b>Cliente:</b> ${os.cliente} | <b>CPF:</b> ${os.cpf || 'Não informado'}</p>
        <p><b>Defeito:</b> ${os.defeito}</p>
        <div id="os-fotos-preview" style="display:flex; gap:5px; margin-top:10px; overflow-x:auto;">
            ${os.fotos ? os.fotos.map(f => `<img src="${f}" style="height:60px; border-radius:5px;">`).join('') : ''}
        </div>
    `;
    
    renderLogs(os.logs);
    document.getElementById('modal-detalhes').classList.remove('hidden');
}

function renderLogs(logs) {
    const container = document.getElementById('os-logs');
    container.innerHTML = logs.map(l => `
        <div style="font-size:12px; margin-bottom:8px; border-bottom:1px solid #ddd;">
            <b style="color:#8b5cf6;">${l.data}</b>: ${l.texto}
        </div>
    `).join('');
}

function salvarLog() {
    const texto = document.getElementById('input-novo-log').value;
    if (!texto || !currentOsIdLog) return;

    let osList = JSON.parse(localStorage.getItem('SAD_PRO_OS'));
    const index = osList.findIndex(o => o.id == currentOsIdLog);
    
    osList[index].logs.push({
        data: new Date().toLocaleString(),
        texto: texto
    });

    localStorage.setItem('SAD_PRO_OS', JSON.stringify(osList));
    document.getElementById('input-novo-log').value = '';
    renderLogs(osList[index].logs);
}

function fecharModalDetalhes() {
    document.getElementById('modal-detalhes').classList.add('hidden');
}

// --- ORÇAMENTO RÁPIDO ---
function gerarOrcamento() {
    const cliente = document.getElementById('cli-nome').value || "Cliente";
    const aparelho = document.getElementById('apa-nome').value || "Aparelho";
    const valor = document.getElementById('os-maodeobra').value || "0.00";
    
    const texto = `Olá ${cliente}, o orçamento para o conserto do seu ${aparelho} ficou em R$ ${valor}. Gostaria de autorizar o serviço?`;
    window.open(`https://api.whatsapp.com/send?text=${window.encodeURIComponent(texto)}`, '_blank');
}

// Reutilizando funções básicas (Manter as que você já tinha)
function showScreen(id) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.add('hidden'));
    const target = document.getElementById(id);
    if (target) target.classList.remove('hidden');
    
    if (id === 'lista-screen') renderTable();
    if (id === 'financeiro-screen') renderFinanceiro();
    if (id === 'kanban-screen') renderKanban();
    if (id === 'estoque-screen') renderInventory();
    if (id === 'cadastro-screen') popularSelectPecas();
}

function renderTable() {
    const tbody = document.getElementById('table-body');
    let osList = JSON.parse(localStorage.getItem('SAD_PRO_OS') || '[]');
    tbody.innerHTML = osList.reverse().map(os => `
        <tr onclick="abrirDetalhes(${os.id})" style="cursor:pointer">
            <td>#${os.id}</td>
            <td><b>${os.cliente}</b></td>
            <td>${os.aparelho}</td>
            <td><span class="status-badge status-${os.status.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}">${os.status}</span></td>
            <td>
                <button onclick="event.stopPropagation(); confirmarExclusao(${os.id})" class="btn-del"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

function renderKanban() {
    const osList = JSON.parse(localStorage.getItem('SAD_PRO_OS') || '[]');
    const areas = {
        'Pendente': document.getElementById('cards-pendente'),
        'Análise': document.getElementById('cards-analise'),
        'Concluído': document.getElementById('cards-concluido')
    };
    Object.values(areas).forEach(a => a.innerHTML = '');
    osList.forEach(os => {
        const card = `<div class="kanban-card" data-id="${os.id}"><b>#${os.id}</b><p>${os.cliente}<br>${os.aparelho}</p></div>`;
        if (areas[os.status]) areas[os.status].innerHTML += card;
    });
}

function mudarStatusKanban(id, novoStatus) {
    let osList = JSON.parse(localStorage.getItem('SAD_PRO_OS') || '[]');
    osList = osList.map(os => {
        if (os.id == id) {
            os.status = novoStatus;
            os.logs.push({ data: new Date().toLocaleString(), texto: `Status alterado para: ${novoStatus}` });
        }
        return os;
    });
    localStorage.setItem('SAD_PRO_OS', JSON.stringify(osList));
    updateStats();
}

// Mantenha as funções de estoque (renderInventory, ajustarEstoque, etc) que você já possui.
// As funções de utilitários como atualizarData e aplicarTemaSalvo devem continuar iguais.
