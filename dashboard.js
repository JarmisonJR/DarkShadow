/**
 * TECHNICIAN PRO - Core Engine
 * Organizado por: Navegação, OS, Kanban, Financeiro, Estoque e WhatsApp
 */

// --- NAVEGAÇÃO E ESTADO GLOBAL ---
function showScreen(screenId) {
    // 1. Esconde todas as seções
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.add('hidden');
    });

    // 2. Remove destaque de todos os itens do menu
    document.querySelectorAll('.nav-item').forEach(item => {
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
const saveOS = (data) => {
    localStorage.setItem('SAD_PRO_OS', JSON.stringify(data));
    updateStats();
};

// --- FUNÇÃO WHATSAPP ---
function enviarWhatsApp(id) {
    const os = getOS().find(o => o.id == id);
    if (!os || !os.telefone) {
        alert("Número de telefone não encontrado para este cliente!");
        return;
    }

    const numeroLimpo = os.telefone.replace(/\D/g, '');
    const mensagem = `Olá ${os.cliente}! 👋%0A%0A` +
                     `Passando para informar o status do seu aparelho (*${os.aparelho}*).%0A` +
                     `Ordem de Serviço: *#${os.id}*%0A` +
                     `Status Atual: *${os.status}*%0A%0A` +
                     `Valor: R$ ${os.valor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;

    const url = `https://wa.me/55${numeroLimpo}?text=${mensagem}`;
    window.open(url, '_blank');
}

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
}

// --- CONFIRMAÇÃO DE EXCLUSÃO PERSONALIZADA ---
function excluirOS(id) {
    const modal = document.getElementById('custom-confirm');
    const btnYes = document.getElementById('confirm-yes');
    const msg = document.getElementById('confirm-message');
    
    if(!modal) { // Fallback caso não tenha o modal HTML
        if(confirm("Deseja realmente excluir esta ordem?")) {
            const filtrados = getOS().filter(os => os.id != id);
            saveOS(filtrados);
            renderTable();
        }
        return;
    }

    msg.innerText = "Deseja realmente excluir esta ordem de serviço?";
    modal.classList.remove('hidden');

    const newBtnYes = btnYes.cloneNode(true);
    btnYes.parentNode.replaceChild(newBtnYes, btnYes);

    newBtnYes.onclick = () => {
        const filtrados = getOS().filter(os => os.id != id);
        saveOS(filtrados);
        renderTable();
        closeConfirm();
    };
}

function closeConfirm() {
    const modal = document.getElementById('custom-confirm');
    if(modal) modal.classList.add('hidden');
}

// --- SISTEMA KANBAN (DRAG & DROP) ---
function allowDrop(ev) { ev.preventDefault(); }
function drag(ev, id) { ev.dataTransfer.setData("osId", id); }

function drop(ev) {
    ev.preventDefault();
    const id = ev.dataTransfer.getData("osId");
    const targetCol = ev.currentTarget.id; 

    let novoStatus = 'Pendente';
    if (targetCol === 'col-andamento') novoStatus = 'Em Andamento';
    if (targetCol === 'col-concluido') novoStatus = 'Concluído';

    const osList = getOS().map(os => {
        if (os.id == id) os.status = novoStatus;
        return os;
    });

    saveOS(osList);
    renderKanban();
}

function renderKanban() {
    const columns = {
        'Pendente': document.querySelector('#col-pendente .kanban-cards'),
        'Em Andamento': document.querySelector('#col-andamento .kanban-cards'),
        'Concluído': document.querySelector('#col-concluido .kanban-cards')
    };

    Object.values(columns).forEach(col => { if(col) col.innerHTML = ''; });

    getOS().forEach(os => {
        const card = document.createElement('div');
        card.className = 'kanban-card';
        card.draggable = true;
        card.ondragstart = (e) => drag(e, os.id);
        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <h4>${os.cliente}</h4>
                <button onclick="enviarWhatsApp(${os.id})" style="background:none; border:none; color:#25D366; cursor:pointer; font-size: 1.1rem;">
                    <i class="fab fa-whatsapp"></i>
                </button>
            </div>
            <p>${os.aparelho}</p>
            <div class="kanban-card-footer" style="display:flex; justify-content:space-between; margin-top:10px; font-size:0.8rem;">
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

    if (!nome || !qtd || !preco) return alert("Preencha todos os campos!");

    const estoque = getEstoque();
    estoque.push({
        id: Date.now(),
        nome,
        quantidade: parseInt(qtd),
        preco: parseFloat(preco)
    });

    saveEstoque(estoque);
    fecharModalPeca();
    renderEstoque();
    document.getElementById('pecaForm').reset();
}

function renderEstoque() {
    const tbody = document.getElementById('stock-body'); 
    if (!tbody) return;

    const data = getEstoque();
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center">Estoque vazio</td></tr>';
        return;
    }

    tbody.innerHTML = data.map(peca => `
        <tr>
            <td>${peca.nome}</td>
            <td>${peca.quantidade} un</td>
            <td>R$ ${peca.preco.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
            <td>
                <button onclick="excluirPeca(${peca.id})" class="btn-del"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

function excluirPeca(id) {
    if(confirm("Remover peça do estoque?")) {
        saveEstoque(getEstoque().filter(p => p.id !== id));
        renderEstoque();
    }
}

// --- FINANCEIRO E DASHBOARD ---
function renderFinanceiro() {
    const osList = getOS();
    const estoque = getEstoque();
    const tbody = document.getElementById('finance-body');
    
    let totalEntradas = 0;
    let totalSaidas = 0;

    const entradasHTML = osList.filter(os => os.valor > 0).map(os => {
        totalEntradas += os.valor;
        return `
            <tr>
                <td>${os.data}</td>
                <td>OS #${os.id} - ${os.cliente}</td>
                <td><span class="status-badge status-concluido">Entrada</span></td>
                <td>R$ ${os.valor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
            </tr>
        `;
    }).join('');

    estoque.forEach(p => { totalSaidas += (p.preco * p.quantidade); });

    if(tbody) tbody.innerHTML = entradasHTML || '<tr><td colspan="4" style="text-align:center">Sem movimentações</td></tr>';

    if(document.getElementById('fin-entradas')) document.getElementById('fin-entradas').innerText = `R$ ${totalEntradas.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
    if(document.getElementById('fin-saidas')) document.getElementById('fin-saidas').innerText = `R$ ${totalSaidas.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
    if(document.getElementById('fin-saldo')) document.getElementById('fin-saldo').innerText = `R$ ${(totalEntradas - totalSaidas).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
}

function renderTable() {
    const tbody = document.getElementById('table-body');
    if (!tbody) return;

    const osList = getOS();
    if (osList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">Nenhuma ordem encontrada</td></tr>';
        return;
    }

    tbody.innerHTML = osList.slice().reverse().map(os => {
        const statusClass = os.status === 'Concluído' ? 'status-concluido' : 
                           os.status === 'Em Andamento' ? 'status-andamento' : 'status-pendente';

        return `
            <tr>
                <td>#${os.id}</td>
                <td>${os.cliente}</td>
                <td>${os.aparelho}</td>
                <td>${os.data}</td>
                <td><span class="status-badge ${statusClass}">${os.status}</span></td>
                <td>
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <button onclick="enviarWhatsApp(${os.id})" class="btn-action" title="WhatsApp"><i class="fab fa-whatsapp"></i></button>
                        <button onclick="gerarPDF(${os.id})" class="btn-action" title="PDF"><i class="fas fa-file-pdf"></i></button>
                        <button onclick="excluirOS(${os.id})" class="btn-del" title="Excluir"><i class="fas fa-trash-alt"></i></button>
                    </div>
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

function gerarPDF(id) {
    const os = getOS().find(o => o.id == id);
    if (!os) return;

    const element = document.getElementById('pdf-template');
    const content = document.getElementById('pdf-content');
    
    content.innerHTML = `
        <div style="font-family: sans-serif; color: #333;">
            <h2 style="color: #155e63;">DETALHES DA ORDEM DE SERVIÇO #${os.id}</h2>
            <hr>
            <p><strong>Cliente:</strong> ${os.cliente}</p>
            <p><strong>WhatsApp:</strong> ${os.telefone || 'Não informado'}</p>
            <p><strong>Aparelho:</strong> ${os.aparelho}</p>
            <p><strong>Defeito Relatado:</strong> ${os.defeito}</p>
            <p><strong>Data de Entrada:</strong> ${os.data}</p>
            <p><strong>Status Atual:</strong> ${os.status}</p>
            <h3 style="margin-top: 20px;">Valor Total: R$ ${os.valor.toFixed(2)}</h3>
        </div>
    `;

    element.style.display = 'block';
    const opt = {
        margin: 10,
        filename: `OS_${os.id}_${os.cliente}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
        element.style.display = 'none';
    });
}

function limparBanco() {
    if(confirm("ATENÇÃO: Isso apagará TODAS as ordens e histórico. Deseja continuar?")) {
        localStorage.removeItem('SAD_PRO_OS');
        localStorage.removeItem('SAD_PRO_ESTOQUE');
        location.reload();
    }
}

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('serviceForm');
    if(form) form.addEventListener('submit', handleFormSubmit);
    
    showScreen('home-screen');
    updateStats();
});
