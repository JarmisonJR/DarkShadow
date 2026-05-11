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
