// Configuração do Banco de Dados do Escritório
const urlDb = 'https://uhddyxmflimxakurztoj.supabase.co';
const chaveDb = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVoZGR5eG1mbGlteGFrdXJ6dG9qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2Mjg5NTIsImV4cCI6MjA4ODIwNDk1Mn0.TQJjS9ijbeCzsp0KdyhKgc27ouopZTqII66BLU7dtMg';

// Usamos 'appBanco' para evitar o erro de "Identifier already declared"
const appBanco = window.supabase.createClient(urlDb, chaveDb);

// 1. Atualiza o saldo assim que o app abre
atualizarSaldo();

async function atualizarSaldo() {
    const { data, error } = await appBanco.from('movimentacoes').select('valor, tipo');
    if (error) return console.error("Erro ao buscar saldo:", error);

    let total = 0;
    data.forEach(m => {
        if (m.tipo === 'entrada') total += m.valor;
        else total -= m.valor;
    });

    document.getElementById('saldo-valor').innerText = `R$ ${total.toFixed(2)}`;
}

async function lancar(tipo) {
    // Pega os IDs corretos do novo HTML com descrição
    const inputValor = tipo === 'entrada' ? 'valor-entrada' : 'valor-saida';
    const inputDesc = tipo === 'entrada' ? 'desc-entrada' : 'desc-saida';
    
    const valor = parseFloat(document.getElementById(inputValor).value);
    const descricao = document.getElementById(inputDesc).value;
    const dataHoje = new Date().toISOString().split('T')[0];

    if (isNaN(valor) || valor <= 0) return alert("Digite um valor válido.");
    if (!descricao) return alert("Por favor, informe a descrição (origem/destino).");

    const { error } = await appBanco.from('movimentacoes').insert([
        { 
            valor: valor, 
            tipo: tipo, 
            data: dataHoje, 
            descricao: descricao.toUpperCase() 
        }
    ]);

    if (error) {
        alert("Erro ao salvar no banco!");
        console.error(error);
    } else {
        // Limpa os campos após o sucesso
        document.getElementById(inputValor).value = '';
        document.getElementById(inputDesc).value = '';
        
        atualizarSaldo();
        // Se o histórico estiver aberto, ele atualiza na hora
        if (document.getElementById('secao-detalhada').style.display === 'block') {
            carregarHistoricoCompleto();
        }
    }
}

function alternarHistorico() {
    const secao = document.getElementById('secao-detalhada');
    secao.style.display = secao.style.display === 'none' ? 'block' : 'none';
    if (secao.style.display === 'block') carregarHistoricoCompleto();
}

async function carregarHistoricoCompleto() {
    const mesSelecionado = document.getElementById('filtro-mes').value;
    const listaAgrupada = document.getElementById('lista-agrupada');

    const { data, error } = await appBanco.from('movimentacoes').select('*').order('data', { ascending: false });
    if (error) return console.error("Erro ao carregar histórico:", error);

    const dadosFiltrados = data.filter(m => {
        if (mesSelecionado === "todos") return true;
        return m.data.split('-')[1] === mesSelecionado;
    });

    if (dadosFiltrados.length === 0) {
        listaAgrupada.innerHTML = "<p style='font-size:12px; color:gray; text-align:center;'>Nenhum registro encontrado.</p>";
        return;
    }

    const dias = {};
    dadosFiltrados.forEach(m => {
        if (!dias[m.data]) dias[m.data] = [];
        dias[m.data].push(m);
    });

    listaAgrupada.innerHTML = Object.keys(dias).map(dataDia => {
        const movs = dias[dataDia];
        const saldoDia = movs.reduce((acc, m) => m.tipo === 'entrada' ? acc + m.valor : acc - m.valor, 0);
        const dataFormatada = dataDia.split('-').reverse().slice(0, 2).join('/');

        return `
            <div style="border-left: 4px solid #34495e; padding-left: 10px; margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 13px; border-bottom: 1px solid #eee;">
                    <span>Dia ${dataFormatada}</span>
                    <span style="color: ${saldoDia >= 0 ? '#27ae60' : '#e74c3c'}">R$ ${saldoDia.toFixed(2)}</span>
                </div>
                ${movs.map(m => `
                    <div style="font-size: 11px; display: flex; justify-content: space-between; align-items: center; margin-top: 5px; color: #666;">
                        <span title="${m.tipo}">${m.descricao}</span>
                        <div>
                            <span style="color: ${m.tipo === 'entrada' ? '#27ae60' : '#e74c3c'}">
                                ${m.tipo === 'entrada' ? '+' : '-'} R$ ${m.valor.toFixed(2)}
                            </span>
                            <button onclick="deletarMovimentacao(${m.id})" style="background:none; border:none; cursor:pointer; color: #e74c3c; margin-left: 5px;">🗑️</button>
                        </div>
                    </div>
                `).join('')}
            </div>`;
    }).join('');
}

async function deletarMovimentacao(id) {
    if (confirm("Deseja realmente excluir este lançamento?")) {
        const { error } = await appBanco.from('movimentacoes').delete().eq('id', id);
        if (!error) { 
            atualizarSaldo(); 
            carregarHistoricoCompleto(); 
        } else {
            alert("Erro ao excluir.");
        }
    }
}

function gerarQR() {
    const meuIP = "192.168.1.100"; // <--- Verifique se este é seu IP atual no cmd (ipconfig)
    const canvas = document.getElementById('canvas-qr');
    const modal = document.getElementById('modal-qr');
    
    QRCode.toCanvas(canvas, `exp://${meuIP}:8081`, { width: 180 }, function (error) {
        if (error) console.error(error);
        modal.style.display = modal.style.display === 'none' ? 'block' : 'none';
    });
}