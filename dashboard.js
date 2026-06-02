
function showScreen(screenId) {
  
    const telas = document.querySelectorAll('.content-section');
    telas.forEach(tela => {
        tela.classList.add('hidden');
    });

    const telaAlvo = document.getElementById(screenId);
    if (telaAlvo) {
        telaAlvo.classList.remove('hidden');
    } else {
        console.error(`Erro: A tela com o ID "${screenId}" não foi encontrada no HTML.`);
    }

    const botoesSidebar = document.querySelectorAll('.sidebar .nav-item');
    botoesSidebar.forEach(botao => {
        botao.classList.remove('active');
           
        if (botao.getAttribute('onclick') && botao.getAttribute('onclick').includes(screenId)) {
            botao.classList.add('active');
        }
    });

    if (screenId === 'home-screen' && typeof atualizarWelcomeBanner === 'function') {
        atualizarWelcomeBanner();
    }
    if (screenId === 'cadastro-screen' && typeof carregarSelectPecas === 'function') {
        carregarSelectPecas();
    }
    if (screenId === 'lista-screen' && typeof renderTable === 'function') {
        renderTable();
    }
    if (screenId === 'kanban-screen' && typeof renderKanban === 'function') {
        renderKanban();
    }
    if (screenId === 'estoque-screen' && typeof renderEstoque === 'function') {
        renderEstoque();
    }
    if (screenId === 'financeiro-screen' && typeof renderFinanceiro === 'function') {
        renderFinanceiro();
    }
}

const getOS = () => JSON.parse(localStorage.getItem('SAD_PRO_OS') || '[]');
const saveOS = (data) => {
    localStorage.setItem('SAD_PRO_OS', JSON.stringify(data));
    updateStats();
};

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

function excluirOS(id) {
    const modal = document.getElementById('custom-confirm');
    const btnYes = document.getElementById('confirm-yes');
    const msg = document.getElementById('confirm-message');
    
    if(!modal) { 
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

        if (os.status === 'Pendente' && colPendente) colPendente.appendChild(card);
        else if (os.status === 'Em Andamento' && colAndamento) colAndamento.appendChild(card);
        else if (os.status === 'Concluído' && colConcluido) colConcluido.appendChild(card);
    });
}

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
    const fone = document.getElementById('modal-stk-fone').value; 

    if (!nome || !qtd || !preco) return alert("Preencha os campos obrigatórios!");

    const estoque = getEstoque();
    estoque.push({
        id: Date.now(),
        nome,
        quantidade: parseInt(qtd),
        preco: parseFloat(preco),
        foneFornecedor: fone.replace(/\D/g, '') 
    });

    saveEstoque(estoque);
    fecharModalPeca();
    renderEstoque();
    document.getElementById('pecaForm').reset();
}

const LIMITE_ESTOQUE_BAIXO = 3; 
const TELEFONE_FORNECEDOR = "21999999999"; 

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

function renderFinanceiro() {
    const osList = getOS();
    const estoque = getEstoque();
    const tbody = document.getElementById('finance-body');
    
    let totalEntradas = 0;
    let totalSaidas = 0;

    
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

    estoque.forEach(p => { 
        totalSaidas += (p.preco * p.quantidade); 
    });

    if(tbody) {
        tbody.innerHTML = entradasHTML || '<tr><td colspan="4" style="text-align:center">Nenhuma entrada (OS Concluída) encontrada</td></tr>';
    }

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


document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('serviceForm');
    if(form) form.addEventListener('submit', handleFormSubmit);
    
    showScreen('home-screen');
    updateStats();
});

