/**
 * TECHNICIAN PRO - Core Engine
 * Organizado por: Navegação, OS, Kanban, Financeiro e Estoque
 */

// --- NAVEGAÇÃO E ESTADO GLOBAL ---
function showScreen(screenId) {
    // 1. Esconde todas as seções
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.add('hidden');
    });

    // 2. Remove destaque de todos os itens do menu
    document.querySelectorAll('.sidebar-nav li').forEach(item => {
        item.classList.remove('active');
    });

    // 3. Mostra a seção alvo
    const target = document.getElementById(screenId);
    if (target) {
        target.classList.remove('hidden');
    }

    // 4. Renderização condicional por tela
    switch(screenId) {
        case 'home-screen':      updateStats(); break;
        case 'kanban-screen':    renderKanban(); break;
        case 'lista-screen':     renderTable(); break;
        case 'financeiro-screen': renderFinanceiro(); break;
        case 'estoque-screen':    renderEstoque(); break;
    }
}

// --- GESTÃO DE ORDENS DE SERVIÇO (OS) ---
const getOS = () => JSON.parse(localStorage.getItem('SAD_PRO_OS') || '[]');
const saveOS = (data) => localStorage.setItem('SAD_PRO_OS', JSON.stringify(data));

function handleFormSubmit(e) {
    e.preventDefault();
    const osList = getOS();
    
    const novaOS = {
        id: Math.floor(1000 + Math.random() * 8999),
        cliente: document.getElementById('cli-nome').value,
        telefone: document.getElementById('cli-phone').value,
        aparelho: document.getElementById('apa-nome').value,
        defeito: document.getElementById('apa-defeito').value,
        data: document.getElementById('apa-data').value,
        valor: parseFloat(document.getElementById('apa-valor').value || 0),
        status: 'Pendente'
    };

    osList.push(novaOS);
    saveOS(osList);
    
    e.target.reset();
    showScreen('lista-screen');
    updateStats();
}

function excluirOS(id) {
    if (confirm("Deseja realmente excluir esta ordem?")) {
        const filtrados = getOS().filter(os => os.id != id);
        saveOS(filtrados);
        renderTable();
        updateStats();
    }
}

// --- SISTEMA KANBAN (DRAG & DROP) ---
function allowDrop(ev) { ev.preventDefault(); }

function drag(ev, id) { ev.dataTransfer.setData("osId", id); }

function drop(ev) {
    ev.preventDefault();
    const id = ev.dataTransfer.getData("osId");
    const targetCol = ev.currentTarget.id; // Ex: col-andamento

    let novoStatus = 'Pendente';
    if (targetCol === 'col-andamento') novoStatus = 'Em Andamento';
    if (targetCol === 'col-concluido') novoStatus = 'Concluído';

    const osList = getOS().map(os => {
        if (os.id == id) os.status = novoStatus;
        return os;
    });

    saveOS(osList);
    renderKanban();
    updateStats();
}

function renderKanban() {
    const columns = {
        'Pendente': document.querySelector('#col-pendente .kanban-cards'),
        'Em Andamento': document.querySelector('#col-andamento .kanban-cards'),
        'Concluído': document.querySelector('#col-concluido .kanban-cards')
    };

    // Limpa as colunas
    Object.values(columns).forEach(col => { if(col) col.innerHTML = ''; });

    getOS().forEach(os => {
        const card = document.createElement('div');
        card.className = 'kanban-card';
        card.draggable = true;
        card.ondragstart = (e) => drag(e, os.id);
        card.innerHTML = `
            <h4>${os.cliente}</h4>
            <p>${os.aparelho}</p>
            <div class="kanban-card-footer">
                <small>#${os.id}</small>
                <strong>R$ ${os.valor.toFixed(2)}</strong>
            </div>
        `;
        if (columns[os.status]) columns[os.status].appendChild(card);
    });
}

// --- SISTEMA DE ESTOQUE ---
const getEstoque = () => JSON.parse(localStorage.getItem('SAD_PRO_ESTOQUE') || '[]');
const saveEstoque = (data) => localStorage.setItem('SAD_PRO_ESTOQUE', JSON.stringify(data));

function abrirModalPeca() {
    document.getElementById('modal-peca').classList.remove('hidden');
}

function fecharModalPeca() {
    document.getElementById('modal-peca').classList.add('hidden');
}

function salvarPecaModal() {
    const nome = document.getElementById('modal-stk-nome').value;
    const qtd = document.getElementById('modal-stk-qtd').value;
    const preco = document.getElementById('modal-stk-preco').value;

    if (!nome || !qtd || !preco) return alert("Preencha tudo!");

    const estoque = getEstoque();
    estoque.push({
        id: Date.now(),
        nome,
        quantidade: parseInt(qtd),
        preco: parseFloat(preco),
        categoria: "Geral"
    });

    saveEstoque(estoque);
    fecharModalPeca();
    renderEstoque();
}

