// --- CONFIGURAÇÃO INICIAL E NAVEGAÇÃO ---
const serviceForm = document.getElementById('serviceForm');

function showScreen(screenId) {
    // Esconde todas as seções
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.add('hidden');
    });
    
    // Remove a classe active de todos os itens do menu
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });

    // Mostra a seção desejada
    const target = document.getElementById(screenId);
    if (target) target.classList.remove('hidden');

    // Atualiza o estado visual do menu (Mobile e Desktop)
    const activeBtn = document.querySelector(`button[onclick="showScreen('${screenId}')"]`);
    if (activeBtn) activeBtn.classList.add('active');

    // Gatilhos de renderização específica
    if (screenId === 'kanban-screen') renderKanban();
    if (screenId === 'financeiro-screen') renderFinanceiro();
    if (screenId === 'lista-screen') renderTable();
    if (screenId === 'home-screen') updateStats();
    if (screenId === 'estoque-screen') renderEstoque();
}

// --- SISTEMA KANBAN (DRAG & DROP) ---
function allowDrop(ev) { 
    ev.preventDefault(); 
}

function drag(ev, id) {
    ev.dataTransfer.setData("osId", id);
}

function drop(ev) {
    ev.preventDefault();
    const osId = ev.dataTransfer.getData("osId");
    // Busca o ID da coluna (target pode ser a área de cards ou a coluna)
    const targetCol = ev.currentTarget.id; 
    
    let novoStatus = 'Pendente';
    if (targetCol === 'col-andamento') novoStatus = 'Em Andamento';
    if (targetCol === 'col-concluido') novoStatus = 'Concluído';

    alterarStatusOS(osId, novoStatus);
}

function alterarStatusOS(id, novoStatus) {
    let osList = JSON.parse(localStorage.getItem('SAD_PRO_OS') || '[]');
    osList = osList.map(os => {
        if (os.id == id) os.status = novoStatus;
        return os;
    });
    localStorage.setItem('SAD_PRO_OS', JSON.stringify(osList));
    renderKanban();
    updateStats();
}

function renderKanban() {
    const columns = {
        'Pendente': document.querySelector('#col-pendente .kanban-cards-area'),
        'Em Andamento': document.querySelector('#col-andamento .kanban-cards-area'),
        'Concluído': document.querySelector('#col-concluido .kanban-cards-area')
    };

    // Limpa colunas antes de renderizar
    Object.values(columns).forEach(col => { if(col) col.innerHTML = ''; });

    let osList = JSON.parse(localStorage.getItem('SAD_PRO_OS') || '[]');
    
    osList.forEach(os => {
        const card = document.createElement('div');
        card.className = 'kanban-card';
        card.draggable = true;
        card.ondragstart = (e) => drag(e, os.id);
        card.innerHTML = `
            <h4>${os.cliente}</h4>
            <p>${os.aparelho}</p>
            <div class="kanban-card-footer">
                <small>#${os.id}</small>
                <span>R$ ${parseFloat(os.valor || 0).toFixed(2)}</span>
            </div>
        `;
        
        let statusKey = os.status || 'Pendente';
        if (columns[statusKey]) {
            columns[statusKey].appendChild(card);
        } else {
            columns['Pendente'].appendChild(card);
        }
    });
}

