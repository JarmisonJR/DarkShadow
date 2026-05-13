/* 
    TECHNICIAN PRO - UNIFIED CORE 
    Sistema de Gestão de Ordens de Serviço
*/

// --- ESTADO GLOBAL DA APLICAÇÃO ---
let ordens = JSON.parse(localStorage.getItem('SAD_PRO_OS')) || [];
let estoque = JSON.parse(localStorage.getItem('SAD_PRO_STOCK')) || [];

// --- CLASSE PRINCIPAL DO DASHBOARD ---
class Dashboard {
    constructor() {
        this.usuarioNome = localStorage.getItem('SAD_USER_NAME') || "Técnico";
        this.currentOsIdLog = null;
        this.init();
    }

    init() {
        document.addEventListener('DOMContentLoaded', () => {
            this.renderizarBoasVindas();
            this.atualizarData();
            this.aplicarTemaSalvo();
            this.updateStats();
            
            // Inicia na tela de Dashboard
            showScreen('dashboard-screen'); 
            
            // Inicializa componentes visuais
            this.inicializarGrafico();
            this.configurarSortable();
        });
    }

    renderizarBoasVindas() {
        const welcomeElement = document.getElementById('welcome-text') || document.querySelector('.welcome-banner h1');
        if (welcomeElement) welcomeElement.innerText = `Horizon Edition - Olá, ${this.usuarioNome}`;
    }

    atualizarData() {
        const dateEl = document.getElementById('current-date');
        if (dateEl) {
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            dateEl.innerText = new Date().toLocaleDateString('pt-BR', options);
        }
    }

    aplicarTemaSalvo() {
        if (localStorage.getItem('SAD_PRO_THEME') === 'light') document.body.classList.add('light-theme');
    }

    updateStats() {
        const total = ordens.length;
        const pendentes = ordens.filter(os => os.status.toLowerCase() !== 'concluído').length;
        
        if (document.getElementById('stat-total') || document.getElementById('count-total')) {
            const el = document.getElementById('stat-total') || document.getElementById('count-total');
            el.innerText = total;
        }
        if (document.getElementById('stat-pendente') || document.getElementById('count-open')) {
            const el = document.getElementById('stat-pendente') || document.getElementById('count-open');
            el.innerText = pendentes;
        }
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
            options: { responsive: true, maintainAspectRatio: false }
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
                    onEnd: (evt) => {
                        const osId = evt.item.dataset.id;
                        const statusRaw = evt.to.id.split('-')[1];
                        const novoStatus = statusRaw.charAt(0).toUpperCase() + statusRaw.slice(1);
                        mudarStatusOS(osId, novoStatus === 'Analise' ? 'Análise' : novoStatus);
                    }
                });
            }
        });
    }
}

const app = new Dashboard();

// --- NAVEGAÇÃO ENTRE TELAS (CONTROLA OS BOTÕES DA SIDEBAR) ---
function showScreen(screenId) {
    // 1. Esconder todas as seções
    const sections = document.querySelectorAll('.content-section, .table-container, .kanban-container');
    sections.forEach(s => s.classList.add('hidden'));

    // 2. Mostrar a seção alvo
    const target = document.getElementById(screenId);
    if (target) {
        target.classList.remove('hidden');
    } else {
        console.error("Seção não encontrada:", screenId);
    }

    // 3. Marcar botão ativo na sidebar
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.querySelector(`button[onclick*="${screenId}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    // 4. Carregar dados específicos da tela
    renderizarDados(screenId);
}

function renderizarDados(id) {
    app.updateStats();
    if (id === 'lista-screen') renderizarTabela();
    if (id === 'kanban-screen') renderizarKanban();
    if (id === 'estoque-screen') renderizarEstoque();
    if (id === 'financeiro-screen') renderizarFinanceiro();
    if (id === 'cadastro-screen') atualizarSelectPecas();
}

// --- FUNÇÃO SAIR ---
function confirmarSair() {
    if (confirm("Deseja realmente encerrar a sessão?")) {
        localStorage.removeItem('SAD_USER_NAME'); // Opcional: manter ou não o nome
        location.reload();
    }
}

// --- GESTÃO DE ORDENS (CADASTRO) ---
const serviceForm = document.getElementById('serviceForm') || document.getElementById('os-form');
if (serviceForm) {
    serviceForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const pecaId = document.getElementById('os-peca-usada')?.value;
        let custoPeca = 0;

        if (pecaId) {
            const idx = estoque.findIndex(p => p.id == pecaId);
            if (idx !== -1 && estoque[idx].qtd > 0) {
                estoque[idx].qtd--;
                custoPeca = parseFloat(estoque[idx].preco);
                localStorage.setItem('SAD_PRO_STOCK', JSON.stringify(estoque));
            }
        }

        const novaOS = {
            id: Math.floor(1000 + Math.random() * 9000),
            cliente: document.getElementById('cli-nome').value,
            cpf: document.getElementById('cli-cpf').value,
            aparelho: document.getElementById('apa-nome').value,
            defeito: document.getElementById('apa-defeito').value,
            data: new Date().toLocaleDateString('pt-BR'),
            valor: parseFloat(document.getElementById('os-maodeobra')?.value || 0),
            pagamento: document.getElementById('os-pagamento').value,
            custoPeca: custoPeca,
            status: 'Pendente',
            logs: [{ data: new Date().toLocaleString(), texto: "Ordem de serviço aberta." }]
        };

        ordens.push(novaOS);
        localStorage.setItem('SAD_PRO_OS', JSON.stringify(ordens));
        
        alert(`OS #${novaOS.id} criada com sucesso!`);
        this.reset();
        showScreen('lista-screen');
    });
}

