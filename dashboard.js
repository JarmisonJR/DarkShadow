class Dashboard {
    constructor() {
        // Busca o nome salvo ou define o padrão
        this.usuarioNome = localStorage.getItem('SAD_USER_NAME') || "Técnico";
        this.init();
    }

    init() {
        document.addEventListener('DOMContentLoaded', () => {
            this.renderizarBoasVindas();
            
            // Inicializa as outras funções do seu sistema
            showScreen('home-screen');
            atualizarData();
            updateStats();
            aplicarTemaSalvo();
        });
    }

    renderizarBoasVindas() {
        const welcomeElement = document.getElementById('welcome-text');
        if (welcomeElement) {
            welcomeElement.innerText = `Bem-vindo, Técnico ${this.usuarioNome}!`;
        }
    }
}

// Inicia a classe Dashboard
const appDashboard = new Dashboard();

// --- SISTEMA DE NAVEGAÇÃO ---
function showScreen(id) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.add('hidden'));
    
    const mainLayout = document.getElementById('main-layout');
    if (mainLayout) mainLayout.classList.remove('hidden');

    const target = document.getElementById(id);
    if (target) target.classList.remove('hidden');

    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.remove('active');
        const acao = btn.getAttribute('onclick');
        if (acao && acao.includes(id)) {
            btn.classList.add('active');
        }
    });

    // Gatilhos de renderização automática ao trocar de tela
    if (id === 'lista-screen') renderTable();
    if (id === 'estoque-screen') renderInventory();
    
    updateStats();
}

// --- GESTÃO DE ORDENS (CRUD) ---
const serviceForm = document.getElementById('serviceForm');
if (serviceForm) {
    serviceForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const novaOS = {
            id: Math.floor(100 + Math.random() * 899),
            cliente: document.getElementById('cli-nome').value,
            aparelho: document.getElementById('apa-nome').value,
            defeito: document.getElementById('apa-defeito').value,
            data: document.getElementById('apa-data').value,
            status: 'Pendente'
        };

        let osList = JSON.parse(localStorage.getItem('SAD_PRO_OS') || '[]');
        osList.push(novaOS);
        localStorage.setItem('SAD_PRO_OS', JSON.stringify(osList));

        this.reset();
        
        openConfirm(
            "Ordem Registrada", 
            "A ordem de serviço foi salva com sucesso! Deseja ver a lista agora?", 
            () => showScreen('lista-screen'),
            "Ver Lista"
        );
    });
}

