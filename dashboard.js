// --- SISTEMA KANBAN (DRAG & DROP) ---
function allowDrop(ev) { ev.preventDefault(); }

function drag(ev, id) {
    ev.dataTransfer.setData("osId", id);
}

function drop(ev) {
    ev.preventDefault();
    const osId = ev.dataTransfer.getData("osId");
    const targetCol = ev.currentTarget.id; // col-pendente, col-andamento, col-concluido
    
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
    renderTable();
    updateStats();
}

function renderKanban() {
    const columns = {
        'Pendente': document.querySelector('#col-pendente .kanban-cards-area'),
        'Em Andamento': document.querySelector('#col-andamento .kanban-cards-area'),
        'Concluído': document.querySelector('#col-concluido .kanban-cards-area')
    };

    // Limpa colunas
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
            <small>${os.id}</small>
        `;
        
        // Mapeia status para a coluna correta (Garante compatibilidade com termos antigos)
        let statusKey = os.status;
        if (statusKey === 'Pendente' || !columns[statusKey]) statusKey = 'Pendente';
        
        if (columns[statusKey]) columns[statusKey].appendChild(card);
    });
}

// --- SISTEMA FINANCEIRO ---
function renderFinanceiro() {
    const osList = JSON.parse(localStorage.getItem('SAD_PRO_OS') || '[]');
    const tbody = document.getElementById('finance-table-body');
    let entradas = 0;
    
    if (!tbody) return;
    tbody.innerHTML = '';

    osList.forEach(os => {
        if (os.valor > 0) {
            entradas += parseFloat(os.valor);
            tbody.innerHTML += `
                <tr>
                    <td>${os.data}</td>
                    <td>OS #${os.id} - ${os.cliente}</td>
                    <td class="tipo-entrada">Entrada</td>
                    <td>R$ ${parseFloat(os.valor).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                </tr>
            `;
        }
    });

    document.getElementById('fin-entradas').innerText = `R$ ${entradas.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
    document.getElementById('fin-saldo').innerText = `R$ ${entradas.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
}

// --- AÇÕES: WHATSAPP E PDF ---
function enviarWhatsApp(id) {
    const osList = JSON.parse(localStorage.getItem('SAD_PRO_OS') || '[]');
    const os = osList.find(o => o.id == id);
    if (!os || !os.telefone) return alert("Telefone não cadastrado!");

    const msg = window.encodeURIComponent(`Olá ${os.cliente}, aqui é da assistência. Sua ordem #${os.id} (${os.aparelho}) está com status: ${os.status}.`);
    window.open(`https://wa.me/55${os.telefone}?text=${msg}`, '_blank');
}

function gerarPDF(id) {
    const osList = JSON.parse(localStorage.getItem('SAD_PRO_OS') || '[]');
    const os = osList.find(o => o.id == id);
    
    const content = document.getElementById('pdf-content');
    content.innerHTML = `
        <p><strong>Nº Ordem:</strong> #${os.id}</p>
        <p><strong>Cliente:</strong> ${os.cliente}</p>
        <p><strong>Aparelho:</strong> ${os.aparelho}</p>
        <p><strong>Defeito:</strong> ${os.defeito}</p>
        <p><strong>Valor:</strong> R$ ${os.valor || '0,00'}</p>
        <p><strong>Data:</strong> ${os.data}</p>
    `;

    const element = document.getElementById('pdf-template');
    element.style.display = 'block';
    
    html2pdf().from(element).save(`OS_${os.id}_${os.cliente}.pdf`).then(() => {
        element.style.display = 'none';
    });
}

// --- ATUALIZAÇÃO DO RENDER TABLE (Novas Ações) ---
function renderTable() {
    const tbody = document.getElementById('table-body');
    if (!tbody) return;

    let osList = JSON.parse(localStorage.getItem('SAD_PRO_OS') || '[]');
    if (osList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Nenhuma ordem salva.</td></tr>';
        return;
    }

    tbody.innerHTML = [...osList].reverse().map(os => `
        <tr>
            <td>#${os.id}</td>
            <td><b>${os.cliente}</b></td>
            <td>${os.aparelho}<br><small>${os.defeito}</small></td>
            <td>
                <span class="status-badge ${os.status === 'Concluído' ? 'status-concluido' : 'status-pendente'}">
                    ${os.status}
                </span>
            </td>
            <td>
                <button onclick="enviarWhatsApp(${os.id})" class="btn-action btn-whatsapp" title="WhatsApp"><i class="fab fa-whatsapp"></i></button>
                <button onclick="gerarPDF(${os.id})" class="btn-action btn-pdf" title="Gerar PDF"><i class="fas fa-file-pdf"></i></button>
                <button onclick="confirmarExclusao(${os.id})" class="btn-del" title="Excluir"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

// --- ATUALIZAÇÃO DO SUBMIT (Salvando valor e telefone) ---
if (serviceForm) {
    serviceForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const novaOS = {
            id: Math.floor(100 + Math.random() * 899),
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

// --- ATUALIZAÇÃO DA NAVEGAÇÃO ---
const originalShowScreen = showScreen;
showScreen = function(id) {
    originalShowScreen(id);
    if (id === 'kanban-screen') renderKanban();
    if (id === 'financeiro-screen') renderFinanceiro();
}