function alterarStatusOS(id, novoStatus) {
    const osList = getOS().map(os => {
        if (os.id == id) {
            os.status = novoStatus;
        }
        return os;
    });

    saveOS(osList);

    renderTable(); 
    renderFinanceiro(); 
    updateStats();
}
function carregarSelectPecas() {
    const select = document.getElementById('os-peca-select');
    if (!select) return;
    
    const estoque = getEstoque();
    
    select.innerHTML = '<option value="">-- Selecione uma peça (Opcional) --</option>';
    
    estoque.forEach(peca => {
        const option = document.createElement('option');
        option.value = peca.id; 
        option.textContent = `${peca.nome} (Estoque: ${peca.quantidade})`;
        select.appendChild(option);
    });
}

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
// Função para simular ou baixar o backup dos dados atuais
function baixarBackupDados() {
    // Exemplo de estrutura que você já deve ter no seu LocalStorage ou Banco
    const dadosSistema = {
        ordens: JSON.parse(localStorage.getItem('ordens_servico')) || [],
        pecas: JSON.parse(localStorage.getItem('estoque_pecas')) || []
    };

    // Transforma os dados em texto JSON formatado
    const dadosTexto = JSON.stringify(dadosSistema, null, 2);
    
    // Cria um arquivo temporário para download
    const blob = new Blob([dadosTexto], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const linkTemporario = document.createElement("a");
    linkTemporario.href = url;
    linkTemporario.download = `backup_sistema_${new Date().toISOString().slice(0,10)}.json`;
    
    // Dispara o download silenciosamente
    document.body.appendChild(linkTemporario);
    linkTemporario.click();
    document.body.removeChild(linkTemporario);
}

// Vinculando ao seu botão de confirmação de exclusão
document.getElementById('confirm-yes').addEventListener('click', function() {
    // 1. Faz o backup de segurança primeiro
    baixarBackupDados();
    
    // 2. Aqui entra o seu código atual que limpa o banco de verdade
    // localStorage.clear(); ou sua requisição para o banco de dados...
    
    alert('Backup gerado com sucesso e banco de dados resetado!');
});
document.querySelectorAll('.btn-whatsapp-notif').forEach(botao => {
    botao.addEventListener('click', function(e) {
        const telefone = this.getAttribute('data-phone');
        const cliente = this.getAttribute('data-cliente');
        const os = this.getAttribute('data-os');
        
        // Mensagem customizada e formatada para o WhatsApp
        const mensagem = `Olá, ${cliente}! O orçamento da sua Ordem de Serviço #${os} foi aprovado e o conserto do seu equipamento já foi finalizado com sucesso. Você já pode vir retirá-lo!`;
        
        // Codifica o texto para formato URL
        const mensagemCodificada = encodeURIComponent(mensagem);
        
        // Atualiza o link do botão na hora do clique
        this.href = `https://api.whatsapp.com/send?phone=${telefone}&text=${mensagemCodificada}`;
    });
});
const ctx = document.getElementById('faturamentoChart').getContext('2d');

// Criando o gradiente de cor para a linha do gráfico
const gradienteLinha = ctx.createLinearGradient(0, 0, 400, 0);
gradienteLinha.addColorStop(0, '#155e63'); // Teal
gradienteLinha.addColorStop(1, '#e9a680'); // Pêssego

const faturamentoChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'], // Dias da semana
        datasets: [{
            label: 'Faturamento (R$)',
            data: [450, 820, 610, 1200, 950, 1400], // Valores simulados de entrada
            borderColor: gradienteLinha,
            borderWidth: 3,
            backgroundColor: 'rgba(233, 166, 128, 0.03)', // Preenchimento sutil abaixo da linha
            fill: true,
            tension: 0.3, // Deixa a linha curvada e elegante
            pointBackgroundColor: '#e9a680',
            pointRadius: 5
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false } // Esconde a legenda padrão para ficar minimalista
        },
        scales: {
            y: {
                grid: { color: 'rgba(255, 255, 255, 0.05)' }, // Linhas guia bem discretas
                ticks: { color: '#a0aec0' }
            },
            x: {
                grid: { display: false },
                ticks: { color: '#a0aec0' }
            }
        }
    }
});
document.querySelectorAll('.garantia-badge').forEach(badge => {
    const dataConclusaoStr = badge.getAttribute('data-data-conclusao');
    const dataConclusao = new Date(dataConclusaoStr);
    const dataAtual = new Date();
    
    // Calcula a diferença em dias
    const diffTempo = Math.abs(dataAtual - dataConclusao);
    const diasPassados = Math.ceil(diffTempo / (1000 * 60 * 60 * 24));
    
    const prazoGarantia = 90; // Dias padrão de garantia do laboratório
    const diasRestantes = prazoGarantia - diasPassados;
    
    const textoElemento = badge.querySelector('.garantia-texto');
    
    if (diasRestantes > 0) {
        badge.classList.add('garantia-ativa');
        textoElemento.innerText = `Garantia: ${diasRestantes} dias restando`;
    } else {
        badge.classList.add('garantia-vencida');
        textoElemento.innerText = "Garantia Expirada";
    }
});

// Variável global para podermos atualizar o gráfico quando necessário
let meuGraficoFaturamento = null;

