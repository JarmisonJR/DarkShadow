// ==========================================
// CONFIGURAÇÃO DO FIREBASE
// ==========================================
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
// Inicializa o Firebase e o Firestore
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let ordens = [];
let estoque = [];

document.addEventListener('DOMContentLoaded', () => {
    inicializarRelogio();
    carregarDadosFirebase(); // Substitui o LocalStorage por escuta em tempo real

    const serviceForm = document.getElementById('serviceForm');
    if (serviceForm) {
        serviceForm.addEventListener('submit', salvarOrdemServico);
    }
});

// ==========================================
// SINCRONIZAÇÃO EM TEMPO REAL (FIRESTORE)
// ==========================================
function carregarDadosFirebase() {
    // Escuta alterações na coleção de Ordens
    db.collection('ordens').onSnapshot(snapshot => {
        ordens = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        atualizarTodasAsTelas();
    }, error => console.error("Erro ao carregar ordens:", error));

    // Escuta alterações na coleção de Estoque
    db.collection('estoque').onSnapshot(snapshot => {
        estoque = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        atualizarTodasAsTelas();
    }, error => console.error("Erro ao carregar estoque:", error));
}
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
            if (!idEdicao) {
                if (peca.qtd <= 0) {
                    alert("Atenção: Peça sem estoque disponível!");
                    return;
                }
                // Abate estoque no Firestore
                await db.collection('estoque').doc(peca.id).update({ qtd: peca.qtd - 1 });
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
}
function deletarOrdem(id) {
    abrirConfirmacao("Excluir Ordem", "Tem certeza que deseja apagar esta ordem?", async () => {
        const ordem = ordens.find(o => String(o.id) === String(id));
        if (ordem && ordem.pecaId) {
            const peca = estoque.find(p => String(p.id) === String(ordem.pecaId));
            if (peca) {
                await db.collection('estoque').doc(peca.id).update({ qtd: peca.qtd + 1 });
            }
        }
        
        await db.collection('ordens').doc(String(id)).delete();
    });
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
        
        await db.collection('ordens').doc(String(ordemId)).update({ status: novoStatus });
    }
}
async function salvarPecaModal() {
    const novaPeca = {
        sku: 'PEC-' + Math.floor(Math.random() * 899 + 100),
        nome: document.getElementById('modal-stk-nome').value,
        qtd: parseInt(document.getElementById('modal-stk-qtd').value) || 0,
        qtdMin: 2,
        preco: parseFloat(document.getElementById('modal-stk-preco').value) || 0,
        fone: document.getElementById('modal-stk-fone').value
    };

    await db.collection('estoque').add(novaPeca);
    fecharModalPeca();
}

async function alterarQtdEstoque(id, delta) {
    const peca = estoque.find(p => String(p.id) === String(id));
    if (peca) {
        const novaQtd = Math.max(0, peca.qtd + delta);
        await db.collection('estoque').doc(String(id)).update({ qtd: novaQtd });
    }
}

async function deletarPeca(id) {
    await db.collection('estoque').doc(String(id)).delete();
}
