/**
 * TECHNICIAN PRO - Core Engine
 * Organizado por: Navegação, OS, Kanban, Financeiro, Estoque e WhatsApp
 */

// --- NAVEGAÇÃO E ESTADO GLOBAL ---
function showScreen(screenId) {
    // ... sua lógica de esconder/mostrar telas ...
    
    if (screenId === 'nova-ordem-screen') {
        carregarSelectPecas(); // Atualiza a lista sempre que você for criar uma OS
    }
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.add('hidden');
    });

    // 2. Remove destaque de todos os itens do menu
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
if (screenId === 'cadastro-screen') {
        if (typeof carregarSelectPecas === 'function') {
            carregarSelectPecas(); // Alimenta o select com as peças do estoque atualizado
        }
    }
}
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

   // FORMA SEGURA (Converta ambos para String na comparação)
const osList = getOS().map(os => {
    if (String(os.id) === String(id)) { 
        os.status = novoStatus; 
    }
    return os;
});
    saveOS(osList);
    renderKanban();
}

function renderKanban() {
    const colPendente = document.querySelector('#col-pendente .kanban-cards');
    const colAndamento = document.querySelector('#col-andamento .kanban-cards');
    const colConcluido = document.querySelector('#col-concluido .kanban-cards');

    // Limpa as colunas para evitar duplicatas ou erros de renderização
    if(colPendente) colPendente.innerHTML = '';
    if(colAndamento) colAndamento.innerHTML = '';
    if(colConcluido) colConcluido.innerHTML = '';

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

        // Lógica de distribuição
        if (os.status === 'Pendente' && colPendente) colPendente.appendChild(card);
        else if (os.status === 'Em Andamento' && colAndamento) colAndamento.appendChild(card);
        else if (os.status === 'Concluído' && colConcluido) colConcluido.appendChild(card);
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

// --- SISTEMA DE ESTOQUE ATUALIZADO ---
function salvarPecaModal() {
    const nome = document.getElementById('modal-stk-nome').value;
    const qtd = document.getElementById('modal-stk-qtd').value;
    const preco = document.getElementById('modal-stk-preco').value;
    const fone = document.getElementById('modal-stk-fone').value; // Novo campo

    if (!nome || !qtd || !preco) return alert("Preencha os campos obrigatórios!");

    const estoque = getEstoque();
    estoque.push({
        id: Date.now(),
        nome,
        quantidade: parseInt(qtd),
        preco: parseFloat(preco),
        foneFornecedor: fone.replace(/\D/g, '') // Salva apenas os números
    });

    saveEstoque(estoque);
    fecharModalPeca();
    renderEstoque();
    document.getElementById('pecaForm').reset();
}

// --- CONFIGURAÇÃO DE ESTOQUE BAIXO ---
const LIMITE_ESTOQUE_BAIXO = 3; 
const TELEFONE_FORNECEDOR = "21999999999"; // Substitua pelo número do seu fornecedor

// Funções para ajuste rápido de unidades
function ajustarUnidade(id, delta) {
    const estoque = getEstoque().map(p => {
        if (p.id === id) {
            p.quantidade = Math.max(0, p.quantidade + delta);
        }
        return p;
    });
    saveEstoque(estoque);
    renderEstoque();
}

// Atualização da renderEstoque para incluir os novos botões
function renderEstoque() {
    const tbody = document.getElementById('stock-body'); 
    const data = getEstoque();
    if (!tbody) return;

    tbody.innerHTML = data.map(peca => {
        const isBaixo = peca.quantidade <= 3;
        const alertaClass = isBaixo ? 'estoque-critico' : '';
        
        return `
            <tr class="${alertaClass}">
                <td>${peca.nome}</td>
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <button onclick="ajustarUnidade(${peca.id}, -1)" class="btn-mini">-</button>
                        <strong>${peca.quantidade} un</strong>
                        <button onclick="ajustarUnidade(${peca.id}, 1)" class="btn-mini">+</button>
                    </div>
                </td>
                <td>R$ ${peca.preco.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                <td>
                    <div style="display: flex; gap: 8px;">
                        ${isBaixo ? `
                            <button onclick="pedirReposicao('${peca.nome}', '${peca.foneFornecedor}')" class="btn-action-dark">
                                <i class="fas fa-truck-loading" style="color: #e9a680;"></i>
                            </button>
                        ` : ''}
                        <button onclick="excluirPeca(${peca.id})" class="btn-del-mini"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}
function pedirReposicao(nomePeca, telefone) {
    if (!telefone) {
        alert("Nenhum telefone de fornecedor cadastrado para esta peça!");
        return;
    }
    
    const mensagem = `Olá! Verifiquei que meu estoque de *${nomePeca}* está baixo. Gostaria de solicitar uma reposição.`;
    const url = `https://wa.me/55${telefone}?text=${mensagem}`;
    window.open(url, '_blank');
}
function excluirPeca(id) {
    const modal = document.getElementById('custom-confirm');
    const msg = document.getElementById('confirm-message');
    const title = document.getElementById('confirm-title');
    const btnYes = document.getElementById('confirm-yes');
    const icon = modal.querySelector('i');

    title.innerText = "Remover do Estoque";
    msg.innerText = "Tem certeza que deseja excluir esta peça? Esta ação não pode ser desfeita.";
    
    // Customização visual
    icon.className = "fas fa-box-open warning-icon"; 
    btnYes.className = "btn-confirm-warning";
    btnYes.innerText = "Excluir Peça";

    modal.classList.remove('hidden');

    const newBtnYes = btnYes.cloneNode(true);
    btnYes.parentNode.replaceChild(newBtnYes, btnYes);

    newBtnYes.onclick = () => {
        saveEstoque(getEstoque().filter(p => p.id !== id));
        renderEstoque();
        closeConfirm();
    };
}
// --- FINANCEIRO E DASHBOARD ---
function renderFinanceiro() {
    const osList = getOS();
    const estoque = getEstoque();
    const tbody = document.getElementById('finance-body');
    
    let totalEntradas = 0;
    let totalSaidas = 0;

    // SÓ CONTABILIZA ENTRADA SE O STATUS FOR "CONCLUÍDO"
    const entradasHTML = osList
        .filter(os => os.status === 'Concluído' && os.valor > 0)
        .map(os => {
            totalEntradas += os.valor;
            return `
                <tr>
                    <td>${os.data}</td>
                    <td>OS #${os.id} - ${os.cliente}</td>
                    <td><span class="status-badge status-concluido">Recebido</span></td>
                    <td>R$ ${os.valor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                </tr>
            `;
        }).join('');

    // Cálculo de saídas (Estoque)
    estoque.forEach(p => { 
        totalSaidas += (p.preco * p.quantidade); 
    });

    // Atualização da Tabela Financeira
    if(tbody) {
        tbody.innerHTML = entradasHTML || '<tr><td colspan="4" style="text-align:center">Nenhuma entrada (OS Concluída) encontrada</td></tr>';
    }

    // Atualização dos Cards de Valores
    const elEntradas = document.getElementById('fin-entradas');
    const elSaidas = document.getElementById('fin-saidas');
    const elSaldo = document.getElementById('fin-saldo');

    if(elEntradas) elEntradas.innerText = `R$ ${totalEntradas.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
    if(elSaidas) elSaidas.innerText = `R$ ${totalSaidas.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
    if(elSaldo) elSaldo.innerText = `R$ ${(totalEntradas - totalSaidas).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
}
function renderTable() {
    const tbody = document.getElementById('table-body');
    if (!tbody) return;

    const osList = getOS();
    if (osList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">Nenhuma ordem encontrada</td></tr>';
        return;
        // Dentro do seu renderTable().map(os => { ... })
// Adicione este botão junto aos outros (WhatsApp, PDF, Excluir):
// Dentro do seu renderTable().map(os => { ... })
// Adicione este botão junto aos outros (WhatsApp, PDF, Concluir):

`
<button onclick="gerarEtiqueta(${os.id})" class="btn-action-dark" title="Gerar Etiqueta">
    <i class="fas fa-tag" style="color: #e9a680;"></i>
</button>
`
`
<button onclick="alterarStatusOS(${os.id}, 'Concluído')" class="btn-action-dark" title="Concluir Serviço">
    <i class="fas fa-check-circle" style="color: #10b981;"></i>
</button>
`
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
    const modal = document.getElementById('custom-confirm');
    const msg = document.getElementById('confirm-message');
    const title = document.getElementById('confirm-title');
    const btnYes = document.getElementById('confirm-yes');
    const icon = modal.querySelector('i');

    title.innerText = "Zerar Sistema";
    msg.innerHTML = "<strong style='color:#ff4d4d'>ATENÇÃO:</strong> Isso apagará todas as Ordens de Serviço e o Estoque permanentemente!";
    
    // Customização visual
    icon.className = "fas fa-radiation-alt danger-icon"; 
    btnYes.className = "btn-confirm-danger";
    btnYes.innerText = "Apagar Tudo";

    modal.classList.remove('hidden');

    const newBtnYes = btnYes.cloneNode(true);
    btnYes.parentNode.replaceChild(newBtnYes, btnYes);

    newBtnYes.onclick = () => {
        localStorage.removeItem('SAD_PRO_OS');
        localStorage.removeItem('SAD_PRO_ESTOQUE');
        location.reload();
    };
}

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('serviceForm');
    if(form) form.addEventListener('submit', handleFormSubmit);
    
    showScreen('home-screen');
    updateStats();
});
// Função para alterar o status manualmente (ex: via botão ou select na tabela)
function alterarStatusOS(id, novoStatus) {
    const osList = getOS().map(os => {
        if (os.id == id) {
            os.status = novoStatus;
        }
        return os;
    });

    saveOS(osList);
    
    // Atualiza as telas abertas para refletir a mudança
    renderTable(); 
    renderFinanceiro(); 
    updateStats();
}
// Função para carregar peças no select da OS sempre que abrir a tela
function carregarSelectPecas() {
    const select = document.getElementById('os-peca-select');
    if (!select) return;
    
    const estoque = getEstoque();
    
    // Limpa e repopula
    select.innerHTML = '<option value="">-- Selecione uma peça (Opcional) --</option>';
    
    estoque.forEach(peca => {
        const option = document.createElement('option');
        option.value = peca.id; // Importante: o ID deve ser o valor
        option.textContent = `${peca.nome} (Estoque: ${peca.quantidade})`;
        select.appendChild(option);
    });
}
// Modificação da handleFormSubmit para dar baixa no estoque
function handleFormSubmit(e) {
    e.preventDefault();
   // Dentro da sua função de salvar a OS (handleFormSubmit)
const selectPeca = document.getElementById('os-peca-select');
const pecaId = selectPeca.value;

if (pecaId && pecaId !== "") {
    const estoque = getEstoque();
    // Usamos == para comparar string com número ou convertemos explicitamente
    const index = estoque.findIndex(p => String(p.id) === String(pecaId));

    if (index !== -1) {
        if (estoque[index].quantidade > 0) {
            estoque[index].quantidade -= 1;
            saveEstoque(estoque);
            console.log(`Baixa efetuada: ${estoque[index].nome}`);
        } else {
            alert("Atenção: Esta peça está com estoque zerado!");
        }
    } else {
        console.error("Peça selecionada não encontrada no banco de dados.");
    }
}

    const novaOS = {
        id: Math.floor(1000 + Math.random() * 8999),
        cliente: document.getElementById('cli-nome').value,
        telefone: document.getElementById('cli-phone').value,
        aparelho: document.getElementById('apa-nome').value,
        defeito: document.getElementById('apa-defeito').value,
        data: document.getElementById('apa-data').value,
        valor: parseFloat(document.getElementById('apa-valor').value || 0),
        status: 'Pendente',
        pecaUtilizada: pecaId // Guardamos o ID da peça usada
    };

    osList.push(novaOS);
    saveOS(osList);
    
    e.target.reset();
    showScreen('lista-screen');
}
console.log("ID selecionado no Select:", pecaId);
console.log("Banco de Estoque Atual:", getEstoque());
function gerarEtiqueta(id) {
    const os = getOS().find(o => o.id == id);
    if (!os) return;

    const content = document.getElementById('etiqueta-content');
    const dataEl = document.getElementById('etiqueta-data');
    const template = document.getElementById('etiqueta-template');

    // Preenche o conteúdo da etiqueta
    content.innerHTML = `
        <strong>OS: #${os.id}</strong><br>
        <strong>CLIENTE:</strong> ${os.cliente.toUpperCase()}<br>
        <strong>APARELHO:</strong> ${os.aparelho}<br>
        <strong>DEFEITO:</strong> ${os.defeito.substring(0, 30)}${os.defeito.length > 30 ? '...' : ''}<br>
        <strong>STATUS:</strong> ${os.status.toUpperCase()}
    `;
    dataEl.innerText = `Entrada: ${os.data}`;

    // Lógica de Impressão
    const janelaImpressao = window.open('', '', 'width=600,height=600');
    janelaImpressao.document.write(`
        <html>
            <head>
                <title>Imprimir Etiqueta - OS #${os.id}</title>
                <style>
                    body { margin: 0; display: flex; justify-content: center; }
                    @media print {
                        body { margin: 0; }
                    }
                </style>
            </head>
            <body>
                ${template.innerHTML}
            </body>
        </html>
    `);

    janelaImpressao.document.close();
    janelaImpressao.focus();
    
    // Pequeno delay para garantir que o conteúdo carregou antes de imprimir
    setTimeout(() => {
        janelaImpressao.print();
        janelaImpressao.close();
    }, 250);
}
function atualizarWelcomeBanner() {
    // 1. Referências dos elementos
    const nameEl = document.getElementById('user-name');
    const timeEl = document.getElementById('current-time');
    const dateEl = document.getElementById('current-date');
    const messageEl = document.getElementById('welcome-message');
    
    const now = new Date();

    // 2. Atualiza o Nome do Técnico
    const nomeSalvo = localStorage.getItem('SAD_PRO_USER_NAME');
    if (nameEl) {
        nameEl.innerText = nomeSalvo ? nomeSalvo : "Técnico";
    }

    // 3. Atualiza Relógio (apenas se o elemento existir)
    if (timeEl) {
        timeEl.innerText = now.toLocaleTimeString('pt-BR');
    }
    
    // 4. Atualiza Data
    if (dateEl) {
        const options = { day: 'numeric', month: 'long', year: 'numeric' };
        dateEl.innerText = now.toLocaleDateString('pt-BR', options);
    }
    
    // 5. Atualiza Mensagem de Saudação
    if (messageEl) {
        const hora = now.getHours();
        if (hora < 12) messageEl.innerText = "Bom dia! Café na mão e foco nos reparos. ☕";
        else if (hora < 18) messageEl.innerText = "Boa tarde! Metas do dia quase batidas. 💪";
        else messageEl.innerText = "Boa noite! Finalizando os últimos detalhes por hoje? 🌙";
    }
}

// --- INICIALIZAÇÃO ---
// Garante que o código rode assim que a página carregar
document.addEventListener('DOMContentLoaded', () => {
    // Chama a função imediatamente para não esperar 1 segundo
    atualizarWelcomeBanner();
    
    // Inicia o relógio em tempo real
    setInterval(atualizarWelcomeBanner, 1000);
});

// Inicia o relógio
setInterval(updateWelcomeBanner, 1000);
updateWelcomeBanner();

function confirmarSair() {
    // 1. Abre o seu modal de confirmação personalizado
    // Certifique-se de que a função openConfirm ou o seu sistema de modal esteja assim:
    
    const modal = document.getElementById('custom-confirm');
    const msg = document.getElementById('confirm-message');
    const btnYes = document.getElementById('confirm-yes');

    if (modal) {
        msg.innerText = "Deseja realmente encerrar sua sessão e voltar ao login?";
        modal.classList.remove('hidden');

        // Resetamos o evento do botão para não acumular cliques
        const newBtnYes = btnYes.cloneNode(true);
        btnYes.parentNode.replaceChild(newBtnYes, btnYes);

        newBtnYes.onclick = () => {
            // Ação ao confirmar:
            
            // OPÇÃO A: Se o seu login for uma página separada
            window.location.href = "index.html"; 

            // OPÇÃO B: Se o seu login for uma DIV no mesmo arquivo
            // showScreen('login-screen');
            // closeConfirm();
        };
    } else {
        // Fallback caso o modal falhe
        if(confirm("Deseja sair do sistema?")) {
            window.location.href = "index.html";
        }
    }
}

// Função para fechar o modal
function closeConfirm() {
    document.getElementById('custom-confirm').classList.add('hidden');
}
// --- FUNÇÃO PARA SALVAR NOVA ORDEM DE SERVIÇO ---
function handleFormSubmit(e) {
    e.preventDefault(); // Impede a página de recarregar

    // 1. Captura a lista atual de OS no sistema
    const osList = getOS();

    // 2. Captura a peça selecionada para dar baixa (reaproveitando a lógica corrigida)
    const selectPeca = document.getElementById('os-peca-select');
    const pecaId = selectPeca ? selectPeca.value : "";

    if (pecaId && pecaId !== "") {
        const estoque = getEstoque();
        const index = estoque.findIndex(p => String(p.id) === String(pecaId));

        if (index !== -1) {
            if (estoque[index].quantidade > 0) {
                estoque[index].quantidade -= 1;
                saveEstoque(estoque);
                console.log(`Baixa efetuada no estoque: 1 un de ${estoque[index].nome}`);
            } else {
                alert(`Atenção: A peça "${estoque[index].nome}" está esgotada no estoque, mas a OS será criada.`);
            }
        }
    }

    // 3. Cria o objeto da Nova OS com os dados do formulário
    const novaOS = {
        id: Math.floor(1000 + Math.random() * 8999), // ID único de 4 dígitos
        cliente: document.getElementById('cli-nome').value,
        telefone: document.getElementById('cli-phone').value,
        aparelho: document.getElementById('apa-nome').value,
        defeito: document.getElementById('apa-defeito').value,
        data: document.getElementById('apa-data').value,
        valor: parseFloat(document.getElementById('apa-valor').value || 0),
        status: 'Pendente', // Toda ordem nasce pendente no Kanban
        pecaUtilizada: pecaId
    };

    // 4. Salva no localStorage através da sua função base
    osList.push(novaOS);
    saveOS(osList);

    // 5. Limpa os campos do formulário
    e.target.reset();

    // 6. Redireciona visualmente para a lista de ordens e atualiza a tabela
    showScreen('lista-screen');
    if (typeof renderTable === 'function') renderTable();
}

// --- VÍNCULO DO EVENTO COM O FORMULÁRIO ---
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('serviceForm');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
});
