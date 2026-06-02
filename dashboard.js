// ==========================================
// CONFIGURAÇÕES E INICIALIZAÇÃO DE DADOS
// ==========================================
let ordens = JSON.parse(localStorage.getItem('tp_ordens')) || [];
let estoque = JSON.parse(localStorage.getItem('tp_estoque')) || [];

document.addEventListener('DOMContentLoaded', () => {
    inicializarRelogio();
    atualizarTodasAsTelas();
    
    // Evento do formulário de Ordem de Serviço
    document.getElementById('serviceForm').addEventListener('submit', salvarOrdemServico);
});

// Relógio e Data do Banner Principal
function inicializarRelogio() {
    const atualizarHorario = () => {
        const agora = new Date();
        document.getElementById('current-time').textContent = agora.toLocaleTimeString('pt-BR');
    };
    setInterval(atualizarHorario, 1000);
    atualizarHorario();

    // Data por extenso
    const opcoes = { day: 'numeric', month: 'long', year: 'numeric' };
    document.getElementById('current-date').textContent = new Date().toLocaleDateString('pt-BR', opcoes);
}

// Salva as alterações no LocalStorage
function atualizarLocalStorage() {
    localStorage.setItem('tp_ordens', JSON.stringify(ordens));
    localStorage.setItem('tp_estoque', JSON.stringify(estoque));
}

function atualizarTodasAsTelas() {
    atualizarStatsDashboard();
    renderizarTabelaOrdens();
    renderizarKanban();
    renderizarEstoque();
    renderizarFinanceiro();
    carregarSelectPecas();
}

// ==========================================
// NAVEGAÇÃO ENTRE TELAS (Single Page Application)
// ==========================================
function showScreen(screenId) {
    // Oculta todas as seções
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.add('hidden');
    });
    
    // Exibe a seção desejada
    document.getElementById(screenId).classList.remove('hidden');
    
    // Atualiza a classe ativa no menu lateral
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Mapeia os cliques para marcar a sidebar corretamente
    const itemMenu = Array.from(document.querySelectorAll('.nav-item')).find(item => {
        return item.getAttribute('onclick').includes(screenId);
    });
    if (itemMenu) itemMenu.classList.add('active');

    // Executa recarregamentos específicos se necessário
    if (screenId === 'home-screen') atualizarStatsDashboard();
    if (screenId === 'kanban-screen') renderizarKanban();
    if (screenId === 'lista-screen') renderizarTabelaOrdens();
    if (screenId === 'estoque-screen') renderizarEstoque();
    if (screenId === 'financeiro-screen') renderizarFinanceiro();
}

// ==========================================
// GESTÃO DE ORDENS DE SERVIÇO (CRUD)
// ==========================================
function salvarOrdemServico(e) {
    e.preventDefault();
    
    const idEdicao = document.getElementById('serviceForm').dataset.editingId;
    const pecaSelect = document.getElementById('os-peca-select');
    const pecaId = pecaSelect.value;
    
    let custoPeca = 0;
    let nomePeca = "";
    
    if (pecaId) {
        const peca = estoque.find(p => p.id === pecaId);
        if (peca) {
            // Se for nova ordem, abate o estoque
            if (!idEdicao) {
                if (peca.qtd <= 0) {
                    alert("Atenção: Peça sem estoque disponível!");
                    return;
                }
                peca.qtd--;
            }
            custoPeca = parseFloat(peca.preco);
            nomePeca = peca.nome;
        }
    }

    const dadosOrdem = {
        cliente: document.getElementById('cli-nome').value,
        whatsapp: document.getElementById('cli-phone').value,
        aparelho: document.getElementById('apa-nome').value,
        defeito: document.getElementById('apa-defeito').value,
        pecaId: pecaId || null,
        pecaNome: nomePeca,
        custoPeca: custoPeca,
        data: document.getElementById('apa-data').value,
        valor: parseFloat(document.getElementById('apa-valor').value),
    };

    if (idEdicao) {
        // Atualizando registro existente
        ordens = ordens.map(o => o.id === parseInt(idEdicao) ? { ...o, ...dadosOrdem } : o);
        delete document.getElementById('serviceForm').dataset.editingId;
    } else {
        // Criando novo registro
        dadosOrdem.id = Date.now();
        dadosOrdem.status = 'PENDENTE'; // Status inicial padrão
        ordens.push(dadosOrdem);
    }

    atualizarLocalStorage();
    atualizarTodasAsTelas();
    document.getElementById('serviceForm').reset();
    showScreen('lista-screen');
}

