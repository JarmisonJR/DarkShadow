// ==========================================
// CONFIGURAÇÃO E INICIALIZAÇÃO DO FIREBASE
// ==========================================
// ⚠️ Substitua os valores abaixo pelas credenciais do seu Firebase Console:
 const firebaseConfig = {
    apiKey: "AIzaSyB3gXEcd3wrbM6uEW9-vF2K6uZJB-AekXE",
    authDomain: "technician-fcca6.firebaseapp.com",
    databaseURL: "https://technician-fcca6-default-rtdb.firebaseio.com",
    projectId: "technician-fcca6",
    storageBucket: "technician-fcca6.firebasestorage.app",
    messagingSenderId: "386083159911",
    appId: "1:386083159911:web:d0c16dd63f3cfb8333f9c2",
    measurementId: "G-PBEN839TGE"
  };

// Inicializa o SDK Compat do Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// Variáveis de estado global
let ordens = [];
let estoque = [];

document.addEventListener('DOMContentLoaded', () => {
    inicializarRelogio();
    carregarDadosFirebase();

    const serviceForm = document.getElementById('serviceForm');
    if (serviceForm) {
        serviceForm.addEventListener('submit', salvarOrdemServico);
    }
});

// Relógio e Data do Banner Principal
function inicializarRelogio() {
    const clockElem = document.getElementById('current-time');
    const dateElem = document.getElementById('current-date');

    const atualizarHorario = () => {
        const agora = new Date();
        if (clockElem) clockElem.textContent = agora.toLocaleTimeString('pt-BR');
    };
    setInterval(atualizarHorario, 1000);
    atualizarHorario();

    if (dateElem) {
        const opcoes = { day: 'numeric', month: 'long', year: 'numeric' };
        dateElem.textContent = new Date().toLocaleDateString('pt-BR', opcoes);
    }
}

// ==========================================
// ESCUTA EM TEMPO REAL (FIRESTORE)
// ==========================================
function carregarDadosFirebase() {
    // Sincroniza Coleção de Ordens de Serviço
    db.collection('ordens').onSnapshot(snapshot => {
        ordens = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        atualizarTodasAsTelas();
    }, error => console.error("Erro ao carregar ordens:", error));

    // Sincroniza Coleção de Estoque
    db.collection('estoque').onSnapshot(snapshot => {
        estoque = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        atualizarTodasAsTelas();
    }, error => console.error("Erro ao carregar estoque:", error));
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
// NAVEGAÇÃO SPA (Single Page Application)
// ==========================================
function showScreen(screenId) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.add('hidden');
    });
    
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) targetScreen.classList.remove('hidden');
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const itemMenu = Array.from(document.querySelectorAll('.nav-item')).find(item => {
        const attr = item.getAttribute('onclick');
        return attr && attr.includes(screenId);
    });
    if (itemMenu) itemMenu.classList.add('active');

    if (screenId === 'home-screen') atualizarStatsDashboard();
    if (screenId === 'kanban-screen') renderizarKanban();
    if (screenId === 'lista-screen') renderizarTabelaOrdens();
    if (screenId === 'estoque-screen') renderizarEstoque();
    if (screenId === 'financeiro-screen') renderizarFinanceiro();
}