function renderEstoque() {
    const tbody = document.getElementById('stock-body'); // Corrigido ID para bater com o HTML anterior
    if (!tbody) return;

    const data = getEstoque();
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4">Estoque vazio</td></tr>';
        return;
    }

    tbody.innerHTML = data.map(peca => `
        <tr>
            <td>${peca.nome}</td>
            <td>${peca.quantidade} un</td>
            <td>R$ ${peca.preco.toLocaleString('pt-BR')}</td>
            <td>
                <button onclick="excluirPeca(${peca.id})" class="btn-del"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

function excluirPeca(id) {
    if(confirm("Remover peça?")) {
        saveEstoque(getEstoque().filter(p => p.id !== id));
        renderEstoque();
    }
}

// --- FINANCEIRO E DASHBOARD ---
function renderFinanceiro() {
    const osList = getOS();
    const tbody = document.getElementById('finance-body');
    let total = 0;

    if(!tbody) return;
    tbody.innerHTML = osList.filter(os => os.valor > 0).map(os => {
        total += os.valor;
        return `
            <tr>
                <td>${os.data}</td>
                <td>OS #${os.id} - ${os.cliente}</td>
                <td><span class="status-badge status-concluido">Entrada</span></td>
                <td>R$ ${os.valor.toLocaleString('pt-BR')}</td>
            </tr>
        `;
    }).join('');

    document.getElementById('fin-entradas').innerText = `R$ ${total.toLocaleString('pt-BR')}`;
    document.getElementById('fin-saldo').innerText = `R$ ${total.toLocaleString('pt-BR')}`;
}

// Dentro da função renderTable no seu JS:
function renderTable() {
    const tbody = document.getElementById('table-body');
    const osList = getOS();

    tbody.innerHTML = osList.map(os => {
        // Define a classe de cor baseada no status
        const statusClass = os.status === 'Concluído' ? 'status-concluido' : 
                           os.status === 'Em Andamento' ? 'status-andamento' : 'status-pendente';

        return `
            <tr>
                <td>#${os.id}</td>
                <td>${os.cliente}</td>
                <td>${os.aparelho}</td>
                <td><span class="status-badge ${statusClass}">${os.status}</span></td>
                <td>
                    <button onclick="gerarPDF(${os.id})" class="btn-action"><i class="fas fa-file-pdf"></i></button>
                    <button onclick="excluirOS(${os.id})" class="btn-del"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    }).join('');
}

function updateStats() {
    const osList = getOS();
    const abertas = osList.filter(os => os.status !== 'Concluído').length;
    const concluidas = osList.length - abertas;

    if(document.getElementById('stat-total')) document.getElementById('stat-total').innerText = osList.length;
    if(document.getElementById('stat-pendente')) document.getElementById('stat-pendente').innerText = abertas;
    if(document.getElementById('stat-concluido')) document.getElementById('stat-concluido').innerText = concluidas;
    
    const dateEl = document.getElementById('current-date');
    if(dateEl) dateEl.innerText = new Date().toLocaleDateString('pt-BR');
}

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('serviceForm');
    if(form) form.addEventListener('submit', handleFormSubmit);
    
    updateStats();
});
function limparBanco() {
    if(confirm("Isso apagará TODAS as ordens de serviço. Continuar?")) {
        localStorage.removeItem('SAD_PRO_OS');
        location.reload();
    }
}
/* Layout Kanban */
.kanban-container {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
    align-items: start;
}

.kanban-column {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 15px;
    min-height: 500px;
    border: 1px solid #333;
}

.kanban-header {
    font-weight: 700;
    text-transform: uppercase;
    margin-bottom: 15px;
    color: #155e63;
    border-bottom: 2px solid #155e63;
    padding-bottom: 5px;
}

.kanban-card {
    background: #252525;
    border-left: 4px solid #155e63;
    padding: 15px;
    border-radius: 8px;
    margin-bottom: 10px;
    cursor: grab;
    transition: transform 0.2s;
}

.kanban-card:active { cursor: grabbing; }

.kanban-card h4 { margin: 0 0 5px 0; font-size: 1rem; }
.kanban-card p { font-size: 0.85rem; color: #aaa; margin: 0; }

/* Status Badges */
.status-badge {
    padding: 5px 10px;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 600;
}

.status-pendente { background: #ff980033; color: #ff9800; }
.status-andamento { background: #2196f333; color: #2196f3; }
.status-concluido { background: #4caf5033; color: #4caf50; }

/* Financeiro Cards */
.card-entrada { border-bottom: 4px solid #4caf50; }
.card-saida { border-bottom: 4px solid #f44336; }
.card-saldo { border-bottom: 4px solid #2196f3; }

/* Utilitários */
.hidden { display: none !important; }
function gerarPDF(id) {
    const os = getOS().find(o => o.id == id);
    if (!os) return;

    const element = document.getElementById('pdf-template');
    const content = document.getElementById('pdf-content');
    
    content.innerHTML = `
        <p><strong>Ordem de Serviço:</strong> #${os.id}</p>
        <p><strong>Cliente:</strong> ${os.cliente}</p>
        <p><strong>Aparelho:</strong> ${os.aparelho}</p>
        <p><strong>Defeito:</strong> ${os.defeito}</p>
        <p><strong>Valor:</strong> R$ ${os.valor.toFixed(2)}</p>
        <p><strong>Data:</strong> ${os.data}</p>
    `;

    element.style.display = 'block';
    html2pdf().from(element).save(`OS_${os.id}.pdf`).then(() => {
        element.style.display = 'none';
    });
}