function renderizarTabelaOrdens() {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';

    ordens.forEach(o => {
        const tr = document.createElement('tr');
        
        let badgeClass = 'badge-pendente';
        if (o.status === 'EM ANDAMENTO') badgeClass = 'badge-andamento';
        if (o.status === 'CONCLUÍDO') badgeClass = 'badge-concluido';

        // Formatando a data de YYYY-MM-DD para DD/MM/YYYY
        const dataFormatada = o.data.split('-').reverse().join('/');

        tr.innerHTML = `
            <td>#${o.id.toString().slice(-4)}</td>
            <td><strong>${o.cliente}</strong><br><small>${o.whatsapp}</small></td>
            <td>${o.aparelho}</td>
            <td>${dataFormatada}</td>
            <td><span class="badge ${badgeClass}">${o.status}</span></td>
            <td>
                <button onclick="editarOrdem(${o.id})" class="btn-acao btn-edit" title="Editar"><i class="fas fa-edit"></i></button>
                <button onclick="deletarOrdem(${o.id})" class="btn-acao btn-delete" title="Excluir"><i class="fas fa-trash-alt"></i></button>
                <button onclick="gerarPDF(${o.id})" class="btn-acao btn-pdf" title="Gerar PDF Recibo"><i class="fas fa-file-pdf"></i></button>
                <button onclick="imprimirEtiqueta(${o.id})" class="btn-acao btn-print" title="Imprimir Etiqueta"><i class="fas fa-tag"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function editarOrdem(id) {
    const ordem = ordens.find(o => o.id === id);
    if (!ordem) return;

    document.getElementById('cli-nome').value = ordem.cliente;
    document.getElementById('cli-phone').value = ordem.whatsapp;
    document.getElementById('apa-nome').value = ordem.aparelho;
    document.getElementById('apa-defeito').value = ordem.defeito;
    document.getElementById('os-peca-select').value = ordem.pecaId || "";
    document.getElementById('apa-data').value = ordem.data;
    document.getElementById('apa-valor').value = ordem.valor;

    // Vincula o ID da edição no formulário
    document.getElementById('serviceForm').dataset.editingId = id;
    showScreen('cadastro-screen');
}

function deletarOrdem(id) {
    abrirConfirmacao("Excluir Ordem", "Tem certeza que deseja apagar permanentemente esta ordem?", () => {
        // Se a ordem usava peça, devolve para o estoque ao deletar
        const ordem = ordens.find(o => o.id === id);
        if (ordem && ordem.pecaId) {
            const peca = estoque.find(p => p.id === ordem.pecaId);
            if (peca) peca.qtd++;
        }
        
        ordens = ordens.filter(o => o.id !== id);
        atualizarLocalStorage();
        atualizarTodasAsTelas();
    });
}

// ==========================================
// DRAG AND DROP - FLUXO KANBAN
// ==========================================
function renderizarKanban() {
    const colPendente = document.querySelector('#col-pendente .kanban-cards');
    const colAndamento = document.querySelector('#col-andamento .kanban-cards');
    const colConcluido = document.querySelector('#col-concluido .kanban-cards');

    colPendente.innerHTML = '';
    colAndamento.innerHTML = '';
    colConcluido.innerHTML = '';

    ordens.forEach(o => {
        const card = document.createElement('div');
        card.className = 'kanban-card';
        card.draggable = true;
        card.id = `card-${o.id}`;
        card.ondragstart = drag;
        
        card.innerHTML = `
            <h4>${o.aparelho}</h4>
            <p><strong>Cli:</strong> ${o.cliente}</p>
            <p><small><i class="far fa-clock"></i> ${o.data.split('-').reverse().join('/')}</small></p>
            <div style="margin-top:8px; text-align:right"><strong>R$ ${o.valor.toFixed(2)}</strong></div>
        `;

        if (o.status === 'PENDENTE') colPendente.appendChild(card);
        else if (o.status === 'EM ANDAMENTO') colAndamento.appendChild(card);
        else if (o.status === 'CONCLUÍDO') colConcluido.appendChild(card);
    });
}

function allowDrop(ev) {
    ev.preventDefault();
}

function drag(ev) {
    ev.dataTransfer.setData("text", ev.target.id);
}

function drop(ev) {
    ev.preventDefault();
    const data = ev.dataTransfer.getData("text");
    const cardElement = document.getElementById(data);
    
    // Encontra a coluna destino baseada no local do drop
    let targetColumn = ev.target;
    while (targetColumn && !targetColumn.classList.contains('kanban-column')) {
        targetColumn = targetColumn.parentElement;
    }
    
    if (targetColumn) {
        targetColumn.querySelector('.kanban-cards').appendChild(cardElement);
        const ordemId = parseInt(data.replace('card-', ''));
        
        // Define o novo status de acordo com a coluna mapeada
        let novoStatus = 'PENDENTE';
        if (targetColumn.id === 'col-andamento') novoStatus = 'EM ANDAMENTO';
        if (targetColumn.id === 'col-concluido') novoStatus = 'CONCLUÍDO';
        
        // Atualiza no array principal
        ordens = ordens.map(o => o.id === ordemId ? { ...o, status: novoStatus } : o);
        atualizarLocalStorage();
        atualizarStatsDashboard();
    }
}

// ==========================================
// ESTOQUE DE PEÇAS
// ==========================================
function abrirModalPeca() {
    document.getElementById('modal-peca').classList.remove('hidden');
}

function fecharModalPeca() {
    document.getElementById('modal-peca').classList.add('hidden');
    document.getElementById('pecaForm').reset();
}

function salvarPecaModal() {
    const novaPeca = {
        id: 'p-' + Date.now(),
        nome: document.getElementById('modal-stk-nome').value,
        qtd: parseInt(document.getElementById('modal-stk-qtd').value),
        preco: parseFloat(document.getElementById('modal-stk-preco').value),
        whatsappFornecedor: document.getElementById('modal-stk-fone').value
    };

    estoque.push(novaPeca);
    atualizarLocalStorage();
    atualizarTodasAsTelas();
    fecharModalPeca();
}

function renderizarEstoque() {
    const tbody = document.getElementById('stock-body');
    if(!tbody) return;
    tbody.innerHTML = '';

    estoque.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${p.nome}</strong></td>
            <td style="text-align: center;">
                <button onclick="alterarQtdEstoque('${p.id}', -1)" class="btn-qtd">-</button>
                <span style="margin: 0 10px; font-weight:bold">${p.qtd}</span>
                <button onclick="alterarQtdEstoque('${p.id}', 1)" class="btn-qtd">+</button>
            </td>
            <td>R$ ${p.preco.toFixed(2)}</td>
            <td>
                <button onclick="deletarPeca('${p.id}')" class="btn-acao btn-delete" title="Remover Peça"><i class="fas fa-trash-alt"></i></button>
                ${p.whatsappFornecedor ? `<a href="https://wa.me/${p.whatsappFornecedor.replace(/\D/g,'')}" target="_blank" class="btn-acao btn-whatsapp" style="display:inline-block; padding: 4px 8px; background:#25d366; color:#fff; border-radius:4px" title="Pedir Fornecedor"><i class="fab fa-whatsapp"></i></a>` : ''}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function alterarQtdEstoque(id, delta) {
    estoque = estoque.map(p => {
        if(p.id === id) {
            const novaQtd = p.qtd + delta;
            return { ...p, qtd: novaQtd >= 0 ? novaQtd : 0 };
        }
        return p;
    });
    atualizarLocalStorage();
    atualizarTodasAsTelas();
}

function deletarPeca(id) {
    estoque = estoque.filter(p => p.id !== id);
    atualizarLocalStorage();
    atualizarTodasAsTelas();
}

function carregarSelectPecas() {
    const select = document.getElementById('os-peca-select');
    if(!select) return;
    
    // Mantém a primeira opção padrão
    select.innerHTML = '<option value="">Nenhuma peça selecionada (Opcional)</option>';
    
    estoque.forEach(p => {
        if(p.qtd > 0) {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = `${p.nome} (Qtd: ${p.qtd} | R$ ${p.preco.toFixed(2)})`;
            select.appendChild(opt);
        }
    });
}

// ==========================================
// FLUXO FINANCEIRO & ESTATÍSTICAS
// ==========================================
function atualizarStatsDashboard() {
    const abertas = ordens.filter(o => o.status !== 'CONCLUÍDO').length;
    const concluidas = ordens.filter(o => o.status === 'CONCLUÍDO').length;
    
    document.getElementById('stat-pendente').textContent = abertas;
    document.getElementById('stat-total').textContent = ordens.length;
    document.getElementById('stat-concluido').textContent = concluidas;
}

function renderizarFinanceiro() {
    const tbody = document.getElementById('finance-body');
    if(!tbody) return;
    tbody.innerHTML = '';

    let totalEntradas = 0;
    let totalCustos = 0;

    // Processa Ordens Concluídas como Entradas no Caixa
    ordens.forEach(o => {
        if (o.status === 'CONCLUÍDO') {
            totalEntradas += o.valor;
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${o.data.split('-').reverse().join('/')}</td>
                <td>Serviço Executado (OS #${o.id.toString().slice(-4)}) - ${o.cliente}</td>
                <td><span style="color: #2ec4b6; font-weight:bold;">Entrada</span></td>
                <td style="color: #2ec4b6;">+ R$ ${o.valor.toFixed(2)}</td>
            `;
            tbody.appendChild(tr);
        }
        
        // Se a OS utilizou peça, gera registro de saída independente do status da OS (Custo do material)
        if (o.pecaId && o.custoPeca > 0) {
            totalCustos += o.custoPeca;
            const trCusto = document.createElement('tr');
            trCusto.innerHTML = `
                <td>${o.data.split('-').reverse().join('/')}</td>
                <td>Peça Utilizada: ${o.pecaNome} (OS #${o.id.toString().slice(-4)})</td>
                <td><span style="color: #e71d36; font-weight:bold;">Custo</span></td>
                <td style="color: #e71d36;">- R$ ${o.custoPeca.toFixed(2)}</td>
            `;
            tbody.appendChild(trCusto);
        }
    });

    const saldo = totalEntradas - totalCustos;

    // Atualiza cards financeiros da tela
    document.getElementById('fin-entradas').textContent = `R$ ${totalEntradas.toFixed(2)}`;
    document.getElementById('fin-saidas').textContent = `R$ ${totalCustos.toFixed(2)}`;
    
    const saldoTxt = document.getElementById('fin-saldo');
    saldoTxt.textContent = `R$ ${saldo.toFixed(2)}`;
    saldoTxt.style.color = saldo >= 0 ? '#2ec4b6' : '#e71d36';
}