// ==========================================
// GESTÃO DE ORDENS DE SERVIÇO (CRUD)
// ==========================================
async function salvarOrdemServico(e) {
    e.preventDefault();
    
    const form = document.getElementById('serviceForm');
    const idEdicao = form.dataset.editingId;
    const pecaSelect = document.getElementById('os-peca-select');
    const pecaId = pecaSelect ? pecaSelect.value : "";
    
    let custoPeca = 0;
    let nomePeca = "";
    
    if (pecaId) {
        const peca = estoque.find(p => String(p.id) === String(pecaId));
        if (peca) {
            // Se for nova ordem, abate a peça do estoque
            if (!idEdicao) {
                if (peca.qtd <= 0) {
                    alert("Atenção: Peça sem estoque disponível!");
                    return;
                }
                await db.collection('estoque').doc(peca.id).update({ 
                    qtd: peca.qtd - 1 
                });
            }
            custoPeca = parseFloat(peca.preco || 0);
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
        valor: parseFloat(document.getElementById('apa-valor').value) || 0,
    };

    try {
        if (idEdicao) {
            await db.collection('ordens').doc(idEdicao).update(dadosOrdem);
            delete form.dataset.editingId;
        } else {
            dadosOrdem.status = 'PENDENTE';
            dadosOrdem.criadoEm = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection('ordens').add(dadosOrdem);
        }

        form.reset();
        showScreen('lista-screen');
    } catch (error) {
        console.error("Erro ao salvar ordem:", error);
        alert("Ocorreu um erro ao salvar a Ordem de Serviço.");
    }
}

function renderizarTabelaOrdens() {
    const tbody = document.getElementById('table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    ordens.forEach(o => {
        const tr = document.createElement('tr');
        
        let badgeClass = 'badge-pendente';
        if (o.status === 'EM ANDAMENTO') badgeClass = 'badge-andamento';
        if (o.status === 'CONCLUÍDO') badgeClass = 'badge-concluido';

        const dataFormatada = o.data ? o.data.split('-').reverse().join('/') : 'N/A';
        const displayId = o.id.length > 6 ? o.id.slice(-4) : o.id;

        tr.innerHTML = `
            <td>#${displayId}</td>
            <td><strong>${o.cliente}</strong><br><small>${o.whatsapp}</small></td>
            <td>${o.aparelho}</td>
            <td>${dataFormatada}</td>
            <td><span class="badge ${badgeClass}">${o.status}</span></td>
            <td>
                <button onclick="editarOrdem('${o.id}')" class="btn-acao btn-edit" title="Editar"><i class="fas fa-edit"></i></button>
                <button onclick="deletarOrdem('${o.id}')" class="btn-acao btn-delete" title="Excluir"><i class="fas fa-trash-alt"></i></button>
                <button onclick="gerarPDF('${o.id}')" class="btn-acao btn-pdf" title="Gerar PDF Recibo"><i class="fas fa-file-pdf"></i></button>
                <button onclick="imprimirEtiqueta('${o.id}')" class="btn-acao btn-print" title="Imprimir Etiqueta"><i class="fas fa-tag"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function editarOrdem(id) {
    const ordem = ordens.find(o => String(o.id) === String(id));
    if (!ordem) return;

    document.getElementById('cli-nome').value = ordem.cliente || '';
    document.getElementById('cli-phone').value = ordem.whatsapp || '';
    document.getElementById('apa-nome').value = ordem.aparelho || '';
    document.getElementById('apa-defeito').value = ordem.defeito || '';
    document.getElementById('os-peca-select').value = ordem.pecaId || '';
    document.getElementById('apa-data').value = ordem.data || '';
    document.getElementById('apa-valor').value = ordem.valor || '';

    const form = document.getElementById('serviceForm');
    if (form) form.dataset.editingId = id;
    showScreen('cadastro-screen');
}

function deletarOrdem(id) {
    abrirConfirmacao("Excluir Ordem", "Tem certeza que deseja apagar permanentemente esta ordem?", async () => {
        try {
            const ordem = ordens.find(o => String(o.id) === String(id));
            if (ordem && ordem.pecaId) {
                const peca = estoque.find(p => String(p.id) === String(ordem.pecaId));
                if (peca) {
                    await db.collection('estoque').doc(peca.id).update({ qtd: peca.qtd + 1 });
                }
            }
            await db.collection('ordens').doc(String(id)).delete();
        } catch (error) {
            console.error("Erro ao deletar ordem:", error);
        }
    });
}

// ==========================================
// DRAG AND DROP - KANBAN
// ==========================================
function renderizarKanban() {
    const colPendente = document.querySelector('#col-pendente .kanban-cards');
    const colAndamento = document.querySelector('#col-andamento .kanban-cards');
    const colConcluido = document.querySelector('#col-concluido .kanban-cards');

    if (!colPendente || !colAndamento || !colConcluido) return;

    colPendente.innerHTML = '';
    colAndamento.innerHTML = '';
    colConcluido.innerHTML = '';

    ordens.forEach(o => {
        const card = document.createElement('div');
        card.className = 'kanban-card';
        card.draggable = true;
        card.id = `card-${o.id}`;
        card.ondragstart = drag;
        
        const dataFormatada = o.data ? o.data.split('-').reverse().join('/') : 'N/A';

        card.innerHTML = `
            <h4>${o.aparelho}</h4>
            <p><strong>Cli:</strong> ${o.cliente}</p>
            <p><small><i class="far fa-clock"></i> ${dataFormatada}</small></p>
            <div style="margin-top:8px; text-align:right"><strong>R$ ${Number(o.valor).toFixed(2)}</strong></div>
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

async function drop(ev) {
    ev.preventDefault();
    const data = ev.dataTransfer.getData("text");
    const cardElement = document.getElementById(data);
    
    let targetColumn = ev.target;
    while (targetColumn && !targetColumn.classList.contains('kanban-column')) {
        targetColumn = targetColumn.parentElement;
    }
    
    if (targetColumn && cardElement) {
        const ordemId = data.replace('card-', '');
        
        let novoStatus = 'PENDENTE';
        if (targetColumn.id === 'col-andamento') novoStatus = 'EM ANDAMENTO';
        if (targetColumn.id === 'col-concluido') novoStatus = 'CONCLUÍDO';
        
        try {
            await db.collection('ordens').doc(String(ordemId)).update({ status: novoStatus });
        } catch (error) {
            console.error("Erro ao alterar status no Kanban:", error);
        }
    }
}

// ==========================================
// ESTOQUE DE PEÇAS
// ==========================================
function abrirModalPeca() {
    const modal = document.getElementById('modal-peca');
    if (modal) modal.classList.remove('hidden');
}

function fecharModalPeca() {
    const modal = document.getElementById('modal-peca');
    if (modal) modal.classList.add('hidden');
    const form = document.getElementById('pecaForm');
    if (form) form.reset();
}

async function salvarPecaModal() {
    const novaPeca = {
        sku: 'PEC-' + Math.floor(Math.random() * 899 + 100),
        nome: document.getElementById('modal-stk-nome').value,
        qtd: parseInt(document.getElementById('modal-stk-qtd').value) || 0,
        qtdMin: 2,
        preco: parseFloat(document.getElementById('modal-stk-preco').value) || 0,
        fone: document.getElementById('modal-stk-fone').value || ''
    };

    try {
        await db.collection('estoque').add(novaPeca);
        fecharModalPeca();
    } catch (error) {
        console.error("Erro ao adicionar peça:", error);
    }
}

function renderizarEstoque(lista = estoque) {
    const tbody = document.getElementById('stock-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    let totalItens = 0;
    let alertas = 0;
    let valorTotal = 0;

    lista.forEach(peca => {
        const qtd = Number(peca.qtd || 0);
        const qtdMin = Number(peca.qtdMin || 2);
        const preco = Number(peca.preco || 0);

        totalItens += qtd;
        valorTotal += (qtd * preco);

        let badgeStatus = '';
        if (qtd === 0) {
            badgeStatus = '<span style="background: #e74c3c22; color: #e74c3c; padding: 4px 8px; border-radius: 6px; font-size: 0.8rem; font-weight: 600;">Esgotado</span>';
            alertas++;
        } else if (qtd <= qtdMin) {
            badgeStatus = '<span style="background: #f39c1222; color: #f39c12; padding: 4px 8px; border-radius: 6px; font-size: 0.8rem; font-weight: 600;">Estoque Baixo</span>';
            alertas++;
        } else {
            badgeStatus = '<span style="background: #2ecc7122; color: #2ecc71; padding: 4px 8px; border-radius: 6px; font-size: 0.8rem; font-weight: 600;">Normal</span>';
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><code style="color: #888;">${peca.sku || 'N/A'}</code></td>
            <td><strong>${peca.nome}</strong></td>
            <td><i class="fas fa-box-archive" style="color: #666;"></i> ${peca.local || 'Geral'}</td>
            <td style="text-align: center;">
                <button onclick="alterarQtdEstoque('${peca.id}', -1)" style="border:none; background:#333; color:#fff; width:24px; height:24px; border-radius:4px; cursor:pointer;">-</button>
                <strong style="margin: 0 8px;">${qtd}</strong>
                <button onclick="alterarQtdEstoque('${peca.id}', 1)" style="border:none; background:#333; color:#fff; width:24px; height:24px; border-radius:4px; cursor:pointer;">+</button>
            </td>
            <td>${badgeStatus}</td>
            <td>R$ ${preco.toFixed(2)}</td>
            <td>
                ${peca.fone ? `<a href="https://wa.me/${peca.fone.replace(/\D/g,'')}" target="_blank" style="color:#25D366; margin-right:10px;" title="Pedir Fornecedor"><i class="fab fa-whatsapp"></i></a>` : ''}
                <button onclick="deletarPeca('${peca.id}')" style="background:transparent; border:none; color:#e74c3c; cursor:pointer;"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    const statTotal = document.getElementById('stk-stat-total');
    const statAlertas = document.getElementById('stk-stat-alertas');
    const statValor = document.getElementById('stk-stat-valor');

    if (statTotal) statTotal.innerText = totalItens;
    if (statAlertas) statAlertas.innerText = alertas;
    if (statValor) statValor.innerText = valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function filtrarEstoque() {
    const termoElem = document.getElementById('stk-search');
    const filtroElem = document.getElementById('stk-filter-status');
    
    const termo = termoElem ? termoElem.value.toLowerCase() : '';
    const filtroStatus = filtroElem ? filtroElem.value : '';

    const filtradas = estoque.filter(peca => {
        const bateNomeOuSku = peca.nome.toLowerCase().includes(termo) || (peca.sku && peca.sku.toLowerCase().includes(termo));
        
        const qtd = Number(peca.qtd || 0);
        const qtdMin = Number(peca.qtdMin || 2);
        
        let bateStatus = true;
        if (filtroStatus === 'zero') bateStatus = (qtd === 0);
        if (filtroStatus === 'baixo') bateStatus = (qtd > 0 && qtd <= qtdMin);
        if (filtroStatus === 'ok') bateStatus = (qtd > qtdMin);

        return bateNomeOuSku && bateStatus;
    });

    renderizarEstoque(filtradas);
}

async function alterarQtdEstoque(id, delta) {
    const peca = estoque.find(p => String(p.id) === String(id));
    if (peca) {
        const novaQtd = Math.max(0, peca.qtd + delta);
        try {
            await db.collection('estoque').doc(String(id)).update({ qtd: novaQtd });
        } catch (error) {
            console.error("Erro ao alterar quantidade:", error);
        }
    }
}

async function deletarPeca(id) {
    try {
        await db.collection('estoque').doc(String(id)).delete();
    } catch (error) {
        console.error("Erro ao remover peça:", error);
    }
}

function carregarSelectPecas() {
    const select = document.getElementById('os-peca-select');
    if (!select) return;
    
    select.innerHTML = '<option value="">Nenhuma peça selecionada (Opcional)</option>';
    
    estoque.forEach(p => {
        if (p.qtd > 0) {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = `${p.nome} (Qtd: ${p.qtd} | R$ ${Number(p.preco).toFixed(2)})`;
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
    
    const statPendente = document.getElementById('stat-pendente');
    const statTotal = document.getElementById('stat-total');
    const statConcluido = document.getElementById('stat-concluido');

    if (statPendente) statPendente.textContent = abertas;
    if (statTotal) statTotal.textContent = ordens.length;
    if (statConcluido) statConcluido.textContent = concluidas;
}

function renderizarFinanceiro() {
    const tbody = document.getElementById('finance-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    let totalEntradas = 0;
    let totalCustos = 0;

    ordens.forEach(o => {
        const dataFormatada = o.data ? o.data.split('-').reverse().join('/') : 'N/A';
        const displayId = o.id.length > 6 ? o.id.slice(-4) : o.id;

        if (o.status === 'CONCLUÍDO') {
            totalEntradas += Number(o.valor || 0);
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${dataFormatada}</td>
                <td>Serviço Executado (OS #${displayId}) - ${o.cliente}</td>
                <td><span style="color: #2ec4b6; font-weight:bold;">Entrada</span></td>
                <td style="color: #2ec4b6;">+ R$ ${Number(o.valor).toFixed(2)}</td>
            `;
            tbody.appendChild(tr);
        }
        
        if (o.pecaId && o.custoPeca > 0) {
            totalCustos += Number(o.custoPeca || 0);
            const trCusto = document.createElement('tr');
            trCusto.innerHTML = `
                <td>${dataFormatada}</td>
                <td>Peça Utilizada: ${o.pecaNome} (OS #${displayId})</td>
                <td><span style="color: #e71d36; font-weight:bold;">Custo</span></td>
                <td style="color: #e71d36;">- R$ ${Number(o.custoPeca).toFixed(2)}</td>
            `;
            tbody.appendChild(trCusto);
        }
    });

    const saldo = totalEntradas - totalCustos;

    const finEntradas = document.getElementById('fin-entradas');
    const finSaidas = document.getElementById('fin-saidas');
    const saldoTxt = document.getElementById('fin-saldo');

    if (finEntradas) finEntradas.textContent = `R$ ${totalEntradas.toFixed(2)}`;
    if (finSaidas) finSaidas.textContent = `R$ ${totalCustos.toFixed(2)}`;
    if (saldoTxt) {
        saldoTxt.textContent = `R$ ${saldo.toFixed(2)}`;
        saldoTxt.style.color = saldo >= 0 ? '#2ec4b6' : '#e71d36';
    }
}

// ==========================================
// MODAL DE CONFIRMAÇÃO
// ==========================================
let confirmCallback = null;

function abrirConfirmacao(titulo, mensagem, callback) {
    const modal = document.getElementById('custom-confirm');
    if (!modal) return;

    document.getElementById('confirm-title').textContent = titulo;
    document.getElementById('confirm-message').textContent = mensagem;
    modal.classList.remove('hidden');
    confirmCallback = callback;
    
    document.getElementById('confirm-yes').onclick = () => {
        if (confirmCallback) confirmCallback();
        closeConfirm();
    };
}

function closeConfirm() {
    const modal = document.getElementById('custom-confirm');
    if (modal) modal.classList.add('hidden');
    confirmCallback = null;
}

function limparBanco() {
    abrirConfirmacao("Limpar Banco de Dados", "Isto apagará permanentemente todas as Ordens e Peças no Firebase. Continuar?", async () => {
        try {
            const ordensSnap = await db.collection('ordens').get();
            ordensSnap.forEach(doc => doc.ref.delete());

            const estoqueSnap = await db.collection('estoque').get();
            estoqueSnap.forEach(doc => doc.ref.delete());

            showScreen('home-screen');
        } catch (error) {
            console.error("Erro ao limpar dados:", error);
        }
    });
}

function confirmarSair() {
    abrirConfirmacao("Sair do Sistema", "Deseja encerrar a sessão atual?", () => {
        alert("Sessão finalizada com sucesso!");
    });
}

// ==========================================
// IMPRESSÕES E EXPORTAÇÃO (PDF / Etiquetas)
// ==========================================
function gerarPDF(id) {
    const ordem = ordens.find(o => String(o.id) === String(id));
    if (!ordem) return;

    const dataFormatada = ordem.data ? ordem.data.split('-').reverse().join('/') : 'N/A';
    const displayId = ordem.id.length > 6 ? ordem.id.slice(-4) : ordem.id;

    const conteudo = `
        <p><strong>Código da OS:</strong> #${displayId}</p>
        <p><strong>Cliente:</strong> ${ordem.cliente}</p>
        <p><strong>WhatsApp:</strong> ${ordem.whatsapp}</p>
        <p><strong>Equipamento / Aparelho:</strong> ${ordem.aparelho}</p>
        <p><strong>Defeito Constatado:</strong> ${ordem.defeito}</p>
        <p><strong>Peça Substituída:</strong> ${ordem.pecaNome || 'Nenhuma'}</p>
        <p><strong>Data de Entrada:</strong> ${dataFormatada}</p>
        <h3 style="margin-top: 30px; color: #155e63">VALOR TOTAL: R$ ${Number(ordem.valor).toFixed(2)}</h3>
    `;

    document.getElementById('pdf-content').innerHTML = conteudo;
    
    const elemento = document.getElementById('pdf-inner');
    const container = document.getElementById('pdf-template');
    
    container.style.display = 'block';

    const opcoes = {
        margin: 10,
        filename: `OS_PRO_${displayId}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().from(elemento).set(opcoes).save().then(() => {
        container.style.display = 'none';
    });
}

function imprimirEtiqueta(id) {
    const ordem = ordens.find(o => String(o.id) === String(id));
    if (!ordem) return;

    const dataFormatada = ordem.data ? ordem.data.split('-').reverse().join('/') : 'N/A';
    const displayId = ordem.id.length > 6 ? ordem.id.slice(-4) : ordem.id;

    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    document.body.appendChild(printFrame);

    const frameDoc = printFrame.contentWindow.document;
    frameDoc.open();
    frameDoc.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: sans-serif; padding: 10px; margin: 0; }
                .etiqueta { border: 1px dashed #000; padding: 10px; width: 70mm; }
                @page { size: 80mm auto; margin: 0; }
            </style>
        </head>
        <body>
            <div class="etiqueta">
                <strong>OS: #${displayId}</strong><br>
                <strong>Cli:</strong> ${ordem.cliente}<br>
                <strong>Apar:</strong> ${ordem.aparelho}<br>
                <small>Def: ${(ordem.defeito || '').slice(0, 35)}...</small><br>
                <small>Data: ${dataFormatada}</small>
            </div>
            <script>
                window.onload = function() {
                    window.print();
                };
            <\/script>
        </body>
        </html>
    `);
    frameDoc.close();

    setTimeout(() => {
        document.body.removeChild(printFrame);
    }, 1000);
}
