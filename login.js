const formLogin = document.querySelector('form');

formLogin.addEventListener('submit', (e) => {
    e.preventDefault();

    const emailInput = document.getElementById('email').value;
    const senhaInput = document.getElementById('password').value;

    // Busca os dados que foram salvos no momento do cadastro
    const emailSalvo = localStorage.getItem('emailCadastrado');
    const senhaSalva = localStorage.getItem('senhaCadastrada');

    // Compara os dados
    if (emailInput === emailSalvo && senhaInput === senhaSalva) {
        // Se estiver correto, leva para a página interna (ex: home.html ou dashboard.html)
        window.location.href = "dashboard.html"; 
    } else {
        alert('Erro: Email ou senha não conferem com o cadastro!');
    }
});
// Localize a função que faz o login ou que entra no dashboard
function entrarNoSistema() {
    const nomeInput = document.getElementById('nome-tecnico-login').value;

    if (nomeInput) {
        // ESSA LINHA É A CHAVE: Ela guarda o nome para o Dashboard ler depois
        localStorage.setItem('SAD_PRO_USER_NAME', nomeInput);
        
        // Depois de salvar, ele vai para o dashboard
        window.location.href = "dashboard.html"; 
    } else {
        alert("Por favor, digite seu nome.");
    }
}
