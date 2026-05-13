/* 
    TECHNICIAN PRO - HORIZON EDITION 
    JS CORE - DASHBOARD, KANBAN, FINANCEIRO & ESTOQUE
*/

class Dashboard {
    constructor() {
        this.usuarioNome = localStorage.getItem('SAD_USER_NAME') || "Técnico";
        this.init();
    }

    init() {
        document.addEventListener('DOMContentLoaded', () => {
            this.renderizarBoasVindas();
            this.atualizarData();
            this.aplicarTemaSalvo();
            this.updateStats();
            
            // Inicializa a primeira tela
            showScreen('dashboard'); 
            
            // Inicializa componentes visuais
            this.inicializarGrafico();
            this.configurarSortable();
        });
    }

    renderizarBoasVindas() {
        const welcomeElement = document.querySelector('.welcome-banner h1');
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
        const tema = localStorage.getItem('SAD_PRO_THEME');
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

        // Atualiza elementos de estatística se existirem na tela
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
}

const appDashboard = new Dashboard();

/* --- TEMA DARK/LIGHT --- */
function toggleTheme() {
    const body = document.body;
    body.classList.toggle('light-theme');
    const isLight = body.classList.contains('light-theme');
    localStorage.setItem('SAD_PRO_THEME', isLight ? 'light' : 'dark');
}

/* --- GESTÃO DE FOTOS --- */
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
const serviceForm = document.getElementById('os-form');
if (serviceForm) {
    serviceForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Coleta checklist
        const checklist = [];
        document.querySelectorAll('.os-check:checked').forEach(el => checklist.push(el.value));

        // Coleta dados financeiros e estoque
        const pecaId = document.getElementById('os-peca').value;
        const tipoPagamento = document.getElementById('os-pagamento').value;
        let custoPecaSelecionada = 0;

        // Processar fotos
        const fotos = await processarFotos();

        // Lógica de Estoque simples
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
            valor: parseFloat(document.getElementById('os-valor').value) || 0,
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
        alert("Sucesso! Ordem de Serviço #" + novaOS.id + " criada.");
        showScreen('ordens');
    });
}

/* --- NAVEGAÇÃO ENTRE TELAS --- */
function showScreen(id) {
    // Esconde todas as seções (assumindo que você usa classes ou IDs para as telas)
    document.querySelectorAll('.content-section, .form-card, .table-container, .kanban-container').forEach(s => {
        if(!s.classList.contains('sidebar')) s.classList.add('hidden');
    });

    const target = document.getElementById(id) || document.querySelector('.' + id);
    if (target) target.classList.remove('hidden');

    // Gatilhos específicos
    if (id === 'ordens') renderTable();
    if (id === 'kanban') renderKanban();
}

/* --- KANBAN RENDER --- */
function renderKanban() {
    const osList = JSON.parse(localStorage.getItem('SAD_PRO_OS') || '[]');
    const colunas = {
        'Pendente': document.getElementById('cards-pendente'),
        'Análise': document.getElementById('cards-analise'),
        'Concluído': document.getElementById('cards-concluido')
    };

    // Limpa colunas
    Object.values(colunas).forEach(c => { if(c) c.innerHTML = ''; });

    osList.forEach(os => {
        const card = document.createElement('div');
        card.className = 'kanban-card';
        card.dataset.id = os.id;
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                <span style="color:var(--primary-sunset); font-weight:bold;">#${os.id}</span>
                <i class="fas fa-ellipsis-v" style="color:var(--text-muted); cursor:pointer;"></i>
            </div>
            <p style="font-weight:600; margin-bottom:5px;">${os.cliente}</p>
            <p style="font-size:0.85rem; color:var(--text-muted);">${os.aparelho}</p>
        `;
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

/* --- WHATSAPP / ORÇAMENTO --- */
function gerarOrcamento() {
    const cliente = document.getElementById('cli-nome').value || "Cliente";
    const aparelho = document.getElementById('apa-nome').value || "Aparelho";
    const valor = document.getElementById('os-valor').value || "0.00";
    
    const texto = `Olá ${cliente}, o orçamento para o conserto do seu ${aparelho} ficou em R$ ${valor}. Gostaria de autorizar o serviço?`;
    window.open(`https://api.whatsapp.com/send?text=${window.encodeURIComponent(texto)}`, '_blank');
}
