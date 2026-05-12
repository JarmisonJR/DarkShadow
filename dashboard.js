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
        });
    }

    renderizarBoasVindas() {
        const welcomeElement = document.getElementById('welcome-text');
        if (welcomeElement) {
            welcomeElement.innerText = `Bem-vindo, Técnico ${this.usuarioNome}!`;
        }
    }
}

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

    if (id === 'lista-screen') renderTable();
    if (id === 'estoque-screen') renderInventory();
    if (id === 'financeiro-screen') renderFinanceiro();
    if (id === 'kanban-screen') renderKanban();
    if (id === 'cadastro-screen') popularSelectPecas(); // Popular peças ao abrir cadastro
    
    updateStats();
}

// --- GESTÃO DE ORDENS (CRUD) ---
const serviceForm = document.getElementById('serviceForm');
if (serviceForm) {
    serviceForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const checklist = [];
        document.querySelectorAll('.os-check:checked').forEach(el => checklist.push(el.value));

        const pecaId = document.getElementById('os-peca-usada').value;
        let custoPecaSelecionada = 0;

        // Lógica de Baixa no Estoque e Captura de Custo
        if (pecaId) {
            let estoque = JSON.parse(localStorage.getItem('SAD_PRO_STOCK') || '[]');
            const index = estoque.findIndex(p => p.id == pecaId);
            
            if (index !== -1 && estoque[index].qtd > 0) {
                custoPecaSelecionada = parseFloat(estoque[index].preco);
                estoque[index].qtd -= 1; // Baixa automática
                localStorage.setItem('SAD_PRO_STOCK', JSON.stringify(estoque));
            }
        }

        const novaOS = {
            id: Math.floor(100 + Math.random() * 899),
            cliente: document.getElementById('cli-nome').value,
            aparelho: document.getElementById('apa-nome').value,
            defeito: document.getElementById('apa-defeito').value,
            data: document.getElementById('apa-data').value,
            maodeobra: document.getElementById('os-maodeobra').value || 0,
            idPeca: pecaId,
            custoPeca: custoPecaSelecionada,
            checklist: checklist,
            status: 'Pendente'
        };

        let osList = JSON.parse(localStorage.getItem('SAD_PRO_OS') || '[]');
        osList.push(novaOS);
        localStorage.setItem('SAD_PRO_OS', JSON.stringify(osList));

        this.reset();
        openConfirm("Ordem Registrada", "A ordem foi salva e o estoque atualizado!", () => showScreen('lista-screen'), "Ver Lista");
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
                <span class="status-badge ${os.status === 'Pendente' ? 'status-pendente' : (os.status === 'Análise' ? 'status-analise' : 'status-concluido')}" 
                      onclick="mudarStatusKanban(${os.id}, 'Análise')" style="cursor:pointer">
                    ${os.status}
                </span>
            </td>
            <td>
                <div style="display: flex; gap: 8px;">
                    <button onclick="notificarWhatsApp('${os.cliente}', '${os.aparelho}', '${os.id}')" class="btn-del" style="color: #25d366; border-color: #25d366;" title="WhatsApp"><i class="fab fa-whatsapp"></i></button>
                    <button onclick="gerarRecibo(${os.id})" class="btn-del" style="color: #3b82f6; border-color: #3b82f6;" title="PDF"><i class="fas fa-file-pdf"></i></button>
                    <button onclick="confirmarExclusao(${os.id})" class="btn-del"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
}

// --- FINANCEIRO (CÁLCULO DE LUCRO LÍQUIDO) ---
function renderFinanceiro() {
    const osList = JSON.parse(localStorage.getItem('SAD_PRO_OS') || '[]');
    const tbody = document.getElementById('fin-table-body');
    if (!tbody) return;
    
    let faturamentoBruto = 0;
    let custoTotalPecas = 0;

    const concluídos = osList.filter(os => os.status === 'Concluído');

    tbody.innerHTML = concluídos.map(os => {
        const maoDeObra = parseFloat(os.maodeobra || 0);
        const custoPeca = parseFloat(os.custoPeca || 0);
        
        faturamentoBruto += maoDeObra;
        custoTotalPecas += custoPeca;
        
        return `
            <tr>
                <td>#${os.id}</td>
                <td>${os.cliente}</td>
                <td>R$ ${maoDeObra.toFixed(2)}</td>
                <td style="color: #ef4444;">R$ ${custoPeca.toFixed(2)}</td>
                <td style="color: #10b981; font-weight: bold;">R$ ${maoDeObra.toFixed(2)}</td>
            </tr>
        `;
    }).join('') || '<tr><td colspan="5" style="text-align:center; padding:20px;">Nenhum serviço faturado.</td></tr>';

    const lucroLiquido = faturamentoBruto - custoTotalPecas;
    document.getElementById('fin-bruto').innerText = `R$ ${faturamentoBruto.toFixed(2)}`;
    document.getElementById('fin-custo').innerText = `R$ ${custoTotalPecas.toFixed(2)}`;
    document.getElementById('fin-lucro').innerText = `R$ ${lucroLiquido.toFixed(2)}`;
}

