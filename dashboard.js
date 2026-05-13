/* 
    TECHNICIAN PRO - HORIZON & LOGS EDITION 
    JS CORE - DASHBOARD, KANBAN, FINANCEIRO, ESTOQUE & HISTÓRICO
*/

class Dashboard {
    constructor() {
        this.usuarioNome = localStorage.getItem('SAD_USER_NAME') || "Técnico";
        this.init();
        this.currentOsIdLog = null;
    }

    init() {
        document.addEventListener('DOMContentLoaded', () => {
            this.renderizarBoasVindas();
            this.atualizarData();
            this.aplicarTemaSalvo();
            this.updateStats();
            
            // Inicializa a tela inicial
            showScreen('dashboard'); 
            
            // Inicializa componentes visuais e bibliotecas
            this.inicializarGrafico();
            this.configurarSortable();
            this.configurarEventosGerais();
        });
    }

    renderizarBoasVindas() {
        const welcomeElement = document.getElementById('welcome-text') || document.querySelector('.welcome-banner h1');
        if (welcomeElement) {
            welcomeElement.innerText = `Horizon Edition - Olá, ${this.usuarioNome}`;
        }
    }

    atualizarData() {
        const dateEl = document.getElementById('current-date');
        if (dateEl) {
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            dateEl.innerText = new Date().toLocaleDateString('pt-BR', options);
        }
    }

    aplicarTemaSalvo() {
        const tema = localStorage.getItem('SAD_PRO_THEME') || 'dark';
        if (tema === 'light') {
            document.body.classList.add('light-theme');
        }
    }

    updateStats() {
        const osList = JSON.parse(localStorage.getItem('SAD_PRO_OS') || '[]');
        const stats = {
            total: osList.length,
            pendentes: osList.filter(os => os.status === 'Pendente').length,
            concluidos: osList.filter(os => os.status === 'Concluído').length
        };

        const elTotal = document.getElementById('stat-total');
        const elPend = document.getElementById('stat-pendente');
        if (elTotal) elTotal.innerText = stats.total;
        if (elPend) elPend.innerText = stats.pendentes;
    }

    inicializarGrafico() {
        const ctx = document.getElementById('meuGrafico');
        if (!ctx || typeof Chart === 'undefined') return;
        
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
                datasets: [{
                    label: 'Faturamento R$',
                    data: [120, 190, 300, 500, 230, 400],
                    borderColor: '#ffb38a',
                    backgroundColor: 'rgba(255, 179, 138, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true
                }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#a1a1aa' } } },
                scales: {
                    y: { grid: { color: '#262626' }, ticks: { color: '#a1a1aa' } },
                    x: { grid: { color: '#262626' }, ticks: { color: '#a1a1aa' } }
                }
            }
        });
    }

    configurarSortable() {
        const colunas = ['cards-pendente', 'cards-analise', 'cards-concluido'];
        colunas.forEach(colId => {
            const el = document.getElementById(colId);
            if (el && typeof Sortable !== 'undefined') {
                new Sortable(el, {
                    group: 'kanban',
                    animation: 150,
                    ghostClass: 'kanban-ghost',
                    onEnd: (evt) => {
                        const osId = evt.item.dataset.id;
                        const novoStatusRaw = evt.to.id.split('-')[1]; 
                        const statusFormatado = novoStatusRaw.charAt(0).toUpperCase() + novoStatusRaw.slice(1);
                        mudarStatusKanban(osId, statusFormatado === 'Analise' ? 'Análise' : statusFormatado);
                    }
                });
            }
        });
    }

    configurarEventosGerais() {
        const btnSalvarLog = document.getElementById('btn-salvar-log');
        if (btnSalvarLog) btnSalvarLog.onclick = () => this.salvarLog();
    }
}

const appDashboard = new Dashboard();

/* --- TEMA DARK/LIGHT --- */
function toggleTheme() {
    const body = document.body;
    body.classList.toggle('light-theme');
    const isLight = body.classList.contains('light-theme');
    localStorage.setItem('SAD_PRO_THEME', isLight ? 'light' : 'dark');
}

