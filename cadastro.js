class CadastroManager {
    constructor() {
        // 1. Seleciona o formulário de cadastro (tentando pelo ID ou pela tag form)
        this.form = document.getElementById('auth-form') || document.querySelector('form');
        
        // 2. Seleciona os inputs do HTML
        this.inputNome = document.getElementById('reg-nome');
        this.inputEmail = document.getElementById('email');
        this.inputSenha = document.getElementById('password');

        this.init();
    }

    init() {
        if (this.form) {
            // Adiciona o evento de submit usando Arrow Function para manter o contexto do "this"
            this.form.addEventListener('submit', (e) => this.executarFluxoCadastro(e));
        } else {
            console.error("Erro: Formulário de cadastro não encontrado no HTML!");
        }
    }

    executarFluxoCadastro(event) {
        // Impede o recarregamento da página
        event.preventDefault();

        // Captura e limpa espaços extras dos valores
        const nome = this.inputNome.value.trim();
        const email = this.inputEmail.value.trim();
        const senha = this.inputSenha.value.trim();

        // Validação: Verifica se algum campo está vazio
        if (nome === "" || email === "" || senha === "") {
            this.notificar("Por favor, preencha todos os campos para continuar.");
            return;
        }

        try {
            // SALVAMENTO NO LOCALSTORAGE
            // Nome para o Banner da Dashboard
            localStorage.setItem('SAD_USER_NAME', nome);
            
            // Credenciais para validação de Login
            localStorage.setItem('emailCadastrado', email);
            localStorage.setItem('senhaCadastrada', senha);

            // Sucesso e Redirecionamento
            alert(`Conta criada com sucesso, Técnico ${nome}!`);
            window.location.href = "index.html"; 

        } catch (error) {
            console.error("Erro ao salvar no LocalStorage:", error);
            this.notificar("Erro ao salvar os dados. Verifique as permissões do seu navegador.");
        }
    }

    notificar(mensagem) {
        // Aqui você pode trocar por um modal customizado no futuro
        alert(mensagem);
    }
}

// Inicializa o sistema de cadastro
const sistemaCadastro = new CadastroManager();