// --- KANBAN ---
function renderKanban() {
    const osList = JSON.parse(localStorage.getItem('SAD_PRO_OS') || '[]');
    const areas = {
        'Pendente': document.getElementById('cards-pendente'),
        'Análise': document.getElementById('cards-analise'),
        'Concluído': document.getElementById('cards-concluido')
    };

    Object.values(areas).forEach(a => { if(a) a.innerHTML = ''; });

    osList.forEach(os => {
        const card = `
            <div class="kanban-card animate-in">
                <div style="display: flex; justify-content: space-between;">
                    <b>#${os.id}</b>
                    <small>${os.data}</small>
                </div>
                <p style="margin: 8px 0;">${os.cliente} - <b>${os.aparelho}</b></p>
                <div style="display: flex; gap: 4px;">
                    <button onclick="mudarStatusKanban(${os.id}, 'Pendente')" class="btn-del" style="font-size: 9px; width: auto; padding: 2px 4px;">P</button>
                    <button onclick="mudarStatusKanban(${os.id}, 'Análise')" class="btn-del" style="font-size: 9px; width: auto; padding: 2px 4px;">A</button>
                    <button onclick="mudarStatusKanban(${os.id}, 'Concluído')" class="btn-del" style="font-size: 9px; width: auto; padding: 2px 4px;">C</button>
                </div>
            </div>
        `;
        if (areas[os.status]) areas[os.status].innerHTML += card;
    });
}

function mudarStatusKanban(id, novoStatus) {
    let osList = JSON.parse(localStorage.getItem('SAD_PRO_OS') || '[]');
    osList = osList.map(os => {
        if (os.id == id) os.status = novoStatus;
        return os;
    });
    localStorage.setItem('SAD_PRO_OS', JSON.stringify(osList));
    showScreen(document.querySelector('.content-section:not(.hidden)')?.id);
}

// --- GESTÃO DE ESTOQUE ---
function popularSelectPecas() {
    const select = document.getElementById('os-peca-usada');
    if (!select) return;
    const estoque = JSON.parse(localStorage.getItem('SAD_PRO_STOCK') || '[]');
    select.innerHTML = '<option value="">Nenhuma peça (Apenas serviço)</option>';
    estoque.forEach(p => {
        if (p.qtd > 0) select.innerHTML += `<option value="${p.id}">${p.nome} (Estoque: ${p.qtd})</option>`;
    });
}

function abrirModalPeca() {
    document.getElementById('modal-peca')?.classList.remove('hidden');
}

function fecharModalPeca() {
    document.getElementById('modal-peca')?.classList.add('hidden');
    document.getElementById('pecaForm')?.reset();
}

function salvarPecaModal() {
    const nome = document.getElementById('modal-stk-nome').value;
    const qtd = parseInt(document.getElementById('modal-stk-qtd').value) || 0;
    const preco = parseFloat(document.getElementById('modal-stk-preco').value) || 0;
    const novaPeca = { id: Date.now(), nome, categoria: "Geral", qtd, preco };
    let estoque = JSON.parse(localStorage.getItem('SAD_PRO_STOCK') || '[]');
    estoque.push(novaPeca);
    localStorage.setItem('SAD_PRO_STOCK', JSON.stringify(estoque));
    fecharModalPeca();
    renderInventory();
}