// --- RENDERIZADORES DE TELAS ---

function renderizarTabela() {
    const tbody = document.getElementById('table-body');
    if (!tbody) return;
    tbody.innerHTML = ordens.slice().reverse().map(os => `
        <tr onclick="abrirDetalhes(${os.id})" style="cursor:pointer" class="animate-in">
            <td>#${os.id}</td>
            <td><b>${os.cliente}</b></td>
            <td>${os.aparelho}</td>
            <td><span class="status-badge status-${os.status.toLowerCase()}">${os.status}</span></td>
            <td>
                <button onclick="event.stopPropagation(); excluirOS(${os.id})" class="btn-del">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="5">Nenhuma ordem encontrada.</td></tr>';
}

function renderizarKanban() {
    const cols = {
        'Pendente': document.getElementById('cards-pendente'),
        'Análise': document.getElementById('cards-analise'),
        'Concluído': document.getElementById('cards-concluido')
    };
    Object.values(cols).forEach(c => { if(c) c.innerHTML = ''; });

    ordens.forEach(os => {
        const card = document.createElement('div');
        card.className = 'kanban-card animate-in';
        card.dataset.id = os.id;
        card.innerHTML = `<b>#${os.id} - ${os.cliente}</b><br><small>${os.aparelho}</small>`;
        card.onclick = () => abrirDetalhes(os.id);
        if (cols[os.status]) cols[os.status].appendChild(card);
    });
}

function renderizarEstoque() {
    const tbody = document.getElementById('inventory-table-body');
    if (!tbody) return;
    tbody.innerHTML = estoque.map(p => `
        <tr>
            <td>${p.nome}</td>
            <td>${p.qtd} un</td>
            <td>R$ ${parseFloat(p.preco).toFixed(2)}</td>
            <td><button class="btn-del" onclick="removerPeca(${p.id})"><i class="fas fa-times"></i></button></td>
        </tr>
    `).join('');
}

function renderizarFinanceiro() {
    let bruto = 0, custo = 0;
    const tbody = document.getElementById('fin-table-body');
    const concluidos = ordens.filter(os => os.status === 'Concluído');

    tbody.innerHTML = concluidos.map(os => {
        const taxa = os.pagamento === 'credito' ? os.valor * 0.05 : (os.pagamento === 'debito' ? os.valor * 0.02 : 0);
        const lucro = os.valor - os.custoPeca - taxa;
        bruto += os.valor;
        custo += (os.custoPeca + taxa);
        
        return `<tr>
            <td>#${os.id}</td>
            <td>${os.cliente}</td>
            <td>R$ ${os.valor.toFixed(2)}</td>
            <td style="color:red">- R$ ${(os.custoPeca + taxa).toFixed(2)}</td>
            <td style="color:green; font-weight:bold">R$ ${lucro.toFixed(2)}</td>
        </tr>`;
    }).join('') || '<tr><td colspan="5">Nenhum serviço concluído.</td></tr>';

    document.getElementById('fin-bruto').innerText = `R$ ${bruto.toFixed(2)}`;
    document.getElementById('fin-custo').innerText = `R$ ${custo.toFixed(2)}`;
    document.getElementById('fin-lucro').innerText = `R$ ${(bruto - custo).toFixed(2)}`;
}

// --- FUNÇÕES DE APOIO ---

function mudarStatusOS(id, novoStatus) {
    const idx = ordens.findIndex(o => o.id == id);
    if (idx !== -1) {
        ordens[idx].status = novoStatus;
        ordens[idx].logs.push({ data: new Date().toLocaleString(), texto: `Status alterado para ${novoStatus}` });
        localStorage.setItem('SAD_PRO_OS', JSON.stringify(ordens));
        app.updateStats();
    }
}

function excluirOS(id) {
    if (confirm("Excluir esta OS permanentemente?")) {
        ordens = ordens.filter(o => o.id != id);
        localStorage.setItem('SAD_PRO_OS', JSON.stringify(ordens));
        renderizarTabela();
        app.updateStats();
    }
}

function atualizarSelectPecas() {
    const select = document.getElementById('os-peca-usada');
    if (!select) return;
    select.innerHTML = '<option value="">Selecione uma peça...</option>' + 
        estoque.map(p => `<option value="${p.id}">${p.nome} (${p.qtd} em estoque)</option>`).join('');
}

function toggleTheme() {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');
    localStorage.setItem('SAD_PRO_THEME', isLight ? 'light' : 'dark');
}