function renderTable() {
    const tbody = document.getElementById('table-body');
    if (!tbody) return;

    let osList = JSON.parse(localStorage.getItem('SAD_PRO_OS') || '[]');
    
    if (osList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 40px; color: #71717a;">Nenhuma ordem salva.</td></tr>';
        return;
    }

    tbody.innerHTML = [...osList].reverse().map(os => `
        <tr>
            <td>#${os.id}</td>
            <td><b>${os.cliente}</b></td>
            <td>${os.aparelho}<br><small style="color: #71717a;">${os.defeito}</small></td>
            <td>
                <span class="status-badge ${os.status === 'Pendente' ? 'status-pendente' : 'status-concluido'}" 
                      onclick="toggleStatus(${os.id})" 
                      style="cursor:pointer">
                    ${os.status}
                </span>
            </td>
            <td>
                <button onclick="confirmarExclusao(${os.id})" class="btn-del">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function toggleStatus(id) {
    let osList = JSON.parse(localStorage.getItem('SAD_PRO_OS') || '[]');
    osList = osList.map(os => {
        if (os.id == id) os.status = (os.status === 'Pendente') ? 'Concluído' : 'Pendente';
        return os;
    });
    localStorage.setItem('SAD_PRO_OS', JSON.stringify(osList));
    renderTable();
    updateStats();
}

function confirmarExclusao(id) {
    openConfirm("Apagar Registro?", "Esta ação não pode ser desfeita.", () => {
        let osList = JSON.parse(localStorage.getItem('SAD_PRO_OS') || '[]');
        osList = osList.filter(os => os.id !== id);
        localStorage.setItem('SAD_PRO_OS', JSON.stringify(osList));
        renderTable();
        updateStats();
    }, "Confirmar");
}

function limparBanco() {
    openConfirm(
        "Limpar Todo o Banco?", 
        "Cuidado! Isso apagará permanentemente todas as suas Ordens de Serviço cadastradas.", 
        () => {
            localStorage.removeItem('SAD_PRO_OS');
            renderTable();
            updateStats();
        },
        "Apagar Tudo"
    );
}

// --- GESTÃO DE ESTOQUE (MODAL E TABELA) ---

function abrirModalPeca() {
    const modal = document.getElementById('modal-peca');
    if (modal) {
        modal.classList.remove('hidden');
        document.getElementById('modal-stk-nome').focus();
    }
}

function fecharModalPeca() {
    const modal = document.getElementById('modal-peca');
    if (modal) {
        modal.classList.add('hidden');
        document.getElementById('pecaForm').reset();
    }
}

function salvarPecaModal() {
    const nome = document.getElementById('modal-stk-nome').value;
    const qtd = parseInt(document.getElementById('modal-stk-qtd').value);
    const preco = parseFloat(document.getElementById('modal-stk-preco').value);

    const novaPeca = {
        id: Date.now(),
        nome,
        categoria: "Geral",
        qtd,
        preco
    };

    let estoque = JSON.parse(localStorage.getItem('SAD_PRO_STOCK') || '[]');
    estoque.push(novaPeca);
    localStorage.setItem('SAD_PRO_STOCK', JSON.stringify(estoque));

    fecharModalPeca();
    renderInventory();
    openConfirm("Sucesso", "Peça adicionada ao estoque!", null);
}

function renderInventory() {
    const tbody = document.getElementById('inventory-table-body');
    if (!tbody) return;

    const estoque = JSON.parse(localStorage.getItem('SAD_PRO_STOCK') || '[]');
    
    if (estoque.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 40px; color: #71717a;">Nenhuma peça cadastrada.</td></tr>';
        return;
    }

    tbody.innerHTML = estoque.map(peca => `
        <tr>
            <td><b>${peca.nome}</b></td>
            <td>${peca.categoria}</td>
            <td>
                <span class="status-badge ${peca.qtd <= 2 ? 'status-pendente' : 'status-concluido'}">
                    ${peca.qtd} em estoque
                </span>
            </td>
            <td style="color: #ffb38a;">R$ ${parseFloat(peca.preco).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
            <td style="display: flex; gap: 8px; align-items: center;">
                <button onclick="ajustarEstoque(${peca.id}, 1)" class="btn-del" style="color: #10b981; background: rgba(16, 185, 129, 0.1); border-color: rgba(16, 185, 129, 0.2); width: 30px; height: 30px;">+</button>
                <button onclick="ajustarEstoque(${peca.id}, -1)" class="btn-del" style="background: rgba(255, 255, 255, 0.05); color: #fff; width: 30px; height: 30px;">-</button>
                <button onclick="confirmarExclusaoPeca(${peca.id})" class="btn-del" title="Excluir Peça">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function ajustarEstoque(id, mudanca) {
    let estoque = JSON.parse(localStorage.getItem('SAD_PRO_STOCK') || '[]');
    estoque = estoque.map(peca => {
        if (peca.id === id) {
            const novaQtd = (parseInt(peca.qtd) || 0) + mudanca;
            peca.qtd = novaQtd < 0 ? 0 : novaQtd;
        }
        return peca;
    });
    localStorage.setItem('SAD_PRO_STOCK', JSON.stringify(estoque));
    renderInventory();
}

function confirmarExclusaoPeca(id) {
    openConfirm("Excluir Peça?", "Deseja remover este item do estoque permanentemente?", () => {
        let estoque = JSON.parse(localStorage.getItem('SAD_PRO_STOCK') || '[]');
        estoque = estoque.filter(p => p.id !== id);
        localStorage.setItem('SAD_PRO_STOCK', JSON.stringify(estoque));
        renderInventory();
    });
}

// --- UTILITÁRIOS ---

function openConfirm(titulo, msg, acao, textoBotao = "Confirmar") {
    const modal = document.getElementById('custom-confirm');
    const btnSim = document.getElementById('confirm-yes');
    if(!modal || !btnSim) return;

    document.getElementById('confirm-title').innerText = titulo;
    document.getElementById('confirm-message').innerText = msg;
    btnSim.innerText = textoBotao;
    modal.classList.remove('hidden');

    const novoBtnSim = btnSim.cloneNode(true);
    btnSim.parentNode.replaceChild(novoBtnSim, btnSim);

    novoBtnSim.onclick = () => {
        if (acao) acao();
        closeConfirm();
    };
}

function closeConfirm() {
    const modal = document.getElementById('custom-confirm');
    if (modal) modal.classList.add('hidden');
}

function updateStats() {
    const osList = JSON.parse(localStorage.getItem('SAD_PRO_OS') || '[]');
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    let abertas = 0;
    let urgentes = 0;

    osList.forEach(os => {
        if (os.status === 'Pendente') {
            abertas++;
            const dataPrazo = new Date(os.data);
            dataPrazo.setHours(0, 0, 0, 0);
            if (dataPrazo < hoje) urgentes++;
        }
    });

    if(document.getElementById('count-open')) document.getElementById('count-open').innerText = abertas;
    if(document.getElementById('count-total')) document.getElementById('count-total').innerText = osList.length;
    if(document.getElementById('count-urgent')) document.getElementById('count-urgent').innerText = urgentes;
}

function atualizarData() {
    const el = document.getElementById('current-date');
    if (el) {
        el.innerText = new Date().toLocaleDateString('pt-br', { weekday: 'long', day: 'numeric', month: 'long' });
    }
}

function aplicarTemaSalvo() {
    const saved = localStorage.getItem('SAD_PRO_THEME');
    if (saved === 'light') {
        document.body.classList.replace('dark-theme', 'light-theme');
        const icon = document.getElementById('theme-icon');
        if (icon) icon.classList.replace('fa-moon', 'fa-sun');
    }
}

function confirmarSair() {
    openConfirm(
        "Sair do Sistema", 
        "Deseja realmente encerrar sua sessão atual?", 
        () => { window.location.href = "index.html"; }
    );
}
// Ideia 2: CRM / WhatsApp
function notificarWhatsApp(nome, aparelho, id) {
    const mensagem = window.encodeURIComponent(`Olá ${nome}, o técnico terminou a análise do seu ${aparelho} (OS #${id}). Pode entrar em contato conosco?`);
    window.open(`https://api.whatsapp.com/send?text=${mensagem}`, '_blank');
}

// Ideia 3: Recibo Simples (Simulação antes de usar biblioteca PDF)
function gerarRecibo(id) {
    const osList = JSON.parse(localStorage.getItem('SAD_PRO_OS') || '[]');
    const os = osList.find(o => o.id == id);
    
    const conteudo = `
        TECHNICIAN PRO - RECIBO DE OS #${os.id}
        -----------------------------------
        CLIENTE: ${os.cliente}
        APARELHO: ${os.aparelho}
        DEFEITO: ${os.defeito}
        STATUS: ${os.status}
        DATA: ${os.data}
        -----------------------------------
        Obrigado pela confiança!
    `;
    
    // Abre uma nova janela com o texto para impressão
    const win = window.open('', 'PRINT', 'height=600,width=800');
    win.document.write(`<pre>${conteudo}</pre>`);
    win.print();
    win.close();
}
function renderFinanceiro() {
    const osList = JSON.parse(localStorage.getItem('SAD_PRO_OS') || '[]');
    const tbody = document.getElementById('fin-table-body');
    
    let bruto = 0;
    let custoPecas = 0; // Por enquanto 0, até integrarmos com o estoque

    const html = osList.filter(os => os.status === 'Concluído').map(os => {
        const valorServico = parseFloat(os.maodeobra || 0);
        bruto += valorServico;
        
        return `
            <tr>
                <td>#${os.id}</td>
                <td>${os.cliente}</td>
                <td>R$ ${valorServico.toFixed(2)}</td>
                <td>R$ 0,00</td>
                <td style="color: #10b981;">R$ ${valorServico.toFixed(2)}</td>
            </tr>
        `;
    }).join('');

    if (tbody) tbody.innerHTML = html || '<tr><td colspan="5" style="text-align:center; padding:20px;">Nenhum serviço concluído ainda.</td></tr>';
    
    // Atualiza os cards do topo
    document.getElementById('fin-bruto').innerText = `R$ ${bruto.toFixed(2)}`;
    document.getElementById('fin-lucro').innerText = `R$ ${bruto.toFixed(2)}`; // Lucro = Bruto (sem custo de peças por enquanto)
}

// Atualize sua função showScreen para carregar o financeiro
// No seu showScreen(id):
// if (id === 'financeiro-screen') renderFinanceiro();
function renderKanban() {
    const osList = JSON.parse(localStorage.getItem('SAD_PRO_OS') || '[]');
    
    // Áreas de destino
    const areaPendente = document.getElementById('cards-pendente');
    const areaAnalise = document.getElementById('cards-analise');
    const areaConcluido = document.getElementById('cards-concluido');

    // Limpa as colunas
    areaPendente.innerHTML = '';
    areaAnalise.innerHTML = '';
    areaConcluido.innerHTML = '';

    osList.forEach(os => {
        const card = `
            <div class="kanban-card animate-in">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <b>#${os.id}</b>
                    <small style="color: var(--primary-sunset)">${os.data}</small>
                </div>
                <p style="margin: 10px 0; font-size: 0.9rem;">${os.cliente} - <b>${os.aparelho}</b></p>
                <div style="display: flex; gap: 5px;">
                    <button onclick="mudarStatusKanban(${os.id}, 'Pendente')" class="btn-del" style="font-size: 10px; width: auto; padding: 2px 5px;">P</button>
                    <button onclick="mudarStatusKanban(${os.id}, 'Análise')" class="btn-del" style="font-size: 10px; width: auto; padding: 2px 5px;">A</button>
                    <button onclick="mudarStatusKanban(${os.id}, 'Concluído')" class="btn-del" style="font-size: 10px; width: auto; padding: 2px 5px;">C</button>
                </div>
            </div>
        `;

        if (os.status === 'Pendente') areaPendente.innerHTML += card;
        else if (os.status === 'Análise') areaAnalise.innerHTML += card;
        else if (os.status === 'Concluído') areaConcluido.innerHTML += card;
    });
}

function mudarStatusKanban(id, novoStatus) {
    let osList = JSON.parse(localStorage.getItem('SAD_PRO_OS') || '[]');
    osList = osList.map(os => {
        if (os.id == id) os.status = novoStatus;
        return os;
    });
    localStorage.setItem('SAD_PRO_OS', JSON.stringify(osList));
    renderKanban();
    updateStats();
}