// ==========================================
// MODAL DE CONFIRMAÇÃO CUSTOMIZADO
// ==========================================
let confirmCallback = null;

function abrirConfirmacao(titulo, mensagem, callback) {
    document.getElementById('confirm-title').textContent = titulo;
    document.getElementById('confirm-message').textContent = mensagem;
    document.getElementById('custom-confirm').classList.remove('hidden');
    confirmCallback = callback;
    
    // Vincula a ação de confirmação ao botão SIM
    document.getElementById('confirm-yes').onclick = () => {
        if(confirmCallback) confirmCallback();
        closeConfirm();
    };
}

function closeConfirm() {
    document.getElementById('custom-confirm').classList.add('hidden');
    confirmCallback = null;
}

function limparBanco() {
    abrirConfirmacao("Limpar Banco de Dados", "Isto apagará permanentemente todos os registros do sistema. Continuar?", () => {
        localStorage.clear();
        ordens = [];
        estoque = [];
        atualizarTodasAsTelas();
        showScreen('home-screen');
    });
}

function confirmarSair() {
    abrirConfirmacao("Sair do Sistema", "Deseja encerrar a sessão atual?", () => {
        alert("Sessão finalizada com sucesso!");
        // Aqui você poderia redirecionar para uma tela de login real.
    });
}