/* --- GESTÃO DE FOTOS (BASE64) --- */
async function processarFotos() {
    const input = document.getElementById('os-fotos');
    if (!input || !input.files.length) return [];
    
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

/* --- SUBMISSÃO DA OS --- */
const serviceForm = document.getElementById('os-form') || document.getElementById('serviceForm');
if (serviceForm) {
    serviceForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const checklist = [];
        document.querySelectorAll('.os-check:checked').forEach(el => checklist.push(el.value));

        const pecaId = document.getElementById('os-peca')?.value || document.getElementById('os-peca-usada')?.value;
        const tipoPagamento = document.getElementById('os-pagamento').value;
        let custoPecaSelecionada = 0;

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
            id: Math.floor(1000 + Math.random() * 9000),
            cliente: document.getElementById('cli-nome').value,
            cpf: document.getElementById('cli-cpf').value,
            aparelho: document.getElementById('apa-nome').value,
            defeito: document.getElementById('apa-defeito').value,
            data: new Date().toLocaleDateString(),
            valor: parseFloat(document.getElementById('os-valor')?.value || document.getElementById('os-maodeobra')?.value) || 0,
            pagamento: tipoPagamento,
            idPeca: pecaId,
            custoPeca: custoPecaSelecionada,
            checklist: checklist,
            fotos: fotos,
            logs: [{ data: new Date().toLocaleString(), texto: "Ordem de serviço aberta." }],
            status: 'Pendente'
        };

        let osList = JSON.parse(localStorage.getItem('SAD_PRO_OS') || '[]');
        osList.push(novaOS);
        localStorage.setItem('SAD_PRO_OS', JSON.stringify(osList));

        serviceForm.reset();
        alert("Sucesso! OS #" + novaOS.id + " criada.");
        showScreen('lista-screen');
    });
}

/* --- NAVEGAÇÃO ENTRE TELAS --- */
function showScreen(id) {
    document.querySelectorAll('.content-section, .kanban-container, .table-container').forEach(s => {
        s.classList.add('hidden');
    });

    const target = document.getElementById(id);
    if (target) target.classList.remove('hidden');

    if (id === 'lista-screen') renderTable();
    if (id === 'kanban-screen') renderKanban();
    if (id === 'financeiro-screen') renderFinanceiro();
}