// Função principal para processar os dados e renderizar o gráfico
function inicializarGraficoFaturamento() {
    const canvas = document.getElementById('faturamentoChart');
    if (!canvas) return; // Evita erros caso mude de aba e o canvas não esteja na tela

    const ctx = canvas.getContext('2d');

    // 1. Coleta as ordens salvas (Ajuste o nome 'ordens_servico' se o seu banco usar outra chave)
    const ordens = JSON.parse(localStorage.getItem('SAD_PRO_OS')) || [];
    
    // 2. Inicializa um array com zero para cada um dos 12 meses
    const faturamentoPorMes = Array(12).fill(0);
    const anoAtual = new Date().getFullYear();

    // 3. Filtra e soma os valores das ordens CONCLUÍDAS do ano atual
    ordens.forEach(ordem => {
        // Altere 'status' e 'concluido' / 'data' e 'valor' de acordo com os atributos do seu objeto
        if (ordem.status === 'concluido' || ordem.status === 'Concluído') {
            const dataOrdem = new Date(ordem.data); 
            
            // Verifica se a ordem pertence ao ano corrente
            if (dataOrdem.getFullYear() === anoAtual) {
                const mes = dataOrdem.getMonth(); // 0 = Janeiro, 11 = Dezembro
                
                // Converte para número para evitar concatenação de texto
                const valorLimpo = parseFloat(ordem.valor) || 0; 
                faturamentoPorMes[mes] += valorLimpo;
            }
        }
    });

    // 4. Criação dos gradientes de cor para manter o design premium
    const gradienteLinha = ctx.createLinearGradient(0, 0, 400, 0);
    gradienteLinha.addColorStop(0, '#155e63'); // Teal profundo
    gradienteLinha.addColorStop(1, '#e9a680'); // Pêssego

    const gradientePreenchimento = ctx.createLinearGradient(0, 0, 0, 300);
    gradientePreenchimento.addColorStop(0, 'rgba(233, 166, 128, 0.12)');
    gradientePreenchimento.addColorStop(1, 'rgba(21, 94, 99, 0.00)');

    // 5. Se o gráfico já existia (em uma navegação de abas), destrói a instância antiga para não duplicar
    if (meuGraficoFaturamento) {
        meuGraficoFaturamento.destroy();
    }

    // 6. Renderiza o Chart.js configurado para o estilo Glassmorphism
    meuGraficoFaturamento = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
            datasets: [{
                label: 'Faturamento Realizado (R$)',
                data: faturamentoPorMes,
                borderColor: gradienteLinha,
                borderWidth: 3,
                backgroundColor: gradientePreenchimento,
                fill: true,
                tension: 0.35, // Curvatura elegante das linhas
                pointBackgroundColor: '#e9a680',
                pointBorderColor: '#050506',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    labels: { color: '#a0aec0', font: { family: 'Inter', size: 12 } }
                },
                tooltip: {
                    backgroundColor: 'rgba(10, 10, 12, 0.9)',
                    titleColor: '#ffb38a',
                    bodyColor: '#fff',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return `Recebido: R$ ${context.parsed.y.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.04)' },
                    ticks: {
                        color: '#a0aec0',
                        callback: value => `R$ ${value}`
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#a0aec0' }
                }
            }
        }
    });
}

// 7. Gatilho para carregar o gráfico assim que a página abrir
document.addEventListener('DOMContentLoaded', inicializarGraficoFaturamento);
function alterarQuantidadeTabela(id, mudanca) {
    // 1. Recupera a lista atual de peças do localStorage
    let pecas = JSON.parse(localStorage.getItem('pecas')) || [];
    
    // 2. Encontra a peça certa pelo ID
    const peca = pecas.find(p => p.id === id);
    
    if (peca) {
        // 3. Aplica a mudança garantindo que não fique menor que 0
        let novaQtd = parseInt(peca.quantidade || 0) + mudanca;
        if (novaQtd < 0) novaQtd = 0;
        
        peca.quantidade = novaQtd;
        
        // 4. Salva de volta no banco local
        localStorage.setItem('pecas', JSON.stringify(pecas));
        
        // 5. Executa a sua função que redesenha a tabela para atualizar a tela
        // (Substitua pelo nome real da sua função de atualizar a tela do estoque se for diferente)
        renderizarEstoque(); 
        
        // Opcional: Se tiver uma função que atualiza o financeiro ou dashboards, chame aqui também
        if (typeof atualizarCardsDash === 'function') atualizarCardsDash();
    }
}