// --- SISTEMA FINANCEIRO ---
function renderFinanceiro() {
    const osList = JSON.parse(localStorage.getItem('SAD_PRO_OS') || '[]');
    const tbody = document.getElementById('finance-table-body');
    
    let totalBruto = 0;   // Valor total cobrado dos clientes
    let totalCustos = 0;  // Valor total gasto em peças/insumos
    
    if (!tbody) return;
    tbody.innerHTML = '';

    osList.forEach(os => {
        const valorServico = parseFloat(os.valor) || 0;
        totalBruto += valorServico;

        tbody.innerHTML += `
            <tr>
                <td>${new Date(os.data).toLocaleDateString('pt-BR')}</td>
                <td>OS #${os.id} - ${os.cliente}</td>
                <td><span class="status-badge status-concluido">Serviço</span></td>
                <td>R$ ${valorServico.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
            </tr>
        `;
    });

    let estoque = JSON.parse(localStorage.getItem('SAD_PRO_ESTOQUE') || '[]');
    totalCustos = estoque.reduce((acc, peca) => acc + (parseFloat(peca.precoCusto || 0) * parseInt(peca.quantidade || 0)), 0);

    const lucroLiquido = totalBruto - totalCustos;

    // Atualiza os Cards na tela Financeira
    document.getElementById('fin-entradas').innerText = `R$ ${totalBruto.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
    document.getElementById('fin-saidas').innerText = `R$ ${totalCustos.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
    
    const saldoEl = document.getElementById('fin-saldo');
    saldoEl.innerText = `R$ ${lucroLiquido.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
    
    saldoEl.style.color = lucroLiquido >= 0 ? '#10b981' : '#ef4444';
}

// --- COMUNICAÇÃO E DOCUMENTOS ---
function enviarWhatsApp(id) {
    const osList = JSON.parse(localStorage.getItem('SAD_PRO_OS') || '[]');
    const os = osList.find(o => o.id == id);
    if (!os || !os.telefone) return alert("Telefone não cadastrado!");

    const msg = window.encodeURIComponent(`Olá ${os.cliente}! Sua ordem de serviço #${os.id} (${os.aparelho}) está com o status: ${os.status.toUpperCase()}.`);
    window.open(`https://wa.me/55${os.telefone.replace(/\D/g,'')}?text=${msg}`, '_blank');
}

function gerarPDF(id) {
    const osList = JSON.parse(localStorage.getItem('SAD_PRO_OS') || '[]');
    const os = osList.find(o => o.id == id);
    if(!os) return;

    const content = document.getElementById('pdf-content');
    content.innerHTML = `
        <div style="font-family: sans-serif; color: #333;">
            <p><strong>Nº Ordem:</strong> #${os.id}</p>
            <p><strong>Data de Entrada:</strong> ${os.data}</p>
            <hr>
            <p><strong>Cliente:</strong> ${os.cliente}</p>
            <p><strong>Telefone:</strong> ${os.telefone}</p>
            <p><strong>Aparelho:</strong> ${os.aparelho}</p>
            <p><strong>Defeito Relatado:</strong> ${os.defeito}</p>
            <hr>
            <h2 style="text-align: right;">Total: R$ ${parseFloat(os.valor || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h2>
        </div>
    `;

    const element = document.getElementById('pdf-template');
    element.style.display = 'block';
    
    const opt = {
        margin: 10,
        filename: `Recibo_OS_${os.id}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
        element.style.display = 'none';
    });
}

// --- GESTÃO DE DADOS (TABELA E STORAGE) ---
function renderTable() {
    const tbody = document.getElementById('table-body');
    if (!tbody) return;

    let osList = JSON.parse(localStorage.getItem('SAD_PRO_OS') || '[]');
    if (osList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px;">Nenhuma ordem de serviço encontrada.</td></tr>';
        return;
    }

    tbody.innerHTML = [...osList].reverse().map(os => `
        <tr>
            <td>#${os.id}</td>
            <td><b>${os.cliente}</b></td>
            <td>${os.aparelho}<br><small class="text-muted">${os.defeito}</small></td>
            <td>
                <span class="status-badge ${os.status === 'Concluído' ? 'status-concluido' : (os.status === 'Em Andamento' ? 'status-andamento' : 'status-pendente')}">
                    ${os.status}
                </span>
            </td>
            <td class="actions-cell">
                <button onclick="enviarWhatsApp(${os.id})" class="btn-action" style="color: #25D366" title="WhatsApp"><i class="fab fa-whatsapp"></i></button>
                <button onclick="gerarPDF(${os.id})" class="btn-action" style="color: #FF5722" title="Gerar PDF"><i class="fas fa-file-pdf"></i></button>
                <button onclick="excluirOS(${os.id})" class="btn-del" title="Excluir"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

function updateStats() {
    const osList = JSON.parse(localStorage.getItem('SAD_PRO_OS') || '[]');
    const abertas = osList.filter(os => os.status !== 'Concluído').length;
    
    if(document.getElementById('count-open')) document.getElementById('count-open').innerText = abertas;
    if(document.getElementById('count-total')) document.getElementById('count-total').innerText = osList.length;
    if(document.getElementById('count-urgent')) document.getElementById('count-urgent').innerText = osList.filter(os => os.status === 'Pendente').length;
    
    const dateEl = document.getElementById('current-date');
    if(dateEl) dateEl.innerText = new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function excluirOS(id) {
    if (confirm("Deseja realmente excluir esta ordem?")) {
        let osList = JSON.parse(localStorage.getItem('SAD_PRO_OS') || '[]');
        osList = osList.filter(os => os.id != id);
        localStorage.setItem('SAD_PRO_OS', JSON.stringify(osList));
        renderTable();
        updateStats();
    }
}

function limparBanco() {
    if (confirm("ALERTA: Isso apagará TODOS os dados permanentemente. Continuar?")) {
        localStorage.removeItem('SAD_PRO_OS');
        localStorage.removeItem('SAD_PRO_ESTOQUE');
        renderTable();
        renderEstoque();
        updateStats();
    }
}

// --- SUBMIT DO FORMULÁRIO ---
if (serviceForm) {
    serviceForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const novaOS = {
            id: Math.floor(1000 + Math.random() * 8999), // ID de 4 dígitos
            cliente: document.getElementById('cli-nome').value,
            telefone: document.getElementById('cli-phone').value,
            aparelho: document.getElementById('apa-nome').value,
            defeito: document.getElementById('apa-defeito').value,
            data: document.getElementById('apa-data').value,
            valor: document.getElementById('apa-valor').value || 0,
            status: 'Pendente'
        };

        let osList = JSON.parse(localStorage.getItem('SAD_PRO_OS') || '[]');
        osList.push(novaOS);
        localStorage.setItem('SAD_PRO_OS', JSON.stringify(osList));
        
        this.reset();
        showScreen('lista-screen');
    });
}

// --- SISTEMA DE ESTOQUE (PEÇAS) ---

function abrirModalPeca() {
    const modal = document.getElementById('modal-peca');
    if (modal) {
        modal.classList.remove('hidden');
        document.getElementById('pecaForm').reset();
    }
}

function fecharModalPeca() {
    const modal = document.getElementById('modal-peca');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function salvarPecaModal() {
    const nome = document.getElementById('modal-stk-nome').value;
    const qtd = parseInt(document.getElementById('modal-stk-qtd').value);
    const precoCusto = parseFloat(document.getElementById('modal-stk-preco').value);

    if (!nome || isNaN(qtd) || isNaN(precoCusto)) {
        alert("Preencha todos os campos corretamente.");
        return;
    }

    const novaPeca = {
        id: Date.now(),
        nome: nome,
        quantidade: qtd,
        precoCusto: precoCusto
    };

    let estoque = JSON.parse(localStorage.getItem('SAD_PRO_ESTOQUE') || '[]');
    estoque.push(novaPeca);
    localStorage.setItem('SAD_PRO_ESTOQUE', JSON.stringify(estoque));
    
    fecharModalPeca();
    renderEstoque();
}

function renderEstoque() {
    const tbody = document.getElementById('inventory-table-body');
    if (!tbody) return;

    let estoque = JSON.parse(localStorage.getItem('SAD_PRO_ESTOQUE') || '[]');

    if (estoque.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px;">Nenhuma peça em estoque.</td></tr>';
        return;
    }

    tbody.innerHTML = estoque.map(peca => `
        <tr>
            <td>${peca.nome}</td>
            <td>${peca.quantidade} un</td>
            <td>R$ ${parseFloat(peca.precoCusto).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
            <td>R$ ${(peca.quantidade * peca.precoCusto).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
            <td>
                <button onclick="excluirPeca(${peca.id})" class="btn-del" title="Excluir">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function excluirPeca(id) {
    if (confirm("Deseja remover esta peça do estoque?")) {
        let estoque = JSON.parse(localStorage.getItem('SAD_PRO_ESTOQUE') || '[]');
        estoque = estoque.filter(peca => peca.id !== id);
        localStorage.setItem('SAD_PRO_ESTOQUE', JSON.stringify(estoque));
        renderEstoque();
    }
}

// Inicialização Global
document.addEventListener('DOMContentLoaded', () => {
    updateStats();
});