function renderInventory() {
    const tbody = document.getElementById('inventory-table-body');
    if (!tbody) return;
    const estoque = JSON.parse(localStorage.getItem('SAD_PRO_STOCK') || '[]');
    tbody.innerHTML = estoque.map(peca => `
        <tr>
            <td><b>${peca.nome}</b></td>
            <td>${peca.categoria}</td>
            <td><span class="status-badge ${peca.qtd <= 2 ? 'status-pendente' : 'status-concluido'}">${peca.qtd} un.</span></td>
            <td style="color: #ffb38a;">R$ ${parseFloat(peca.preco).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
            <td>
                <div style="display: flex; gap: 8px;">
                    <button onclick="ajustarEstoque(${peca.id}, 1)" class="btn-del" style="color:#10b981">+</button>
                    <button onclick="ajustarEstoque(${peca.id}, -1)" class="btn-del">-</button>
                    <button onclick="confirmarExclusaoPeca(${peca.id})" class="btn-del"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="5" style="text-align:center;">Vazio.</td></tr>';
}

function ajustarEstoque(id, mudanca) {
    let estoque = JSON.parse(localStorage.getItem('SAD_PRO_STOCK') || '[]');
    estoque = estoque.map(p => { if (p.id === id) p.qtd = Math.max(0, p.qtd + mudanca); return p; });
    localStorage.setItem('SAD_PRO_STOCK', JSON.stringify(estoque));
    renderInventory();
}

// --- UTILITÁRIOS ---
function notificarWhatsApp(nome, aparelho, id) {
    const msg = window.encodeURIComponent(`Olá ${nome}, a manutenção do seu ${aparelho} (OS #${id}) foi atualizada.`);
    window.open(`https://api.whatsapp.com/send?text=${msg}`, '_blank');
}

function gerarRecibo(id) {
    const os = JSON.parse(localStorage.getItem('SAD_PRO_OS')).find(o => o.id == id);
    const win = window.open('', 'PRINT', 'height=600,width=800');
    win.document.write(`<html><body style="font-family:sans-serif; padding:20px;">
        <h2>RECIBO - #${os.id}</h2><hr>
        <p><b>Cliente:</b> ${os.cliente}</p><p><b>Aparelho:</b> ${os.aparelho}</p>
        <p><b>Valor Mão de Obra:</b> R$ ${parseFloat(os.maodeobra).toFixed(2)}</p>
        <p><b>Checklist:</b> ${os.checklist.join(', ') || 'Nenhum'}</p>
        <hr><center>Technician PRO</center></body></html>`);
    win.print(); win.close();
}

function updateStats() {
    const osList = JSON.parse(localStorage.getItem('SAD_PRO_OS') || '[]');
    const abertas = osList.filter(os => os.status === 'Pendente').length;
    if(document.getElementById('count-open')) document.getElementById('count-open').innerText = abertas;
    if(document.getElementById('count-total')) document.getElementById('count-total').innerText = osList.length;
}

function openConfirm(titulo, msg, acao, textoBtn = "Confirmar") {
    const modal = document.getElementById('custom-confirm');
    const btnSim = document.getElementById('confirm-yes');
    if(!modal || !btnSim) return;
    document.getElementById('confirm-title').innerText = titulo;
    document.getElementById('confirm-message').innerText = msg;
    btnSim.innerText = textoBtn;
    modal.classList.remove('hidden');
    const novoBtn = btnSim.cloneNode(true);
    btnSim.parentNode.replaceChild(novoBtn, btnSim);
    novoBtn.onclick = () => { acao(); closeConfirm(); };
}

function closeConfirm() { document.getElementById('custom-confirm').classList.add('hidden'); }
function atualizarData() { 
    const el = document.getElementById('current-date');
    if(el) el.innerText = new Date().toLocaleDateString('pt-br', {weekday: 'long', day:'numeric', month:'long'}); 
}
function aplicarTemaSalvo() { if(localStorage.getItem('SAD_PRO_THEME') === 'light') document.body.classList.replace('dark-theme', 'light-theme'); }
function confirmarSair() { openConfirm("Sair", "Deseja encerrar a sessão?", () => window.location.href = "index.html"); }
function confirmarExclusao(id) {
    openConfirm("Excluir", "Tem certeza?", () => {
        let os = JSON.parse(localStorage.getItem('SAD_PRO_OS')).filter(o => o.id !== id);
        localStorage.setItem('SAD_PRO_OS', JSON.stringify(os));
        renderTable(); updateStats();
    });
}
function confirmarExclusaoPeca(id) {
    openConfirm("Excluir Peça", "Remover do estoque?", () => {
        let e = JSON.parse(localStorage.getItem('SAD_PRO_STOCK')).filter(p => p.id !== id);
        localStorage.setItem('SAD_PRO_STOCK', JSON.stringify(e));
        renderInventory();
    });
}
function limparBanco() {
    openConfirm("Limpar Tudo", "Apagar todas as ordens?", () => {
        localStorage.removeItem('SAD_PRO_OS');
        renderTable(); updateStats();
    });
}