// ==========================================
// IMPRESSÕES E EXPORTAÇÃO (PDF e Etiquetas)
// ==========================================
function gerarPDF(id) {
    const ordem = ordens.find(o => o.id === id);
    if (!ordem) return;

    const dataFormatada = ordem.data.split('-').reverse().join('/');
    const conteudo = `
        <p><strong>Código da OS:</strong> #${ordem.id}</p>
        <p><strong>Cliente:</strong> ${ordem.cliente}</p>
        <p><strong>WhatsApp:</strong> ${ordem.whatsapp}</p>
        <p><strong>Equipamento / Aparelho:</strong> ${ordem.aparelho}</p>
        <p><strong>Defeito Constatado:</strong> ${ordem.defeito}</p>
        <p><strong>Peça Substituída:</strong> ${ordem.pecaNome || 'Nenhuma'}</p>
        <p><strong>Data de Entrada:</strong> ${dataFormatada}</p>
        <h3 style="margin-top: 30px; color: #155e63">VALOR TOTAL: R$ ${ordem.valor.toFixed(2)}</h3>
    `;

    document.getElementById('pdf-content').innerHTML = conteudo;
    
    const elemento = document.getElementById('pdf-inner');
    const container = document.getElementById('pdf-template');
    
    // Torna visível temporariamente para a captura da biblioteca html2pdf
    container.style.display = 'block';

    const opcoes = {
        margin: 10,
        filename: `OS_PRO_${ordem.id}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().from(elemento).set(opcoes).save().then(() => {
        container.style.display = 'none';
    });
}

function imprimirEtiqueta(id) {
    const ordem = ordens.find(o => o.id === id);
    if (!ordem) return;

    const conteudo = `
        <strong>OS: #${ordem.id.toString().slice(-4)}</strong><br>
        <strong>Cli:</strong> ${ordem.cliente}<br>
        <strong>Apar:</strong> ${ordem.aparelho}<br>
        <span style="font-size:0.8rem">Def: ${ordem.defeito.slice(0, 40)}...</span>
    `;

    document.getElementById('etiqueta-content').innerHTML = conteudo;
    document.getElementById('etiqueta-data').textContent = ordem.data.split('-').reverse().join('/');

    const originalBody = document.body.innerHTML;
    const templateEtiqueta = document.getElementById('etiqueta-template').outerHTML;

    // Altera o body inteiro para o modo de impressão focado na etiqueta de 80mm
    document.body.innerHTML = `
        <style>
            body { background: white; color: black; padding: 0; margin: 0; }
            #etiqueta-template { display: block !important; margin: 0 auto; }
            @page { size: 80mm auto; margin: 0; }
        </style>
        ${templateEtiqueta}
    `;
    
    window.print();
    
    // Restaura a aplicação original após a janela de impressão ser fechada
    document.body.innerHTML = originalBody;
    
    // Força recarregamento de scripts e eventos
    window.location.reload();
}