/* --- KANBAN RENDER --- */
function renderKanban() {
    const osList = JSON.parse(localStorage.getItem('SAD_PRO_OS') || '[]');
    const colunas = {
        'Pendente': document.getElementById('cards-pendente'),
        'Análise': document.getElementById('cards-analise'),
        'Concluído': document.getElementById('cards-concluido')
    };

    Object.values(colunas).forEach(c => { if(c) c.innerHTML = ''; });

    osList.forEach(os => {
        const card = document.createElement('div');
        card.className = 'kanban-card';
        card.dataset.id = os.id;
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                <b style="color:var(--primary-sunset);">#${os.id}</b>
            </div>
            <p style="font-weight:600;">${os.cliente}</p>
            <small style="color:var(--text-muted);">${os.aparelho}</small>
        `;
        card.onclick = () => abrirDetalhes(os.id);
        if (colunas[os.status]) colunas[os.status].appendChild(card);
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
    appDashboard.updateStats();
}

/* --- FINANCEIRO COM TAXAS --- */
function renderFinanceiro() {
    const osList = JSON.parse(localStorage.getItem('SAD_PRO_OS') || '[]');
    const tbody = document.getElementById('fin-table-body');
    if (!tbody) return;
    
    let faturamentoBruto = 0;
    let custoTotalReal = 0; 

    const concluidos = osList.filter(os => os.status === 'Concluído');

    tbody.innerHTML = concluidos.map(os => {
        const valorOS = parseFloat(os.valor || 0);
        const custoPeca = parseFloat(os.custoPeca || 0);
        
        let taxaCartao = 0;
        if (os.pagamento === 'debito') taxaCartao = valorOS * 0.019;
        if (os.pagamento === 'credito') taxaCartao = valorOS * 0.049;

        const lucroOS = valorOS - custoPeca - taxaCartao;
        faturamentoBruto += valorOS;
        custoTotalReal += (custoPeca + taxaCartao);
        
        return `
            <tr>
                <td>#${os.id}</td>
                <td>${os.cliente} <br><small>${os.pagamento.toUpperCase()}</small></td>
                <td>R$ ${valorOS.toFixed(2)}</td>
                <td style="color: #ef4444;">R$ ${(custoPeca + taxaCartao).toFixed(2)}</td>
                <td style="color: #10b981; font-weight: bold;">R$ ${lucroOS.toFixed(2)}</td>
            </tr>
        `;
    }).join('') || '<tr><td colspan="5" style="text-align:center;">Sem dados.</td></tr>';

    document.getElementById('fin-bruto').innerText = `R$ ${faturamentoBruto.toFixed(2)}`;
    document.getElementById('fin-custo').innerText = `R$ ${custoTotalReal.toFixed(2)}`;
    document.getElementById('fin-lucro').innerText = `R$ ${(faturamentoBruto - custoTotalReal).toFixed(2)}`;
}

/* --- SISTEMA DE LOGS E DETALHES --- */
function abrirDetalhes(id) {
    const os = JSON.parse(localStorage.getItem('SAD_PRO_OS')).find(o => o.id == id);
    if (!os) return;
    
    appDashboard.currentOsIdLog = id;
    document.getElementById('modal-os-titulo').innerText = `OS #${os.id} - ${os.aparelho}`;
    document.getElementById('os-info-cliente').innerHTML = `
        <p><b>Cliente:</b> ${os.cliente} | <b>Status:</b> ${os.status}</p>
        <p><b>Defeito:</b> ${os.defeito}</p>
        <div id="os-fotos-preview" style="display:flex; gap:10px; margin-top:10px; overflow-x:auto; padding-bottom:10px;">
            ${os.fotos ? os.fotos.map(f => `<img src="${f}" style="height:80px; border-radius:8px; border:1px solid #333;">`).join('') : 'Sem fotos'}
        </div>
    `;
    
    renderLogs(os.logs);
    document.getElementById('modal-detalhes').classList.remove('hidden');
}

function renderLogs(logs) {
    const container = document.getElementById('os-logs');
    if (!container) return;
    container.innerHTML = logs.map(l => `
        <div style="font-size:0.85rem; margin-bottom:8px; padding-bottom:5px; border-bottom:1px solid #262626;">
            <b style="color:var(--primary-sunset);">${l.data}</b>: ${l.texto}
        </div>
    `).reverse().join('');
}

Dashboard.prototype.salvarLog = function() {
    const input = document.getElementById('input-novo-log');
    const texto = input.value;
    if (!texto || !this.currentOsIdLog) return;

    let osList = JSON.parse(localStorage.getItem('SAD_PRO_OS'));
    const index = osList.findIndex(o => o.id == this.currentOsIdLog);
    
    osList[index].logs.push({
        data: new Date().toLocaleString(),
        texto: texto
    });

    localStorage.setItem('SAD_PRO_OS', JSON.stringify(osList));
    input.value = '';
    renderLogs(osList[index].logs);
};

function fecharModalDetalhes() {
    document.getElementById('modal-detalhes').classList.add('hidden');
}

/* --- WHATSAPP --- */
function gerarOrcamento() {
    const cliente = document.getElementById('cli-nome').value || "Cliente";
    const aparelho = document.getElementById('apa-nome').value || "Aparelho";
    const valor = document.getElementById('os-valor')?.value || document.getElementById('os-maodeobra')?.value || "0.00";
    
    const texto = `Olá ${cliente}, o orçamento para o conserto do seu ${aparelho} ficou em R$ ${valor}. Gostaria de autorizar o serviço?`;
    window.open(`https://api.whatsapp.com/send?text=${window.encodeURIComponent(texto)}`, '_blank');
}

/* --- LISTAGEM --- */
function renderTable() {
    const tbody = document.getElementById('table-body');
    if (!tbody) return;
    let osList = JSON.parse(localStorage.getItem('SAD_PRO_OS') || '[]');
    tbody.innerHTML = osList.slice().reverse().map(os => `
        <tr onclick="abrirDetalhes(${os.id})" style="cursor:pointer">
            <td>#${os.id}</td>
            <td><b>${os.cliente}</b></td>
            <td>${os.aparelho}</td>
            <td><span class="status-badge">${os.status}</span></td>
            <td>
                <button onclick="event.stopPropagation(); excluirOS(${os.id})" class="btn-del" style="background:none; border:none; color:#ef4444; cursor:pointer;">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function excluirOS(id) {
    if (confirm("Deseja realmente excluir esta OS?")) {
        let osList = JSON.parse(localStorage.getItem('SAD_PRO_OS') || '[]');
        osList = osList.filter(os => os.id != id);
        localStorage.setItem('SAD_PRO_OS', JSON.stringify(osList));
        renderTable();
        appDashboard.updateStats();
    }
}
// --- CONFIGURAÇÃO INICIAL E DADOS ---
let ordens = JSON.parse(localStorage.getItem('ordens')) || [];
let estoque = JSON.parse(localStorage.getItem('estoque')) || [];

// --- NAVEGAÇÃO (BOTÕES DA image_3c1775.png) ---
function showScreen(screenId) {
    // Esconde todas as seções
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.add('hidden');
    });

    // Remove a classe active de todos os botões da sidebar
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.remove('active');
    });

    // Mostra a seção desejada
    const targetSection = document.getElementById(screenId);
    if (targetSection) {
        targetSection.classList.remove('hidden');
    }

    // Adiciona classe active ao botão correspondente
    const activeBtn = document.querySelector(`button[onclick*="${screenId}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }

    // Atualiza os dados da tela específica ao abrir
    renderizarDados(screenId);
}

// Função para decidir o que renderizar
function renderizarDados(screenId) {
    actualizarDashboard();
    if (screenId === 'lista-screen') renderizarTabela();
    if (screenId === 'kanban-screen') renderizarKanban();
    if (screenId === 'estoque-screen') renderizarEstoque();
    if (screenId === 'financeiro-screen') renderizarFinanceiro();
    if (screenId === 'cadastro-screen') atualizarSelectPecas();
}

// --- FUNÇÃO SAIR (BOTÃO DE SAIR) ---
function confirmarSair() {
    if (confirm("Deseja realmente sair do sistema?")) {
        // Aqui você pode redirecionar para uma tela de login ou apenas limpar o estado
        alert("Sessão encerrada.");
        location.reload(); 
    }
}

// --- GESTÃO DE ORDENS (CADASTRO) ---
document.getElementById('serviceForm')?.addEventListener('submit', function(e) {
    e.preventDefault();

    const novaOS = {
        id: Date.now(),
        cliente: document.getElementById('cli-nome').value,
        cpf: document.getElementById('cli-cpf').value,
        aparelho: document.getElementById('apa-nome').value,
        defeito: document.getElementById('apa-defeito').value,
        data: document.getElementById('apa-data').value,
        maodeobra: parseFloat(document.getElementById('os-maodeobra').value) || 0,
        pagamento: document.getElementById('os-pagamento').value,
        pecaId: document.getElementById('os-peca-usada').value,
        status: 'pendente',
        checklist: Array.from(document.querySelectorAll('.os-check:checked')).map(c => c.value)
    };

    // Baixa no estoque se houver peça selecionada
    if (novaOS.pecaId) {
        const pecaIndex = estoque.findIndex(p => p.id == novaOS.pecaId);
        if (pecaIndex !== -1 && estoque[pecaIndex].qtd > 0) {
            estoque[pecaIndex].qtd--;
            novaOS.custoPeca = estoque[pecaIndex].preco;
            localStorage.setItem('estoque', JSON.stringify(estoque));
        }
    }

    ordens.push(novaOS);
    localStorage.setItem('ordens', JSON.stringify(ordens));
    
    alert("Ordem de Serviço criada com sucesso!");
    this.reset();
    showScreen('lista-screen');
});

// --- RENDERIZAÇÃO DA LISTA ---
function renderizarTabela() {
    const tbody = document.getElementById('table-body');
    if (!tbody) return;
    
    tbody.innerHTML = ordens.map(os => `
        <tr class="animate-in">
            <td>#${os.id.toString().slice(-4)}</td>
            <td>${os.cliente}</td>
            <td><b>${os.aparelho}</b><br><small>${os.defeito}</small></td>
            <td><span class="status-badge status-${os.status}" onclick="alterarStatus(${os.id})">${os.status}</span></td>
            <td>
                <button class="btn-del" onclick="deletarOS(${os.id})"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

// --- KANBAN ---
function renderizarKanban() {
    const colunas = {
        pendente: document.getElementById('cards-pendente'),
        analise: document.getElementById('cards-analise'),
        concluido: document.getElementById('cards-concluido')
    };

    Object.values(colunas).forEach(c => { if(c) c.innerHTML = ''; });

    ordens.forEach(os => {
        const card = document.createElement('div');
        card.className = 'kanban-card animate-in';
        card.innerHTML = `
            <b>${os.cliente}</b><br>
            <small>${os.aparelho}</small>
        `;
        colunas[os.status]?.appendChild(card);
    });
}

// --- ESTOQUE ---
function abrirModalPeca() { document.getElementById('modal-peca').classList.remove('hidden'); }
function fecharModalPeca() { document.getElementById('modal-peca').classList.add('hidden'); }

function salvarPecaModal() {
    const novaPeca = {
        id: Date.now(),
        nome: document.getElementById('modal-stk-nome').value,
        qtd: parseInt(document.getElementById('modal-stk-qtd').value),
        preco: parseFloat(document.getElementById('modal-stk-preco').value)
    };
    estoque.push(novaPeca);
    localStorage.setItem('estoque', JSON.stringify(estoque));
    fecharModalPeca();
    renderizarEstoque();
}

function renderizarEstoque() {
    const tbody = document.getElementById('inventory-table-body');
    if (!tbody) return;
    tbody.innerHTML = estoque.map(p => `
        <tr>
            <td>${p.nome}</td>
            <td>${p.qtd} un</td>
            <td>R$ ${p.preco.toFixed(2)}</td>
            <td><button class="btn-del" onclick="removerPeca(${p.id})"><i class="fas fa-times"></i></button></td>
        </tr>
    `).join('');
}

// --- FINANCEIRO ---
function renderizarFinanceiro() {
    let bruto = 0;
    let custo = 0;
    const tbody = document.getElementById('fin-table-body');

    ordens.forEach(os => {
        bruto += os.maodeobra;
        custo += (os.custoPeca || 0);
    });

    if(document.getElementById('fin-bruto')) document.getElementById('fin-bruto').innerText = `R$ ${bruto.toFixed(2)}`;
    if(document.getElementById('fin-custo')) document.getElementById('fin-custo').innerText = `R$ ${custo.toFixed(2)}`;
    if(document.getElementById('fin-lucro')) document.getElementById('fin-lucro').innerText = `R$ ${(bruto - custo).toFixed(2)}`;
}

// --- AUXILIARES ---
function actualizarDashboard() {
    if(document.getElementById('count-total')) document.getElementById('count-total').innerText = ordens.length;
    if(document.getElementById('count-open')) document.getElementById('count-open').innerText = ordens.filter(o => o.status !== 'concluido').length;
    if(document.getElementById('current-date')) document.getElementById('current-date').innerText = new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function atualizarSelectPecas() {
    const select = document.getElementById('os-peca-usada');
    if(!select) return;
    select.innerHTML = '<option value="">Selecione uma peça...</option>' + 
        estoque.map(p => `<option value="${p.id}">${p.nome} (${p.qtd} disponíveis)</option>`).join('');
}

function alterarStatus(id) {
    const index = ordens.findIndex(o => o.id === id);
    const statusCiclo = ['pendente', 'analise', 'concluido'];
    let atual = statusCiclo.indexOf(ordens[index].status);
    ordens[index].status = statusCiclo[(atual + 1) % 3];
    localStorage.setItem('ordens', JSON.stringify(ordens));
    renderizarTabela();
}

function deletarOS(id) {
    if(confirm("Excluir esta ordem permanentemente?")) {
        ordens = ordens.filter(o => o.id !== id);
        localStorage.setItem('ordens', JSON.stringify(ordens));
        renderizarTabela();
    }
}

// Inicialização
window.onload = () => {
    actualizarDashboard();
};
