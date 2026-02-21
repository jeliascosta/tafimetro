// app.js

const tituloGraficos = document.getElementById('titulo-graficos');
const inputIdade = document.getElementById('idade');

// Tabelas de pontuação por atividade e faixa etária
// Moved to a separate file: js/tabelasPontuacao.js
const tabelasPontuacao = window.tabelasPontuacao || {};

// Função para obter faixa etária do usuário
function obterFaixaEtaria(idade, atividade) {
    // Natação usa faixas diferentes da corrida
    if (atividade === 'natacao50' || atividade === 'natacao100') {
        if (idade <= 30) return '18a30';
        if (idade <= 40) return '31a40';
        if (idade <= 49) return '41a49';
        return '50ouMais';
    }

    // Corrida 2.4km e Caminhada 4.8km usam 6 faixas
    if (atividade === 'corrida2400' || atividade === 'caminhada4800') {
        if (idade <= 25) return '18a25';
        if (idade <= 33) return '26a33';
        if (idade <= 39) return '34a39';
        if (idade <= 45) return '40a45';
        if (idade <= 49) return '46a49';
        return '50ouMais';
    }

    // Corrida 3.2km usa 7 faixas
    if (atividade === 'corrida3200') {
        if (idade <= 25) return '18a25';
        if (idade <= 33) return '26a33';
        if (idade <= 39) return '34a39';
        if (idade <= 45) return '40a45';
        if (idade <= 49) return '46a49';
        if (idade <= 54) return '50a54';
        return '55ouMais';
    }
}

// Função para preencher tabela de notas
function preencherTabelaNotas(atividade, idade, sexo) {
    const faixaEtaria = obterFaixaEtaria(idade, atividade);
    const tabela = tabelasPontuacao[atividade];
    const sexoTabela = sexo === 'M' ? 'masculino' : 'feminino';

    if (!tabela || !tabela[sexoTabela] || !tabela[sexoTabela][faixaEtaria]) {
        console.warn('Tabela não encontrada para atividade:', atividade, 'sexo:', sexo, 'faixa:', faixaEtaria);
        return;
    }

    // Atualizar cabeçalho da tabela baseado na atividade
    const thead = document.querySelector('.tabela-notas thead tr');
    if (thead) {
        if (atividade === 'natacao50' || atividade === 'natacao100') {
            thead.innerHTML = `
                <th>Nota</th>
                <th>Tempo</th>
            `;
        } else {
            thead.innerHTML = `
                <th>Nota</th>
                <th>Tempo</th>
                <th>Pace</th>
            `;
        }
    }

    const pontosFaixa = tabela[sexoTabela][faixaEtaria];
    const tbody = document.getElementById('tabelaNotas');
    if (!tbody) return;

    // Limpar tabela
    tbody.innerHTML = '';

    // Obter distância para cálculo do pace
    const distancias = {
        'corrida2400': 2.4,
        'corrida3200': 3.2,
        'natacao50': 0.05,
        'natacao100': 0.1,
        'caminhada4800': 4.8
    };
    const distancia = distancias[atividade] || 1;

    // Preencher com todas as notas (100-50 com incremento de -1)
    const notas = [];
    for (let nota = 100; nota >= 50; nota--) {
        notas.push(nota);
    }

    for (const nota of notas) {
        let tempo = '--';
        let pace = '--';

        if (pontosFaixa[nota]) {
            // Nota existe diretamente na tabela
            tempo = pontosFaixa[nota];
            const tempoSegundos = tempoStringParaSegundos(tempo);

            // Calcular pace
            if (atividade === 'natacao50' || atividade === 'natacao100') {
                // Para natação: pace por 100m
                const distanciaMetros = atividade === 'natacao50' ? 50 : 100;
                const pacePor100m = (tempoSegundos / distanciaMetros) * 100;
                pace = segundosParaMMSS(pacePor100m) + ' /100m';
            } else {
                // Para corrida/caminhada: pace por km
                const paceSegundos = tempoSegundos / distancia;
                pace = segundosParaMMSS(paceSegundos) + ' /km';
            }
        } else {
            // Nota não existe diretamente, precisamos interpolar
            try {
                const notaCalculada = calcularNotaPorTabela('00:00', idade, sexo, atividade);
                // Aqui precisamos encontrar o tempo para esta nota específica
                // Vamos usar interpolação inversa
                tempo = tempoParaNotaEspecifica(nota, idade, sexo, atividade);
                if (tempo !== '--') {
                    const tempoSegundos = tempoStringParaSegundos(tempo);

                    // Calcular pace
                    if (atividade === 'natacao50' || atividade === 'natacao100') {
                        // Para natação: pace por 100m
                        const distanciaMetros = atividade === 'natacao50' ? 50 : 100;
                        const pacePor100m = (tempoSegundos / distanciaMetros) * 100;
                        pace = segundosParaMMSS(pacePor100m) + ' /100m';
                    } else {
                        // Para corrida/caminhada: pace por km
                        const paceSegundos = tempoSegundos / distancia;
                        pace = segundosParaMMSS(paceSegundos) + ' /km';
                    }
                }
            } catch (e) {
                // Mantém '--' se não for possível calcular
            }
        }

        const tr = document.createElement('tr');

        // Verificar se nota termina em 0 para aplicar estilo especial
        if (nota % 10 === 0) {
            tr.style.backgroundColor = '#333333';
            tr.style.color = '#ffffff';
        }

        // Verificar se é natação para remover coluna pace
        if (atividade === 'natacao50' || atividade === 'natacao100') {
            tr.innerHTML = `
                <td>${nota}</td>
                <td>${tempo}</td>
            `;
        } else {
            tr.innerHTML = `
                <td>${nota}</td>
                <td>${tempo}</td>
                <td>${pace}</td>
            `;
        }
        tbody.appendChild(tr);
    }
}

// Função auxiliar para encontrar tempo para uma nota específica usando interpolação inversa
function tempoParaNotaEspecifica(notaDesejada, idade, sexo, atividade) {
    const faixaEtaria = obterFaixaEtaria(idade, atividade);
    const tabela = tabelasPontuacao[atividade];
    const sexoTabela = sexo === 'M' ? 'masculino' : 'feminino';

    if (!tabela || !tabela[sexoTabela] || !tabela[sexoTabela][faixaEtaria]) {
        return '--';
    }

    const pontosFaixa = tabela[sexoTabela][faixaEtaria];
    const pontos = Object.keys(pontosFaixa).map(Number).sort((a, b) => a - b);

    if (pontos.length < 2) return '--';

    // Encontrar pontos que envolvem a nota desejada
    for (let i = 0; i < pontos.length - 1; i++) {
        const notaInferior = pontos[i];
        const notaSuperior = pontos[i + 1];

        if (notaDesejada >= notaInferior && notaDesejada <= notaSuperior) {
            const tempoInferior = tempoStringParaSegundos(pontosFaixa[notaInferior]);
            const tempoSuperior = tempoStringParaSegundos(pontosFaixa[notaSuperior]);

            // Interpolação linear
            const proporcao = (notaDesejada - notaInferior) / (notaSuperior - notaInferior);
            const tempoInterpolado = tempoInferior + proporcao * (tempoSuperior - tempoInferior);

            return segundosParaMMSS(tempoInterpolado);
        }
    }

    return '--';
}

// Função para calcular nota baseada nas novas tabelas
function calcularNotaPorTabela(tempo, idade, sexo, atividade) {
    const faixaEtaria = obterFaixaEtaria(idade, atividade);
    const tabela = tabelasPontuacao[atividade];

    // Converter sexo do select para o formato da tabela
    const sexoTabela = sexo === 'M' ? 'masculino' : 'feminino';

    if (!tabela || !tabela[sexoTabela] || !tabela[sexoTabela][faixaEtaria]) {
        console.warn('Tabela não encontrada para atividade:', atividade, 'sexo:', sexo, 'faixa:', faixaEtaria);
        return 0;
    }

    const pontosFaixa = tabela[sexoTabela][faixaEtaria];
    const tempoSegundos = tempoStringParaSegundos(tempo);

    // Verificar se deve calcular notas > 100
    const calcularMaior100 = document.getElementById('calcularMaior100')?.value === 'sim';

    // Encontrar os pontos mais próximos para interpolação
    const pontos = Object.keys(pontosFaixa).map(Number).sort((a, b) => a - b);

    if (pontos.length === 0) return 0;

    // Se calcularMaior100 estiver ativo, não limitar a 100
    if (!calcularMaior100) {
        // Verificar se o tempo é muito lento (maior que o tempo para 50 pontos)
        const tempo50pontos = tempoStringParaSegundos(pontosFaixa[50]);
        if (tempoSegundos > tempo50pontos) {
            return 0;
        }
    }

    // Se o tempo for exatamente um dos tempos da tabela
    for (const ponto of pontos) {
        if (Math.abs(tempoStringParaSegundos(pontosFaixa[ponto]) - tempoSegundos) < 0.5) {
            return ponto;
        }
    }

    // Interpolação linear entre os dois pontos mais próximos
    return interpolarPontos(tempoSegundos, pontos, pontosFaixa);
}

// Função para interpolar linearmente entre pontos
function interpolarPontos(tempoSegundos, pontos, temposPorPonto) {
    if (pontos.length === 1) {
        return pontos[0];
    }

    // Verificar se deve calcular notas > 100
    const calcularMaior100 = document.getElementById('calcularMaior100')?.value === 'sim';

    // Encontrar os pontos que envolvem o tempo
    let pontoInferior = null;
    let pontoSuperior = null;

    for (let i = 0; i < pontos.length - 1; i++) {
        const tempoAtual = tempoStringParaSegundos(temposPorPonto[pontos[i]]);
        const proximoTempo = tempoStringParaSegundos(temposPorPonto[pontos[i + 1]]);

        // Para corrida: tempos menores = notas maiores
        // Verificar se o tempo está entre os dois pontos (invertido)
        if (tempoSegundos <= tempoAtual && tempoSegundos >= proximoTempo) {
            pontoInferior = pontos[i];
            pontoSuperior = pontos[i + 1];
            break;
        }
    }

    // Se calcularMaior100 estiver ativo e o tempo for melhor que nota 100
    if (calcularMaior100 && tempoSegundos < tempoStringParaSegundos(temposPorPonto[100])) {
        // Extrapolation: continuar a tendência além de 100
        const tempo100 = tempoStringParaSegundos(temposPorPonto[100]);
        const tempo90 = tempoStringParaSegundos(temposPorPonto[90]);

        if (pontos.length >= 2 && pontos[pontos.length - 1] === 100) {
            // Calcular taxa de melhora entre 90 e 100
            const taxaMelhora = (tempo90 - tempo100) / 10; // segundos por ponto acima de 90
            const pontosAcima100 = Math.floor((tempo90 - tempoSegundos) / taxaMelhora);
            return 100 + pontosAcima100;
        }
    }

    if (!pontoInferior || !pontoSuperior) {
        // Se estiver fora dos limites, retornar o ponto mais próximo
        if (calcularMaior100) {
            // Com calcularMaior100, permite extrapolation
            if (tempoSegundos < tempoStringParaSegundos(temposPorPonto[100])) {
                // Tempo melhor que 100 - extrapolation
                const tempo100 = tempoStringParaSegundos(temposPorPonto[100]);
                const tempo90 = tempoStringParaSegundos(temposPorPonto[90]);
                const taxaMelhora = (tempo90 - tempo100) / 10;
                const pontosAcima100 = Math.floor((tempo90 - tempoSegundos) / taxaMelhora);
                return 100 + pontosAcima100;
            }
        }

        const ultimoPonto = pontos[pontos.length - 1];
        const tempoUltimo = tempoStringParaSegundos(temposPorPonto[ultimoPonto]);
        return tempoSegundos <= tempoUltimo ? ultimoPonto : 0;
    }

    // Interpolação linear normal
    const tempoInferior = tempoStringParaSegundos(temposPorPonto[pontoInferior]);
    const tempoSuperior = tempoStringParaSegundos(temposPorPonto[pontoSuperior]);

    const proporcao = (tempoSegundos - tempoInferior) / (tempoSuperior - tempoInferior);
    return pontoInferior + proporcao * (pontoSuperior - pontoInferior);
}

// Função para atualizar emojis e texto baseado no sexo selecionado
function atualizarEmojisPorSexo(sexo) {
    // Atualiza emoji no label do campo sexo
    const labelSexo = document.querySelector('label[for="sexo"]');
    if (labelSexo) {
        labelSexo.innerHTML = sexo === 'M' ? '👨 Sexo:' : '👩 Sexo:';
    }

    // Atualiza emoji no título TAFímetro
    const tituloEmojis = document.getElementById('tituloEmojis');
    if (tituloEmojis) {
        const emojiCorredor = sexo === 'M' ? '🏃🏻‍♂️' : '🏃🏻‍♀️';
        const emojiNatacao = sexo === 'M' ? '🏊‍♂️' : '🏊‍♀️';
        // Atualiza apenas o span com os emojis
        tituloEmojis.textContent = `${emojiCorredor}${emojiNatacao}`;
    }

    // Atualiza a frase de instrução
    const instrucaoFrase = document.getElementById('instrucaoFrase');
    if (instrucaoFrase) {
        const genero = sexo === 'M' ? 'Desbravador' : 'Desbravadora';
        instrucaoFrase.textContent = `📈 ${genero}, insira os dados da sua corrida!`;
    }

    // Atualizar emoji da atividade
    atualizarEmojiAtividade();
}

// Função para atualizar emoji da atividade
function atualizarEmojiAtividade() {
    const atividadeSelect = document.getElementById('atividade');
    const sexoSelect = document.getElementById('sexo');
    const labelAtividade = document.querySelector('label[for="atividade"]');

    if (!atividadeSelect || !sexoSelect || !labelAtividade) return;

    const atividade = atividadeSelect.value;
    const sexo = sexoSelect.value;

    const emojis = {
        'corrida2400': sexo === 'M' ? '🏃‍♂️' : '🏃‍♀️',
        'corrida3200': sexo === 'M' ? '🏃‍♂️' : '🏃‍♀️',
        'natacao50': sexo === 'M' ? '🏊‍♂️' : '🏊‍♀️',
        'natacao100': sexo === 'M' ? '🏊‍♂️' : '🏊‍♀️',
        'caminhada4800': sexo === 'M' ? '🚶‍♂️' : '🚶‍♀️'
    };

    const emoji = emojis[atividade] || '🏃';
    labelAtividade.innerHTML = `${emoji} Teste:`;
}

// Preenche tabela de referência com faixas etárias intercaladas por sexo
function preencherTabelaReferencia() {
    const tbody = document.getElementById('tabelaTemposReferencia');
    if (!tbody) return;

    tbody.innerHTML = '';

    // Obter atividade selecionada
    const atividadeSelect = document.getElementById('atividade');
    if (!atividadeSelect) return;

    const atividade = atividadeSelect.value;

    // Obter idade e sexo selecionados
    const idade = parseInt(document.getElementById('idade').value) || 30;
    const sexo = document.getElementById('sexo').value;

    // Obter todas as faixas etárias para a atividade
    const faixasEtarias = obterTodasFaixasEtarias(atividade);

    // Definir notas de 100 para 50 com decremento de 10
    const notas = [100, 90, 80, 70, 60, 50];

    // Criar cabeçalho dinâmico
    const thead = tbody.previousElementSibling;
    if (thead) {
        let headerHtml = '<tr><th>Faixa Etária</th>';

        // Adicionar colunas para cada nota
        for (const nota of notas) {
            headerHtml += `<th>Nota ${nota}</th>`;
        }
        headerHtml += '</tr>';
        thead.innerHTML = headerHtml;
    }

    // Preencher tabela com faixas etárias intercaladas por sexo
    for (const faixa of faixasEtarias) {
        // Linha masculino
        const trMasc = document.createElement('tr');
        let rowHtmlMasc = `<td>${faixa.nome} (M)</td>`;

        for (const nota of notas) {
            let tempo = '--';

            try {
                tempo = tempoParaNotaEspecifica(nota, faixa.idadeRepresentativa, 'M', atividade);
            } catch (err) {
                console.warn(`Erro ao obter tempo masculino para ${faixa.nome} nota ${nota}:`, err);
            }

            rowHtmlMasc += `<td>${tempo}</td>`;
        }

        trMasc.innerHTML = rowHtmlMasc;
        tbody.appendChild(trMasc);

        // Linha feminino
        const trFem = document.createElement('tr');
        let rowHtmlFem = `<td>${faixa.nome} (F)</td>`;

        for (const nota of notas) {
            let tempo = '--';

            try {
                tempo = tempoParaNotaEspecifica(nota, faixa.idadeRepresentativa, 'F', atividade);
            } catch (err) {
                console.warn(`Erro ao obter tempo feminino para ${faixa.nome} nota ${nota}:`, err);
            }

            rowHtmlFem += `<td>${tempo}</td>`;
        }

        trFem.innerHTML = rowHtmlFem;
        tbody.appendChild(trFem);
    }
}

// Função para obter todas as faixas etárias de uma atividade
function obterTodasFaixasEtarias(atividade) {
    const faixas = [];

    if (atividade === 'natacao50' || atividade === 'natacao100') {
        faixas.push(
            { nome: '18-30', idadeRepresentativa: 24 },
            { nome: '31-40', idadeRepresentativa: 35 },
            { nome: '41-49', idadeRepresentativa: 45 },
            { nome: '50+', idadeRepresentativa: 55 }
        );
    } else if (atividade === 'corrida2400' || atividade === 'caminhada4800') {
        faixas.push(
            { nome: '18-25', idadeRepresentativa: 22 },
            { nome: '26-33', idadeRepresentativa: 30 },
            { nome: '34-39', idadeRepresentativa: 37 },
            { nome: '40-45', idadeRepresentativa: 43 },
            { nome: '46-49', idadeRepresentativa: 48 },
            { nome: '50+', idadeRepresentativa: 55 }
        );
    } else if (atividade === 'corrida3200') {
        faixas.push(
            { nome: '18-25', idadeRepresentativa: 22 },
            { nome: '26-33', idadeRepresentativa: 30 },
            { nome: '34-39', idadeRepresentativa: 37 },
            { nome: '40-45', idadeRepresentativa: 43 },
            { nome: '46-49', idadeRepresentativa: 48 },
            { nome: '50-54', idadeRepresentativa: 52 },
            { nome: '55+', idadeRepresentativa: 58 }
        );
    }

    return faixas;
}

// Função auxiliar para obter tempo para nota 100
function tempoParaNota100(idade, sexo, atividade) {
    const faixaEtaria = obterFaixaEtaria(idade, atividade);
    const tabela = tabelasPontuacao[atividade];

    if (!tabela || !tabela[sexo === 'M' ? 'masculino' : 'feminino'] || !tabela[sexo === 'M' ? 'masculino' : 'feminino'][faixaEtaria]) {
        return '--';
    }

    const pontosFaixa = tabela[sexo === 'M' ? 'masculino' : 'feminino'][faixaEtaria];
    return pontosFaixa[100] || '--';
}

// Função helper para obter distância formatada da atividade selecionada
function obterDistanciaFormatada() {
    const atividadeSelect = document.getElementById('atividade');
    if (!atividadeSelect) return 2.4; // valor padrão

    const distancias = {
        'corrida2400': 2.4,
        'corrida3200': 3.2,
        'natacao50': 0.05,
        'natacao100': 0.1,
        'caminhada4800': 4.8
    };

    const atividade = atividadeSelect.value;
    return distancias[atividade] || 2.4;
}

document.addEventListener('DOMContentLoaded', function () {
    const tEl = document.getElementById('tempoMinutos');
    const sEl = document.getElementById('tempoSegundos');
    const iEl = document.getElementById('idade');
    const sexoEl = document.getElementById('sexo');
    const aEl = document.getElementById('atividade');

    // Definir valores iniciais dos seletores de tempo
    const tempoInicial = '01:37'; // Valor padrão
    const [minutosPadrao, segundosPadrao] = tempoInicial.split(':');

    // Definir valores padrão primeiro
    if (tEl) tEl.value = minutosPadrao;
    if (sEl) sEl.value = segundosPadrao;

    // Recuperar valores salvos do localStorage
    const vT = localStorage.getItem('tafimetro_tempo');
    const vI = localStorage.getItem('tafimetro_idade');
    const vS = localStorage.getItem('tafimetro_sexo');
    const vA = localStorage.getItem('tafimetro_atividade');
    const vN = localStorage.getItem('tafimetro_nome');

    // Aplicar valores salvos (se existirem)
    if (tEl && vT != null) {
        const [minutos, segundos] = vT.split(':');
        tEl.value = minutos;
        if (sEl) sEl.value = segundos;
    }
    if (iEl && vI != null) iEl.value = vI;
    if (sexoEl && vS != null) sexoEl.value = vS;
    if (aEl && vA != null) aEl.value = vA;
    const nomeInput = document.getElementById('nome');
    if (nomeInput && vN != null) nomeInput.value = vN;

    // Adicionar event listeners para salvar mudanças
    if (tEl) tEl.addEventListener('input', () => {
        const minutos = tEl.value;
        const segundos = sEl ? sEl.value : '00';
        localStorage.setItem('tafimetro_tempo', `${minutos}:${segundos}`);
    });

    if (sEl) sEl.addEventListener('input', () => {
        const minutos = tEl ? tEl.value : '30';
        const segundos = sEl.value;
        localStorage.setItem('tafimetro_tempo', `${minutos}:${segundos}`);
    });

    if (iEl) iEl.addEventListener('change', () => localStorage.setItem('tafimetro_idade', iEl.value || ''));
    if (sexoEl) sexoEl.addEventListener('change', () => localStorage.setItem('tafimetro_sexo', sexoEl.value || ''));
    if (aEl) aEl.addEventListener('change', () => {
        localStorage.setItem('tafimetro_atividade', aEl.value || '');
        atualizarEmojiAtividade();
    });
    if (nomeInput)
        nomeInput.addEventListener('input', function () {
            localStorage.setItem('tafimetro_nome', nomeInput.value);
        });

    // Adicionar event listener para calcularMaior100
    const calcularMaior100El = document.getElementById('calcularMaior100');
    if (calcularMaior100El) {
        // Recuperar valor salvo do localStorage
        const vMaior100 = localStorage.getItem('tafimetro_calcularMaior100');
        if (vMaior100 != null) {
            calcularMaior100El.value = vMaior100;
        }

        // Adicionar event listener para salvar mudanças
        calcularMaior100El.addEventListener('change', () => {
            localStorage.setItem('tafimetro_calcularMaior100', calcularMaior100El.value || '');
        });
    }

    // Atualizar emojis na inicialização
    if (sexoEl) {
        sexoEl.addEventListener('change', () => {
            localStorage.setItem('tafimetro_sexo', sexoEl.value || '');
            atualizarEmojisPorSexo(sexoEl.value);
        });
        atualizarEmojisPorSexo(sexoEl.value);
    }

    // Atualizar emoji da atividade na inicialização
    atualizarEmojiAtividade();

    // Handler para toggle da faixa etária
    const toggleFaixa = document.getElementById('toggleFaixa');
    if (toggleFaixa) {
        // Carregar estado salvo do localStorage
        const savedState = localStorage.getItem('tafimetro_mostrarFaixa');
        if (savedState !== null) {
            toggleFaixa.checked = savedState === 'true';
        }

        toggleFaixa.addEventListener('change', () => {
            const scoreFaixaEtaria = document.getElementById('scoreFaixaEtaria');
            if (scoreFaixaEtaria) {
                scoreFaixaEtaria.style.display = toggleFaixa.checked ? 'flex' : 'none';
            }
            // Salvar estado no localStorage
            localStorage.setItem('tafimetro_mostrarFaixa', toggleFaixa.checked);
        });

        // Aplicar estado inicial
        const scoreFaixaEtaria = document.getElementById('scoreFaixaEtaria');
        if (scoreFaixaEtaria) {
            scoreFaixaEtaria.style.display = toggleFaixa.checked ? 'flex' : 'none';
        }
    }

    // Handler para toggle do nome
    const toggleNome = document.getElementById('toggleNome');
    if (toggleNome) {
        // Carregar estado salvo do localStorage
        const savedState = localStorage.getItem('tafimetro_mostrarNome');
        if (savedState !== null) {
            toggleNome.checked = savedState === 'true';
        }

        toggleNome.addEventListener('change', () => {
            const scoreNome = document.getElementById('scoreNome');
            if (scoreNome) {
                scoreNome.style.display = toggleNome.checked ? 'flex' : 'none';
            }
            // Salvar estado no localStorage
            localStorage.setItem('tafimetro_mostrarNome', toggleNome.checked);
        });

        // Aplicar estado inicial
        const scoreNome = document.getElementById('scoreNome');
        if (scoreNome) {
            scoreNome.style.display = toggleNome.checked ? 'flex' : 'none';
        }
    }

    // Função unificada para gerar card com tratamento de estilos
    async function gerarCardParaExportacao() {
        const card = document.getElementById('shareCard');
        if (!card || card.style.display === 'none') {
            throw new Error('Nenhum card gerado ainda!');
        }

        // Salvar os estilos originais
        const originalBorderRadius = card.style.borderRadius;
        const originalBoxShadow = card.style.boxShadow;

        // Remover estilos temporariamente
        card.style.borderRadius = '0';
        card.style.boxShadow = 'none';
        const scale = 4; // Aumentar escala para melhorar qualidade

        try {
            const canvas = await html2canvas(card, {
                scale,
                backgroundColor: null,
                useCORS: true,
                logging: false
            });

            // Restaurar os estilos originais
            card.style.borderRadius = originalBorderRadius;
            card.style.boxShadow = originalBoxShadow;

            // Cortar 2px de cada lado (total 6px considerando scale 3)
            const ctx = canvas.getContext('2d');
            const pixelsParaCortar = 2 * scale; // 2px × 3 (scale) = 6px
            const pixelsLaterais = 2 * scale; // 2px × 3 (scale) = 6px de cada lado

            // Cortar laterais e inferior
            const imageData = ctx.getImageData(
                pixelsLaterais,
                0,
                canvas.width - pixelsLaterais,
                canvas.height - pixelsParaCortar
            );
            const croppedCanvas = document.createElement('canvas');
            croppedCanvas.width = canvas.width - pixelsLaterais;
            croppedCanvas.height = canvas.height - pixelsParaCortar;
            croppedCanvas.getContext('2d').putImageData(imageData, 0, 0);

            return croppedCanvas;
        } catch (error) {
            // Restaurar estilos em caso de erro
            card.style.borderRadius = originalBorderRadius;
            card.style.boxShadow = originalBoxShadow;
            throw error;
        }
    }

    // Handler para copiar/baixar somente o card (movido do index.html)
    const btnShareCard = document.getElementById('copyCardBtn');
    if (!btnShareCard) return;
    btnShareCard.addEventListener('click', async () => {
        try {
            const canvas = await gerarCardParaExportacao();
            const filename = montarNomeArquivo();
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png', 1));
            // const text = 'Meu card do TAFímetro';
            const text = '';

            if (blob) {
                const file = new File([blob], filename, { type: 'image/png' });
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({ files: [file], title: 'TAFímetro', text });
                    return;
                }
            }
            if (navigator.share) {
                const dataUrl = canvas.toDataURL('image/png', 1);
                await navigator.share({ title: 'TAFímetro', text, url: dataUrl });

                return;
            }

            // Fallback: abrir em nova aba
            if (blob) {
                const url = URL.createObjectURL(blob);
                window.open(url, '_blank');
            } else {
                const dataUrl = canvas.toDataURL('image/png', 1);
                window.open(dataUrl, '_blank');
            }
        } catch (e) {
            console.error('Falha ao exportar card:', e);
            alert(e.message || 'Não foi possível gerar a imagem.');
        }
    });

    const btnDownloadCard = document.getElementById('downloadCardBtn');
    if (btnDownloadCard) {
        btnDownloadCard.addEventListener('click', async () => {
            try {
                const canvas = await gerarCardParaExportacao();

                // Criar link de download
                const dataUrl = canvas.toDataURL('image/png');
                const link = document.createElement('a');
                link.download = `tafimetro-card-${new Date().toISOString().split('T')[0]}.png`;
                link.href = dataUrl;

                // Adicionar ao documento, clicar e remover
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

            } catch (err) {
                console.error('Erro ao baixar o card:', err);
                alert(err.message || 'Não foi possível baixar o card. Tente novamente.');
            }
        });
    }

    // Manipulação do formulário
    document.getElementById('calcForm').addEventListener('submit', function (e) {
        e.preventDefault();

        // Atualizar emoji do card com base na atividade e sexo selecionados
        const atividadeSelect = document.getElementById('atividade');
        const sexoSelect = document.getElementById('sexo');
        const cardEmojiDireita = document.getElementById('cardEmojiDireita');

        if (atividadeSelect && sexoSelect && cardEmojiDireita) {
            const atividade = atividadeSelect.value;
            const sexo = sexoSelect.value;

            const emojis = {
                'corrida2400': sexo === 'M' ? '🏃‍♂️' : '🏃‍♀️',
                'corrida3200': sexo === 'M' ? '🏃‍♂️' : '🏃‍♀️',
                'natacao50': sexo === 'M' ? '🏊‍♂️' : '🏊‍♀️',
                'natacao100': sexo === 'M' ? '🏊‍♂️' : '🏊‍♀️',
                'caminhada4800': sexo === 'M' ? '🚶‍♂️' : '🚶‍♀️'
            };

            const emoji = emojis[atividade] || '🏃';
            cardEmojiDireita.textContent = emoji;
        }

        const idade = parseInt(document.getElementById('idade').value);
        const sexo = document.getElementById('sexo').value;
        const distancia = obterDistanciaFormatada();

        try {
            let nota;
            const minutos = document.getElementById('tempoMinutos').value;
            const segundos = document.getElementById('tempoSegundos').value;
            const tempo = `${minutos}:${segundos}`;
            const atividade = document.getElementById('atividade').value;

            // Obter nome da atividade para exibição
            const nomesAtividade = {
                'corrida2400': 'Corrida | 2.4km',
                'corrida3200': 'Corrida | 3.2km',
                'natacao50': 'Natação | 50m',
                'natacao100': 'Natação | 100m',
                'caminhada4800': 'Caminhada | 4.8km'
            };
            const atividadeNome = nomesAtividade[atividade] || 'Atividade';

            // Obter faixa etária para exibição
            const faixaEtaria = obterFaixaEtaria(idade, atividade);
            const nomesFaixaEtaria = {
                '18a25': 'Faixa: 18 a 25',
                '18a30': 'Faixa: 18 a 30',
                '26a33': 'Faixa: 26 a 33',
                '31a40': 'Faixa: 31 a 40',
                '34a39': 'Faixa: 34 a 39',
                '41a49': 'Faixa: 41 a 49',
                '40a45': 'Faixa: 40 a 45',
                '46a49': 'Faixa: 46 a 49',
                '50a54': 'Faixa: 50 a 54',
                '50ouMais': 'Faixa: 50 ou mais',
                '55ouMais': 'Faixa: 55 ou mais',
                '60ouMais': 'Faixa: 60 ou mais'
            };
            const faixaEtariaNome = nomesFaixaEtaria[faixaEtaria] || faixaEtaria;

            // Usar novo sistema de cálculo baseado em tabelas
            nota = calcularNotaPorTabela(tempo, idade, sexo, atividade);

            // Renderiza a "share card" estilo app de corrida
            const notaInteiro = Math.max(0, Math.floor(Number(nota) || 0));


            // zona de exemplo: décadas, 90+ é "90-100"
            function rotuloZona(n) {
                if (n >= 100) return '100+';
                if (n >= 90) return '90-99';
                return '60-69';
            }

            // Definir frases por sexo
            const frasesHomem = {
                '0-59': '💪 Continue treinando! 💪',
                '60-69': '📈 Melhorando! 📈',
                '70-79': '👍 Bom progresso! 👍',
                '80-89': '🔥 Ótimo desempenho! 🔥',
                '90-99': '⚡ DANGER ZONE ⚡',
                '100': '💯😂 DE BIKE, CTZ 😂',
                '100+': '🚀 EXTRATERRESTRE! �'
            };

            const frasesMulher = {
                '0-59': '💪 Continue treinando! 💪',
                '60-69': '📈 Melhorando! 📈',
                '70-79': '👍 Bom progresso! 👍',
                '80-89': '🔥 Ótimo desempenho! 🔥',
                '90-99': '😱🏅⚡ DANGER ZONE ⚡🏅😱',
                '100': '💯🏆😂 DE BIKE, CTZ 😂🏆💯',
                '100+': '🚀 EXTRATERRESTRE! 🚀'
            };

            const frasesCardPrint = {
                '60-69': '🎯 ZONA 2, PAGO!! 🎯',
                '70-79': '👏 SHOWD CADÊNCIA! 👏',
                '80-89': '🔥 Q TREINO TOP!! 🔥',
                '90-99': '⚡ DANGER ZONE ⚡',
                '100': '💯😂 DE BIKE, CTZ 😂',
                '100+': '🚀 EXTRATERRESTRE! 🚀'
            }
            const frasesHomemCardPrint = {
                ...frasesHomem,
                ...frasesCardPrint,
            }
            const frasesMulherCardPrint = {
                ...frasesMulher,
                ...frasesCardPrint,
            }
            const frases = sexo === 'F' ? frasesMulher : frasesHomem;
            const frasesPrint = sexo === 'F' ? frasesMulherCardPrint : frasesHomemCardPrint;

            // utilitários de cor (RGB)
            function rgbStringParaArray(rgb) {
                // Aceita tanto "rgb(r,g,b)" quanto array [r,g,b]
                if (Array.isArray(rgb)) return rgb;
                const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
                return match ? [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])] : [0, 0, 0];
            }
            function rgbArrayParaString([r, g, b]) {
                return `rgb(${r}, ${g}, ${b})`;
            }
            function interpolarRgb(a, b, t) {
                const ra = rgbStringParaArray(a), rb = rgbStringParaArray(b);
                const r = Math.round(ra[0] + (rb[0] - ra[0]) * t);
                const g = Math.round(ra[1] + (rb[1] - ra[1]) * t);
                const bl = Math.round(ra[2] + (rb[2] - ra[2]) * t);
                return rgbArrayParaString([r, g, bl]);
            }

            // paletas
            // usar cores do commit para repetir entre 40–89
            const pale = sexo === 'F' ? 'rgb(255, 232, 243)' : 'rgb(236, 247, 255)'; // commit: #ffe8f3 / #bce0fa
            const strong = sexo === 'F' ? 'rgb(255, 79, 134)' : 'rgb(82, 206, 255)'; // commit: #ff4f86 / #096cd5
            const strongM80 = 'rgb(133, 230, 254)';
            // const strongM80 = 'rgb(82, 206, 255)';
            const black90Start = 'rgb(40, 40, 40)'; // nota 90 bgStart (invertido)
            const black90End = 'rgb(65, 65, 65)'; // nota 90 bgEnd (invertido)
            const silverL90Start = 'rgb(225, 225, 225)'; // nota 90 bgStart (invertido)
            const silverL90End = 'rgb(240, 240, 240)'; // nota 90 bgEnd (invertido)
            const silverB90Start = 'rgb(180, 180, 180)'; // nota 90 bgStart (invertido)
            const silverB90End = 'rgb(240, 240, 240)'; // nota 90 bgEnd (invertido)
            const black = 'rgb(0, 0, 0)'; // nota 99 (preto total)
            const gold = 'rgb(255, 209, 102)'; // nota 100
            const goldM80 = 'rgb(255, 194, 51)'; // nota 100

            // ultimoTaf is already defined in the parent scope

            let bgStart, bgEnd;
            if (notaInteiro >= 100) {
                // Nota 100 ou maior: usar esquema dourado
                bgStart = gold;
                bgEnd = gold;
            }
            else if (notaInteiro < 90) {
                // Ajuste: o visual da nota 83 passa a ocorrer em 80, mantendo a variação final de 89
                if (notaInteiro < 80) {
                    // 40–79: pale -> strong (commit mapeado), t = (n-40)/40
                    const t = Math.max(0, Math.min(1, (notaInteiro - 40) / 40)); // 0..1 (40->80)
                    bgStart = interpolarRgb(pale, strong, t);
                    bgEnd = interpolarRgb(pale, strong, Math.max(0, t * 0.2));
                } else {
                    // 80–89: deslocar a cor de 85 para ocorrer em 80 e manter 89 igual
                    // t2(80) = (85-80)/9 = 5/9, t2(89) = 1  => t2 = 5/9 + (n-80)*(4/81)
                    const t2 = Math.max(0, Math.min(1, (5 / 9) + (notaInteiro - 80) * (4 / 81)));
                    bgStart = interpolarRgb(sexo === 'F' ? strong : strongM80, sexo === 'F' ? gold : goldM80, Math.min(1, t2 * 0.2));
                    bgEnd = interpolarRgb(sexo === 'F' ? strong : strongM80, sexo === 'F' ? gold : goldM80, t2);
                }
            }
            else {
                // >= 90: manter lógica atual de pretos e ouro
                if (notaInteiro < 95) {
                    const t = (notaInteiro - 90) / 5; // 0..1 (90->95)
                    bgStart = interpolarRgb(black90Start, black, t);
                    bgEnd = interpolarRgb(black90End, black, t);
                } else if (notaInteiro < 100) {
                    bgStart = black;
                    bgEnd = black;
                }
            }

            // cor do texto — fixa por sexo para < 90 (sem variação por luminância)
            let textColor;
            let atividadeTextColor;
            let faixaTextColor;

            if (notaInteiro >= 100) {
                // Nota 100 ou maior: usar esquema dourado
                textColor = sexo === 'F' ? '#2c0045ff' : '#002157ff';
                atividadeTextColor = sexo === 'F' ? '#2c0045ff' : '#002157ff';
                faixaTextColor = sexo === 'F' ? '#2c0045ff' : '#002157ff';
            }
            else if (notaInteiro >= 90) {
                // 90–99: fundo preto, texto claro
                textColor = sexo === 'F' ? 'rgb(230, 180, 204)' : 'rgb(156, 202, 221)';
                atividadeTextColor = sexo === 'F' ? 'rgb(230, 180, 204)' : 'rgb(156, 202, 221)';
                faixaTextColor = sexo === 'F' ? 'rgb(230, 180, 204)' : 'rgb(156, 202, 221)';
            } else {
                // < 90: cores normais
                textColor = sexo === 'F' ? 'rgb(54, 0, 96)' : 'rgb(0, 37, 96)';
                atividadeTextColor = sexo === 'F' ? 'rgb(54, 0, 96)' : 'rgb(0, 37, 96)';
                faixaTextColor = sexo === 'F' ? 'rgb(54, 0, 96)' : 'rgb(0, 37, 96)';
            }

            const zone = rotuloZona(notaInteiro);
            const phrase = frases[zone] || (notaInteiro >= 90 ? frases['100+'] : '💪 BORA VIBRAR! 💪');
            const printPhrase = (frasesPrint && frasesPrint[zone]) ? frasesPrint[zone] : phrase;

            // calcular tempo / pace para exibir no card
            let displayTempo = '--:--', displayPace = '--:--';
            try {
                const minutos = document.getElementById('tempoMinutos').value;
                const segundos = document.getElementById('tempoSegundos').value;
                const tempoVal = `${minutos}:${segundos}`;
                const seg = tempoStringParaSegundos(tempoVal);
                displayTempo = segundosParaMMSS(seg);

                // Verificar se é natação para mostrar pace por 100m
                if (atividade === 'natacao50' || atividade === 'natacao100') {
                    // Para natação: calcular pace por 100m diretamente
                    const distanciaMetros = atividade === 'natacao50' ? 50 : 100;
                    const pacePor100m = (seg / distanciaMetros) * 100;
                    displayPace = segundosParaMMSS(pacePor100m);
                } else {
                    displayPace = segundosParaMMSS(seg / distancia);
                }
            } catch (e) { /* segura se inputs faltarem */ }

            const distLabel = Number.isFinite(distancia)
                ? (parseFloat(distancia.toFixed(1)) % 1 === 0
                    ? `${(distancia * 1000).toFixed(0)} m`
                    : `${(distancia * 1000).toFixed(0)} m`)
                : `-- m`;

            const hoje = (() => {
                const d = new Date();
                const dia = String(d.getDate()).padStart(2, '0');
                const mes = String(d.getMonth() + 1).padStart(2, '0');
                const ano = String(d.getFullYear()).slice(-2);
                return `${dia}/${mes}/${ano}`;
            })();

            // Preenche a estrutura HTML estática do card
            const shareCardEl = document.getElementById('shareCard');
            shareCardEl.style.background = `linear-gradient(180deg, ${bgStart}, ${bgEnd})`;
            shareCardEl.style.color = textColor;
            shareCardEl.style.display = 'block';
            // Persistir dados para o clone usar a mesma frase de print
            if (shareCardEl && shareCardEl.dataset) {
                shareCardEl.dataset.zoneKey = zone;
                shareCardEl.dataset.sexo = sexo;
                shareCardEl.dataset.phrasePrint = printPhrase;
            }

            document.getElementById('cardDate').textContent = hoje;
            document.getElementById('scoreBig').textContent = notaInteiro;

            // Aplicar cores dinâmicas baseadas na nota
            const scoreAtividadeEl = document.getElementById('scoreAtividade');
            const scoreAtividadeTextEl = document.getElementById('scoreAtividadeText');
            const scoreFaixaEtariaEl = document.getElementById('scoreFaixaEtaria');
            const scoreNomeEl = document.getElementById('scoreNome');

            if (scoreAtividadeEl) {
                scoreAtividadeEl.style.color = atividadeTextColor;
            }
            if (scoreAtividadeTextEl) {
                scoreAtividadeTextEl.style.color = atividadeTextColor;
                scoreAtividadeTextEl.textContent = atividadeNome;
            }
            if (scoreFaixaEtariaEl) {
                scoreFaixaEtariaEl.style.color = faixaTextColor;
                scoreFaixaEtariaEl.textContent = "🔢 " + faixaEtariaNome;
            }
            if (scoreNomeEl) {
                const nome = document.getElementById('nome').value.trim();
                scoreNomeEl.style.color = textColor;
                scoreNomeEl.textContent = nome? `🫡 ${nome}` : '';
            }

            document.getElementById('zoneSmall').textContent = zone;
            document.getElementById('cardTempo').textContent = displayTempo;

            // Exibir pace com unidade correta
            if (atividade === 'natacao50' || atividade === 'natacao100') {
                document.getElementById('cardPace').textContent = `${displayPace} /100m`;
            } else {
                document.getElementById('cardPace').textContent = `${displayPace} /km`;
            }

            // Exibe o botão copiar e opções se o card existir
            const acoesCard = document.getElementById('cardActions');
            const opcoesCard = document.getElementById('opcoesCard');
            if (shareCardEl && shareCardEl.style.display !== 'none') {
                acoesCard.style.display = 'flex';
                opcoesCard.style.display = 'flex';
            } else {
                acoesCard.style.display = 'none';
                opcoesCard.style.display = 'none';
            }
            // Exibe a seção do compositor apenas após calcular a nota
            const compositor = document.getElementById('compositor');
            if (compositor) compositor.style.display = 'block';
            // Sincroniza o card no compositor com o novo conteúdo e largura
            if (typeof atualizarCardOverlayDoShareCard === 'function') atualizarCardOverlayDoShareCard();
            if (typeof recalibrarLarguraOverlayDaOrigem === 'function') recalibrarLarguraOverlayDaOrigem();
        } catch (error) {
            const shareCardEl = document.getElementById('shareCard');
            if (shareCardEl)
                shareCardEl.style.display = 'none';

            document.getElementById('nota').innerHTML = `<div style="color: red;">Erro: ${error.message}</div>`;
        }

    });

    preencherTabelaReferencia();
});

// Helpers
function tempoStringParaSegundos(t) {
    if (t == null) return NaN;
    if (typeof t === 'number') return t; // já em segundos
    const p = String(t).split(':').map(Number);
    if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2];
    if (p.length === 2) return p[0] * 60 + p[1];
    return NaN;
}

// formata segundos para mm:ss ou hh:mm:ss quando >= 3600s
function segundosParaMMSS(sec) {
    if (!isFinite(sec) || isNaN(sec)) return '--:--';
    const total = Math.round(sec);
    if (total >= 3600) {
        const h = Math.floor(total / 3600);
        const m = Math.floor((total % 3600) / 60);
        const s = total % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    } else {
        const m = Math.floor(total / 60);
        const s = total % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
}

function montarNomeArquivo() {
    const distEl = document.getElementById('scoreDistancia');
    let distStr = (distEl && distEl.textContent) ? distEl.textContent.trim() : '';
    distStr = distStr.replace(/\s+/g, '').replace(/\|/g, '_');
    const notaEl = document.getElementById('scoreBig');
    let notaStr = (notaEl && notaEl.textContent) ? notaEl.textContent.trim() : '';
    notaStr = notaStr.replace(/\s+/g, '');
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yy = String(now.getFullYear()).slice(-2);
    return `tafimetro-${notaStr}-${distStr}_${dd}-${mm}-${yy}.png`;
}

// Adicionar listener para o seletor de atividade
document.addEventListener('DOMContentLoaded', function () {
    const atividadeSelect = document.getElementById('atividade');
    if (atividadeSelect) {
        // Atualizar emoji inicial
        atualizarEmojiAtividade();
    }
});

// Gera dados (array de {x: tempoSegundos, y: nota}) para uma distância e sexo
function gerarDadosParaDistancia(notas, idade, sexo, km) {
    const dados = [];

    // Mapear distância para atividade
    const atividadePorDistancia = {
        2.4: 'corrida2400',
        3.2: 'corrida3200',
        0.05: 'natacao50',
        0.1: 'natacao100',
        4.8: 'caminhada4800'
    };

    const atividade = atividadePorDistancia[km] || 'corrida2400';

    for (const nota of notas) {
        try {
            // Usar a nova função para obter tempo para nota específica
            const tempo = tempoParaNotaEspecifica(nota, idade, sexo, atividade);
            const seg = tempoStringParaSegundos(tempo);
            if (isFinite(seg) && seg > 0) dados.push({ x: seg, y: nota });
            else dados.push({ x: null, y: nota });
        } catch (e) {
            dados.push({ x: null, y: nota });
        }
    }
    return dados;
}

// Cria/atualiza gráfico da atividade selecionada — agora com Nota no eixo Y (iniciando em 50)
function gerarGraficos() {
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js não carregado');
        return;
    }

    // Intervalo de notas: 100 → 50 (a cada 5)
    const notas = [];
    for (let n = 100; n >= 50; n -= 5) notas.push(n);

    const idade = parseInt(document.getElementById('idade')?.value) || 30;
    const atividade = document.getElementById('atividade')?.value || 'corrida2400';

    // Mapear atividade para distância
    const distancias = {
        'corrida2400': 2.4,
        'corrida3200': 3.2,
        'natacao50': 0.05,
        'natacao100': 0.1,
        'caminhada4800': 4.8
    };

    const distancia = distancias[atividade] || 2.4;

    // Obter nomes das atividades
    const nomesAtividade = {
        'corrida2400': 'Corrida 2.4km',
        'corrida3200': 'Corrida 3.2km',
        'natacao50': 'Natação 50m',
        'natacao100': 'Natação 100m',
        'caminhada4800': 'Caminhada 4.8km'
    };
    const atividadeNome = nomesAtividade[atividade] || 'Atividade';

    window._charts = window._charts || {};

    const canvasEl = document.getElementById('chart-atividade');
    if (!canvasEl) return;

    if (window._charts['chart-atividade']) {
        try { window._charts['chart-atividade'].destroy(); } catch (e) { }
    }

    const dadosHomens = gerarDadosParaDistancia(notas, idade, 'M', distancia);
    const dadosMulheres = gerarDadosParaDistancia(notas, idade, 'F', distancia);

    // Título do gráfico é atualizado pela função atualizarTituloGrafico()

    const config = {
        type: 'line',
        data: {
            // labels não são mais usados para a série; cada ponto tem x (tempo) e y (nota)
            datasets: [
                {
                    label: 'Homens',
                    data: dadosHomens,
                    borderColor: 'rgb(25, 118, 210)',
                    backgroundColor: 'rgba(25,118,210,0.08)',
                    spanGaps: true,
                    tension: 0.25,
                    pointRadius: 3,
                    parsing: false // usar objetos {x,y} diretamente
                },
                {
                    label: 'Mulheres',
                    data: dadosMulheres,
                    borderColor: 'rgb(255, 99, 132)',
                    backgroundColor: 'rgba(255,99,132,0.08)',
                    spanGaps: true,
                    tension: 0.25,
                    pointRadius: 3,
                    parsing: false // usar objetos {x,y} diretamente
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'nearest', intersect: false },
            plugins: {
                legend: { position: 'top' },
                tooltip: {
                    callbacks: {
                        title: function (items) {
                            // mostrar tempo no título do tooltip
                            const item = items[0];
                            return item && item.raw && item.raw.x != null ? segundosParaMMSS(item.raw.x) : '';
                        },
                        label: function (ctx) {
                            const v = ctx.raw;
                            const nota = (v && v.y != null) ? v.y : '--';
                            return (ctx.dataset.label || '') + ': Nota ' + nota;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: { display: true, text: 'Tempo (mm:ss ou hh:mm:ss)' },
                    ticks: {
                        callback: function (value) { return segundosParaMMSS(value); }
                    },
                    type: 'linear',
                    position: 'bottom'
                },
                y: {
                    title: { display: true, text: 'Nota' },
                    min: 50,
                    max: 100,
                    ticks: {
                        stepSize: 5
                    }
                }
            }
        }
    };

    const containerEl = canvasEl.parentElement;
    if (containerEl) containerEl.style.minHeight = '220px';

    try {
        window._charts['chart-atividade'] = new Chart(canvasEl.getContext('2d'), config);
    } catch (e) {
        console.error('Erro ao criar gráfico', 'chart-atividade', e);
    }
}

function onFormInputsChange() {
    atualizarTituloReferencia();
    atualizarTabelaNotas();
    preencherTabelaReferencia(); // Adicionar chamada para atualizar tabela de referência
    atualizarTituloGrafico(); // Adicionar chamada para atualizar título do gráfico
    try { gerarGraficos(); } catch (e) { }
}

// Adicionar listener para atividade
document.addEventListener('DOMContentLoaded', function () {
    const atividadeSelect = document.getElementById('atividade');
    if (atividadeSelect) {
        atividadeSelect.addEventListener('change', onFormInputsChange);
    }
});

// Chamar gerarGraficos() após carregar página e quando idade mudar
document.addEventListener('DOMContentLoaded', function () {
    onFormInputsChange();
    const idadeInput = document.getElementById('idade');
    if (idadeInput) {
        idadeInput.addEventListener('change', onFormInputsChange);
        idadeInput.addEventListener('input', onFormInputsChange);
        idadeInput.addEventListener('change', atualizarTituloGrafico); // Adicionar listener para idade no DOMContentLoaded para atualizar título do gráfico
    }
    // Inicializa compositor após DOM pronto
    try { configurarCompositor(); } catch (e) { console.warn('Compositor não inicializado:', e); }
});

// Chamar a função uma vez para definir o título inicial
onFormInputsChange();

function atualizarTabelaNotas() {
    const idade = parseInt(document.getElementById('idade').value);
    const sexo = document.getElementById('sexo').value;
    const atividade = document.getElementById('atividade').value;

    // Usar a nova função para preencher a tabela
    preencherTabelaNotas(atividade, idade, sexo);
}


// Inicializar a tabela
document.addEventListener('DOMContentLoaded', onFormInputsChange);

function atualizarTituloReferencia() {
    const idade = document.getElementById('idade').value;
    const sexo = document.getElementById('sexo').value;
    const atividade = document.getElementById('atividade').value;

    // Obter nome da atividade
    const nomesAtividade = {
        'corrida2400': 'Corrida 2.4km',
        'corrida3200': 'Corrida 3.2km',
        'natacao50': 'Natação 50m',
        'natacao100': 'Natação 100m',
        'caminhada4800': 'Caminhada 4.8km'
    };
    const atividadeNome = nomesAtividade[atividade] || 'Atividade';

    // Obter distância da atividade selecionada
    const distancias = {
        'corrida2400': 2.4,
        'corrida3200': 3.2,
        'natacao50': 0.05,
        'natacao100': 0.1,
        'caminhada4800': 4.8
    };
    const distancia = distancias[atividade] || 2.4;

    // Atualizar título da tabela-notas com formato completo
    const faixaEtaria = obterFaixaEtaria(idade, atividade);
    const faixaFormatada = faixaEtaria.replace(/(\d+)a(\d+)/, '$1 a $2 anos');
    const tituloTabelaNotas = document.querySelector('.tabela-notas h2');
    if (tituloTabelaNotas) {
        tituloTabelaNotas.innerHTML = `Nota | Tempo <span>(${atividadeNome}, ${sexo === 'M' ? 'Masculino' : 'Feminino'}, ${faixaFormatada})</span>`;
    }

    // Atualiza o título da tabela de referência
    const tituloReferencia = document.getElementById('titulo-referencia');
    if (tituloReferencia) {
        tituloReferencia.innerHTML = `Tempos de Referência:<br/>${atividadeNome}`;
    }
}

function atualizarTituloGrafico() {
    const idade = document.getElementById('idade').value;
    const sexo = document.getElementById('sexo').value;
    const atividade = document.getElementById('atividade').value;

    // Obter nome da atividade
    const nomesAtividade = {
        'corrida2400': 'Corrida 2.4km',
        'corrida3200': 'Corrida 3.2km',
        'natacao50': 'Natação 50m',
        'natacao100': 'Natação 100m',
        'caminhada4800': 'Caminhada 4.8km'
    };
    const atividadeNome = nomesAtividade[atividade] || 'Atividade';

    // Atualizar título do gráfico
    const tituloGrafico = document.getElementById('grafico-titulo');
    if (tituloGrafico) {
        const faixaEtaria = obterFaixaEtaria(idade, atividade);
        const faixaFormatada = faixaEtaria.replace(/(\d+)a(\d+)/, '$1 a $2 anos');
        tituloGrafico.textContent = `${atividadeNome}, ${faixaFormatada}`;
    }
}

function atualizarTituloReferencia() {
    const idade = document.getElementById('idade').value;
    const sexo = document.getElementById('sexo').value;
    const atividade = document.getElementById('atividade').value;

    // Obter nome da atividade
    const nomesAtividade = {
        'corrida2400': 'Corrida 2.4km',
        'corrida3200': 'Corrida 3.2km',
        'natacao50': 'Natação 50m',
        'natacao100': 'Natação 100m',
        'caminhada4800': 'Caminhada 4.8km'
    };
    const atividadeNome = nomesAtividade[atividade] || 'Atividade';

    // Obter distância da atividade selecionada
    const distancias = {
        'corrida2400': 2.4,
        'corrida3200': 3.2,
        'natacao50': 0.05,
        'natacao100': 0.1,
        'caminhada4800': 4.8
    };
    const distancia = distancias[atividade] || 2.4;

    // Atualizar título da tabela-notas com formato completo
    const faixaEtaria = obterFaixaEtaria(idade, atividade);
    const faixaFormatada = faixaEtaria.replace(/(\d+)a(\d+)/, '$1 a $2 anos');
    const tituloTabelaNotas = document.querySelector('.tabela-notas h2');
    if (tituloTabelaNotas) {
        tituloTabelaNotas.innerHTML = `Nota | Tempo <span>(${atividadeNome}, ${sexo === 'M' ? 'Masculino' : 'Feminino'}, ${faixaFormatada})</span>`;
    }

    // Atualiza o título da tabela de referência
    const tituloReferencia = document.getElementById('titulo-referencia');
    if (tituloReferencia) {
        tituloReferencia.innerHTML = `Tempos de Referência:<br/>${atividadeNome}`;
    }
}

// Atualizar a visibilidade do toggleNome com base no valor do nome
function atualizarVisibilidadeToggleNome() {
    const nomeInput = document.getElementById('nome');
    const nome = nomeInput.value.trim();
    const toggleNomeContainer = document.querySelector('#toggleNome').closest('div');

    if (nome) {
        toggleNomeContainer.style.display = 'flex';
    } else {
        toggleNomeContainer.style.display = 'none';
    }
}

// Adicionar listener para o botão Desbrave
const desbraveButton = document.querySelector('button[type="submit"]');
if (desbraveButton) {
    desbraveButton.addEventListener('click', function (event) {
        atualizarVisibilidadeToggleNome();
    });
}

// Adicionar listener para o toggle de mostrar/ocultar Pace (removido junto com hustle)

// Adicionar listeners para idade e sexo atualizarem o título do gráfico
document.addEventListener('DOMContentLoaded', function () {
    const idadeEl = document.getElementById('idade');
    const sexoEl = document.getElementById('sexo');

    if (idadeEl) {
        idadeEl.addEventListener('change', onFormInputsChange);
    }

    if (sexoEl) {
        sexoEl.addEventListener('change', onFormInputsChange);
    }
});

// Adicionar listener para o toggle de mostrar/ocultar Pace
document.getElementById('togglePace').addEventListener('change', function () {
    const paceContainers = document.querySelectorAll('.meta-item');
    const isChecked = this.checked;

    // Salvar preferência no localStorage
    localStorage.setItem('tafimetro_mostrarPace', isChecked);

    // Mostrar ou ocultar apenas o container de Pace (segundo meta-item)
    paceContainers.forEach((container, index) => {
        if (index === 1) { // Segundo meta-item é o Pace
            container.style.display = isChecked ? 'flex' : 'none';
        }
    });
});

// Verificar preferências salvas ao carregar a página
document.addEventListener('DOMContentLoaded', function () {
    const togglePace = document.getElementById('togglePace');
    const paceContainers = document.querySelectorAll('.meta-item');
    const savedPacePreference = localStorage.getItem('tafimetro_mostrarPace');
    const tafimetro_mostrarPace = savedPacePreference === null ? true : savedPacePreference === 'true';

    // Aplicar preferência do Pace
    togglePace.checked = tafimetro_mostrarPace;
    paceContainers.forEach((container, index) => {
        if (index === 1) { // Segundo meta-item é o Pace
            container.style.display = tafimetro_mostrarPace ? 'flex' : 'none';
        }
    });
});

// Inicializar o título
document.addEventListener('DOMContentLoaded', onFormInputsChange);

// ============================
// Compositor: upload + overlay
// ============================
let _compose = null;

function configurarCompositor() {
    const entrada = document.getElementById('composeInput');
    const imagem = document.getElementById('composeImg');
    const sobreposicao = document.getElementById('composeOverlay');
    const botaoExportar = document.getElementById('composeExport');
    const botaoCompartilhar = document.getElementById('composeShare');
    const container = document.getElementById('composeWrap');
    const entradaEscala = document.getElementById('composeScale');
    const rotuloEscala = document.getElementById('composeScaleLabel');
    const borderRadiusControls = document.getElementById('borderRadiusControls');
    const resetBorderRadiusBtn = document.getElementById('resetBorderRadius');

    // Valores padrão para o border radius
    const defaultBorderRadius = {
        'top-left': 25,
        'top-right': 25,
        'bottom-left': 25,
        'bottom-right': 25
    };

    // Estado atual do border radius
    let currentBorderRadius = { ...defaultBorderRadius };

    // Aplicar border radius ao card
    function aplicarBorderRadius() {
        const { 'top-left': tl, 'top-right': tr, 'bottom-right': br, 'bottom-left': bl } = currentBorderRadius;
        const borderRadius = `${tl}px ${tr}px ${br}px ${bl}px`;

        // Store in _compose for later use
        if (_compose) {
            _compose.currentBorderRadius = { ...currentBorderRadius };
        }

        // Atualizar também o card clonado se existir
        const cardClonado = document.querySelector('#composeOverlay .share-card');
        if (cardClonado) {
            cardClonado.style.borderRadius = borderRadius;
        }

        // Retornar o valor para uso imediato se necessário
        return borderRadius;
    }

    // Salvar configurações de borda no localStorage
    function salvarConfiguracoesBorda() {
        localStorage.setItem('borderRadiusConfig', JSON.stringify(currentBorderRadius));
    }

    // Carregar configurações de borda do localStorage
    function carregarConfiguracoesBorda() {
        const savedConfig = localStorage.getItem('borderRadiusConfig');
        if (savedConfig) {
            try {
                const config = JSON.parse(savedConfig);
                // Apenas atualiza os valores, sem aplicar ainda
                Object.keys(defaultBorderRadius).forEach(corner => {
                    if (config[corner] !== undefined) {
                        currentBorderRadius[corner] = config[corner];
                        const input = document.querySelector(`.border-radius-control[data-corner="${corner}"]`);
                        if (input) input.value = config[corner];
                    }
                });
                return true; // Indica que há configurações salvas
            } catch (e) {
                console.error('Erro ao carregar configurações de borda:', e);
                return false;
            }
        }
        return false;
    }

    // Atualizar um canto específico
    function atualizarCanto(corner, value) {
        currentBorderRadius[corner] = parseInt(value, 10);
        aplicarBorderRadius();
        salvarConfiguracoesBorda();
    }

    // Resetar todos os cantos para os valores padrão
    function resetarBorderRadius() {
        currentBorderRadius = { ...defaultBorderRadius };

        // Atualizar os controles deslizantes
        document.querySelectorAll('.border-radius-control').forEach(input => {
            const corner = input.dataset.corner;
            input.value = currentBorderRadius[corner];
        });

        aplicarBorderRadius();
    }

    // parâmetros reutilizáveis para exportar/compartilhar o PRINT (compositor)
    let EXPORT_SCALE_PADRAO = 3;
    const EXPORT_LARGURA_ALVO = 3000;
    const EXPORT_MIME = 'image/png';
    const EXPORT_QUALITY = 0.92;

    // Salvar configuração de escala no localStorage
    function salvarConfiguracaoEscala() {
        localStorage.setItem('cardScaleConfig', JSON.stringify(_compose.scale));
    }

    // Carregar configuração de escala do localStorage
    function carregarConfiguracaoEscala() {
        const savedScale = localStorage.getItem('cardScaleConfig');
        if (savedScale) {
            try {
                const scale = JSON.parse(savedScale);
                if (scale >= 35 && scale <= 160) { // Valida se está dentro dos limites permitidos
                    _compose.scale = scale;
                    if (entradaEscala) entradaEscala.value = scale;
                    if (rotuloEscala) rotuloEscala.textContent = `${scale}%`;
                    return true;
                }
            } catch (e) {
                console.error('Erro ao carregar configuração de escala:', e);
            }
        }
        return false;
    }

    if (!entrada || !imagem || !sobreposicao || !botaoExportar || !container || !borderRadiusControls || !resetBorderRadiusBtn) return;

    // Configurar eventos para os controles de border radius
    document.querySelectorAll('.border-radius-control').forEach(input => {
        input.addEventListener('input', (e) => {
            const corner = e.target.dataset.corner;
            atualizarCanto(corner, e.target.value);
        });
    });

    // Configurar botão de reset
    resetBorderRadiusBtn.addEventListener('click', resetarBorderRadius);

    // Carregar configurações iniciais, mas não aplicar ainda
    const temConfigSalva = carregarConfiguracoesBorda();
    if (!temConfigSalva) {
        resetarBorderRadius();
    }

    // Aplicar as configurações quando a imagem for carregada
    const aplicarConfigAposCarregamento = () => {
        const borderRadius = aplicarBorderRadius();

        // Se houver um MutationObserver, aplicar o border radius quando o card for clonado
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.addedNodes.length) {
                    const cardClonado = document.querySelector('#composeOverlay .share-card');
                    if (cardClonado) {
                        cardClonado.style.borderRadius = borderRadius;
                        observer.disconnect();
                        break;
                    }
                }
            }
        });

        // Observar mudanças no container do overlay
        observer.observe(sobreposicao, { childList: true, subtree: true });

        // Remover o event listener após o primeiro uso
        imagem.removeEventListener('load', aplicarConfigAposCarregamento);
    };

    if (imagem.complete) {
        // Se a imagem já estiver carregada, aplicar imediatamente

        aplicarConfigAposCarregamento();
    } else {
        // Caso contrário, aguardar o carregamento
        imagem.addEventListener('load', aplicarConfigAposCarregamento);
    }

    // Manter overlay invisível até que a imagem esteja carregada
    try { sobreposicao.style.visibility = 'hidden'; } catch (_) { }
    if (botaoCompartilhar) botaoCompartilhar.disabled = true;

    // cria contêiner interno sem padding/bordas para exportação
    function ensureExportRoot() {
        let exportRoot = container.querySelector('.compose-export-root');
        if (!exportRoot) {
            exportRoot = document.createElement('div');
            exportRoot.className = 'compose-export-root';
            exportRoot.style.position = 'relative';
            exportRoot.style.display = 'inline-block';
            exportRoot.style.padding = '0';
            exportRoot.style.margin = '0';
            exportRoot.style.border = 'none';
            // mover img e overlay para dentro do exportRoot
            if (imagem && imagem.parentElement === container) exportRoot.appendChild(imagem);
            if (sobreposicao && sobreposicao.parentElement === container) exportRoot.appendChild(sobreposicao);
            container.appendChild(exportRoot);
        }
        return exportRoot;
    }

    function initState() {
        const exportRoot = ensureExportRoot();
        _compose = { input: entrada, img: imagem, overlay: sobreposicao, exportBtn: botaoExportar, wrap: container, exportRoot, scaleInput: entradaEscala, scaleLabel: rotuloEscala, cardEl: null, dragging: false, dragOff: { x: 0, y: 0 }, baseWidth: null, frozenBaseWidth: null, scale: 100, metrics: null, isPinching: false, pinchStartDist: 0, pinchBaseScale: 100 };
    }

    function initFileLoader() {
        entrada.addEventListener('change', (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                // aguardar renderização da imagem antes de criar/atualizar o card clonado
                imagem.onload = () => {
                    imagem.style.display = 'block';
                    botaoExportar.disabled = false;
                    if (botaoCompartilhar) botaoCompartilhar.disabled = false;
                    // define escala de exportação com base na largura da imagem carregada
                    const largura = imagem.naturalWidth || imagem.width || 0;
                    EXPORT_SCALE_PADRAO = largura ? (EXPORT_LARGURA_ALVO / largura) : 3;
                    console.log("largura", largura, "EXPORT SCALE", EXPORT_SCALE_PADRAO)
                    // só agora o overlay pode ficar visível
                    try { sobreposicao.style.visibility = 'visible'; } catch (_) { }
                    // exibe controles (escala e botões) somente após a imagem carregar
                    try {
                        const scaleRow = document.getElementById('composeScaleRow');
                        const actions = document.getElementById('composeActions');
                        const borderRadiusControls = document.getElementById('borderRadiusControls');
                        if (scaleRow) scaleRow.style.display = 'flex';
                        if (actions) actions.style.display = 'flex';
                        if (borderRadiusControls) borderRadiusControls.style.display = 'flex';
                    } catch (_) { }
                    if (!_compose.cardEl) {
                        garantirCardOverlay();
                    } else {
                        aplicarLarguraOverlayDaBase();
                    }
                };
                imagem.src = reader.result;
            };
            reader.readAsDataURL(file);
        });
    }

    function initScaleControls() {
        // Slider para tamanho do card (preserva proporção)
        if (entradaEscala) {
            const applyScale = (val) => {
                _compose.scale = Number(val) || 100;
                if (_compose.cardEl) {
                    const s = (_compose.scale / 100);
                    _compose.cardEl.style.transformOrigin = 'top left';
                    _compose.cardEl.style.transform = `scale(${s})`;
                }
                if (rotuloEscala) rotuloEscala.textContent = `${_compose.scale}%`;
                salvarConfiguracaoEscala(); // Salvar a escala sempre que for alterada
            };

            // Carregar configuração salva ou usar o valor padrão
            const temEscalaSalva = carregarConfiguracaoEscala();
            const valorInicial = temEscalaSalva ? _compose.scale : 100;

            entradaEscala.value = valorInicial;
            _compose.scale = valorInicial;

            entradaEscala.addEventListener('input', (ev) => applyScale(ev.target.value));

            // Aplicar escala inicial
            if (rotuloEscala) rotuloEscala.textContent = `${valorInicial}%`;

            // Aplicar transformação inicial se já houver card
            if (_compose.cardEl) {
                const s = (valorInicial / 100);
                _compose.cardEl.style.transformOrigin = 'top left';
                _compose.cardEl.style.transform = `scale(${s})`;
            }
        }
    }

    function initMouseDragAndTouch() {
        // Drag handlers (mouse + touch)
        const startDrag = (cx, cy) => {
            if (!_compose || !_compose.cardEl) return;
            _compose.dragging = true;
            const rect = _compose.cardEl.getBoundingClientRect();
            _compose.dragOff.x = cx - rect.left;
            _compose.dragOff.y = cy - rect.top;
            document.body.style.userSelect = 'none';
        };
        const moveDrag = (cx, cy) => {
            if (!_compose || !_compose.dragging || !_compose.cardEl) return;
            // Converte client coords para coords relativas ao overlay
            const oRect = _compose.overlay.getBoundingClientRect();
            let x = cx - oRect.left - _compose.dragOff.x;
            let y = cy - oRect.top - _compose.dragOff.y;
            // limitar dentro do overlay
            const cRect = _compose.cardEl.getBoundingClientRect(); // já considera transform(scale)
            const maxX = oRect.width - cRect.width;
            const maxY = oRect.height - cRect.height;
            x = Math.max(0, Math.min(maxX, x));
            y = Math.max(0, Math.min(maxY, y));
            _compose.cardEl.style.left = x + 'px';
            _compose.cardEl.style.top = y + 'px';
        };
        const endDrag = () => {
            if (_compose) _compose.dragging = false;
            document.body.style.userSelect = '';
        };

        // mouse
        sobreposicao.addEventListener('mousedown', (ev) => {
            if (!_compose.cardEl) return;
            const rect = _compose.cardEl.getBoundingClientRect();
            const inside = ev.clientX >= rect.left && ev.clientX <= rect.right && ev.clientY >= rect.top && ev.clientY <= rect.bottom;
            if (inside) {
                startDrag(ev.clientX, ev.clientY);
                ev.preventDefault();
            }
            // se clicar fora do card, não inicia drag e não previne default: permite rolagem/seleção
        });
        window.addEventListener('mousemove', (ev) => moveDrag(ev.clientX, ev.clientY));
        window.addEventListener('mouseup', endDrag);
        // touch
        sobreposicao.addEventListener('touchstart', (ev) => {
            if (!ev.touches || !ev.touches[0]) return;
            // Pinch: 2+ dedos iniciam zoom
            if (ev.touches.length >= 2) {
                const a = ev.touches[0];
                const b = ev.touches[1];
                const dx = a.clientX - b.clientX;
                const dy = a.clientY - b.clientY;
                _compose.isPinching = true;
                _compose.pinchStartDist = Math.hypot(dx, dy) || 1;
                _compose.pinchBaseScale = _compose.scale || 100;
                ev.preventDefault();
                return;
            }
            // Drag com 1 dedo somente se iniciar dentro do card
            const t = ev.touches[0];
            if (_compose.cardEl) {
                const rect = _compose.cardEl.getBoundingClientRect();
                const inside = t.clientX >= rect.left && t.clientX <= rect.right && t.clientY >= rect.top && t.clientY <= rect.bottom;
                if (inside) {
                    startDrag(t.clientX, t.clientY);
                    ev.preventDefault(); // só previne se for iniciar drag
                }
            }
            // se tocar fora do card, não inicia drag e não previne default: permite rolagem
        }, { passive: false });
        window.addEventListener('touchmove', (ev) => {
            if (!ev.touches || !ev.touches[0]) return;
            // Se pinch ativo e dois dedos, ajustar escala
            if (_compose && _compose.isPinching && ev.touches.length >= 2) {
                const a = ev.touches[0];
                const b = ev.touches[1];
                const dx = a.clientX - b.clientX;
                const dy = a.clientY - b.clientY;
                const dist = Math.hypot(dx, dy) || 1;
                const newScale = Math.max(35, Math.min(160, (_compose.pinchBaseScale || 100) * (dist / (_compose.pinchStartDist || 1))));
                _compose.scale = newScale;
                if (_compose.cardEl) {
                    const s = (newScale / 100);
                    _compose.cardEl.style.transformOrigin = 'top left';
                    _compose.cardEl.style.transform = `scale(${s})`;
                }
                if (_compose.scaleInput) {
                    _compose.scaleInput.value = String(Math.round(newScale));
                    if (_compose.scaleLabel) _compose.scaleLabel.textContent = `${Math.round(newScale)}%`;
                    salvarConfiguracaoEscala(); // Salvar a escala após ajuste por pinch
                }
                ev.preventDefault();
                return;
            }
            // Caso contrário, processa drag com 1 dedo
            const t = ev.touches[0];
            moveDrag(t.clientX, t.clientY);
        }, { passive: false });
        window.addEventListener('touchend', (ev) => {
            if (_compose && ev.touches && ev.touches.length < 2) {
                _compose.isPinching = false;
            }
            endDrag();
        });
    }

    function initExportHandler() {
        const calcularEscalaAlvo = (target) => {
            const w = (target && target.getBoundingClientRect && target.getBoundingClientRect().width) || 0;
            return w ? (EXPORT_LARGURA_ALVO / w) : EXPORT_SCALE_PADRAO;
        };
        botaoExportar.addEventListener('click', async () => {
            if (!_compose || !_compose.img.src) return;
            try {
                const target = _compose.exportRoot || container;
                const escala = calcularEscalaAlvo(target);
                const canvas = await html2canvas(target, { backgroundColor: null, useCORS: true, scale: escala });
                const dataUrl = canvas.toDataURL(EXPORT_MIME, EXPORT_QUALITY);
                const link = document.createElement('a');
                link.href = dataUrl;
                // Nome do arquivo simplificado via helper
                link.download = montarNomeArquivo();
                document.body.appendChild(link);
                link.click();
                link.remove();
            } catch (e) {
                console.error('Falha ao exportar imagem composta:', e);
                alert('Não foi possível gerar a imagem.');
            }
        });
    }

    function initShareHandler() {
        if (!botaoCompartilhar) return;
        botaoCompartilhar.addEventListener('click', async () => {
            if (!_compose || !_compose.img.src) return;
            try {
                const target = _compose.exportRoot || container;
                // calcular em tempo real para garantir ~3000px de largura
                const w = (target && target.getBoundingClientRect && target.getBoundingClientRect().width) || 0;
                const escala = w ? (EXPORT_LARGURA_ALVO / w) : EXPORT_SCALE_PADRAO;
                const canvas = await html2canvas(target, { backgroundColor: null, useCORS: true, scale: escala });
                const filename = montarNomeArquivo();

                const blob = await new Promise(resolve => canvas.toBlob(resolve, EXPORT_MIME, EXPORT_QUALITY));
                if (!blob) throw new Error('Falha ao gerar imagem');
                const file = new File([blob], filename, { type: EXPORT_MIME });

                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        files: [file],
                        title: 'TAFímetro',
                        text: 'Meu print do TAFímetro'
                    });
                    return;
                }
                if (navigator.share) {
                    // Fallback: compartilhar um data URL (alguns ambientes aceitam)
                    const dataUrl = canvas.toDataURL(EXPORT_MIME, EXPORT_QUALITY);
                    await navigator.share({
                        title: 'TAFímetro',
                        text: 'Meu print do TAFímetro',
                        url: dataUrl
                    });
                    return;
                }
                // Fallback final: abrir em nova aba para o usuário salvar/compartilhar manualmente
                const dataUrl = URL.createObjectURL(blob);
                window.open(dataUrl, '_blank');
            } catch (e) {
                console.error('Falha ao compartilhar:', e);
                // alert('Compartilhamento não suportado neste dispositivo/navegador.');
            }
        });
    }

    // inicialização simplificada
    initState();
    initFileLoader();
    initScaleControls();
    initMouseDragAndTouch();
    initExportHandler();
    initShareHandler();

    // criação do card no overlay ocorre somente após a imagem ser carregada (img.onload)
}

function garantirCardOverlay() {
    if (!_compose) return;
    const srcCard = document.getElementById('shareCard');
    if (!srcCard || srcCard.style.display === 'none') return;

    // Get current border radius from _compose or use defaults from controls
    const currentBorderRadius = _compose.currentBorderRadius || {
        'top-left': parseInt(document.querySelector('.border-radius-control[data-corner="top-left"]')?.value || '25'),
        'top-right': parseInt(document.querySelector('.border-radius-control[data-corner="top-right"]')?.value || '25'),
        'bottom-left': parseInt(document.querySelector('.border-radius-control[data-corner="bottom-left"]')?.value || '25'),
        'bottom-right': parseInt(document.querySelector('.border-radius-control[data-corner="bottom-right"]')?.value || '25')
    };

    // Update _compose with current values
    _compose.currentBorderRadius = { ...currentBorderRadius };
    if (_compose.cardEl && _compose.cardEl.parentElement) {
        // atualizar conteúdo
        const posLeft = _compose.cardEl.style.left;
        const posTop = _compose.cardEl.style.top;
        const totalW = (_compose.baseWidth != null) ? _compose.baseWidth : _compose.cardEl.getBoundingClientRect().width;
        _compose.cardEl.replaceWith(clonarCardCompartilhar(srcCard));
        _compose.cardEl = _compose.overlay.querySelector('.share-card');
        tornarOverlayPosicionado(_compose.cardEl);
        // manter posição e largura atual respeitando box model
        const cs = window.getComputedStyle(srcCard);
        const num = (v) => parseFloat(v || '0') || 0;
        const hPadding = num(cs.paddingLeft) + num(cs.paddingRight);
        const hBorder = num(cs.borderLeftWidth) + num(cs.borderRightWidth);
        let setWidth = totalW;
        if (cs.boxSizing === 'content-box') setWidth = Math.max(0, totalW - hPadding - hBorder);
        _compose.cardEl.style.boxSizing = cs.boxSizing;
        _compose.cardEl.style.left = posLeft || '16px';
        _compose.cardEl.style.top = posTop || '16px';
        // reaplica escala atual
        const s = (_compose.scale / 100);
        _compose.cardEl.style.transformOrigin = 'top left';
        _compose.cardEl.style.transform = `scale(${s})`;
        // Reaplicar border radius após recriar o card
        if (currentBorderRadius) {
            const { 'top-left': tl, 'top-right': tr, 'bottom-right': br, 'bottom-left': bl } = currentBorderRadius;
            const borderRadius = `${tl}px ${tr}px ${br}px ${bl}px`;
            _compose.cardEl.style.borderRadius = borderRadius;
        }
        return;
    }
    const clone = clonarCardCompartilhar(srcCard);
    _compose.cardEl = clone;
    _compose.overlay.style.position = 'absolute';
    _compose.overlay.style.inset = '0';
    _compose.overlay.appendChild(clone);
    // posição inicial: 16px 16px
    clone.style.left = '16px';
    clone.style.top = '16px';
    // mede largura original do card de origem (mais fiel) e fixa como base (preserva proporção)
    const origRect = srcCard.getBoundingClientRect();
    const cs = window.getComputedStyle(srcCard);
    // usa a largura congelada se já existir; caso contrário, mede e congela agora
    const measured = origRect.width; // largura total (border-box visual, com decimais)
    const ow = (_compose.frozenBaseWidth != null) ? _compose.frozenBaseWidth : measured;
    if (_compose.frozenBaseWidth == null) _compose.frozenBaseWidth = ow;
    _compose.baseWidth = ow;
    // coleta métricas para respeitar box-sizing
    const num = (v) => parseFloat(v || '0') || 0;
    const metrics = {
        boxSizing: cs.boxSizing,
        hPadding: num(cs.paddingLeft) + num(cs.paddingRight),
        hBorder: num(cs.borderLeftWidth) + num(cs.borderRightWidth)
    };
    _compose.metrics = metrics;
    // define width base respeitando o box model (não escalamos a largura)
    let contentWidth = ow;
    if (metrics.boxSizing === 'content-box') contentWidth = Math.max(0, ow - metrics.hPadding - metrics.hBorder);
    clone.style.boxSizing = cs.boxSizing;
    clone.style.maxWidth = 'none';
    clone.style.width = contentWidth + 'px';
    clone.style.minWidth = contentWidth + 'px';
    clone.style.maxWidth = contentWidth + 'px';
    // Aplicar border radius ao card recém-criado
    if (currentBorderRadius) {
        const { 'top-left': tl, 'top-right': tr, 'bottom-right': br, 'bottom-left': bl } = currentBorderRadius;
        clone.style.borderRadius = `${tl}px ${tr}px ${br}px ${bl}px`;
    }

    // aplica escala do slider via transform se existir
    if (_compose.scaleInput) {
        const perc = Number(_compose.scaleInput.value) || 100;
        _compose.scale = perc;
        const s = perc / 100;
        clone.style.transformOrigin = 'top left';
        clone.style.transform = `scale(${s})`;
        if (_compose.scaleLabel) _compose.scaleLabel.textContent = `${perc}%`;
    }
}

function prepararCardClonado(srcCard, clone) {
    // strip IDs do clone inteiro
    (function stripIds(el) {
        if (el.nodeType !== 1) return;
        if (el.id) el.removeAttribute('id');
        const children = el.children || [];
        for (let i = 0; i < children.length; i++) stripIds(children[i]);
    })(clone);

    // remove a seção de meta do card no clone (print não deve exibir)
    try {
        const metas = clone.querySelectorAll('.card-meta');
        metas.forEach(n => n.remove());
    } catch (_) { }

    // Configurações de estilo comuns
    clone.style.display = 'block';
    clone.style.background = srcCard.style.background;
    clone.style.color = srcCard.style.color;

    // Copiar propriedades tipográficas para evitar variações por contexto
    try {
        const cs = window.getComputedStyle(srcCard);
        const props = [
            'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'wordSpacing',
            'fontStretch', 'fontVariant', 'fontKerning', 'textTransform', 'textRendering'
        ];
        for (const p of props) clone.style[p] = cs[p];
    } catch (_) { }


    // Ajuste específico do clone: aplicar frasesPrint e espaçamento/estilos da zone-phrase para print/export
    try {
        const zp = clone.querySelector('.zone-phrase');
        if (zp) {
            // usar a frase de print já resolvida no card original
            try {
                const pf = (srcCard && srcCard.dataset && srcCard.dataset.phrasePrint) || '';
                if (pf) zp.textContent = pf;
            } catch (_) { }
            // zp.style.marginTop = '5px';
            // remover blur no clone (print/export)
            zp.style.backdropFilter = 'none';
            zp.style.webkitBackdropFilter = 'none';
        }
    } catch (_) { }

    // Distribui emojis no card clonado (não afeta o card original) e ignora quando a nota é 100
    // try { distribuirEmojisDaZonaNoCard(clone); } catch (_) { }

    return clone;
}

function clonarCardCompartilhar(srcCard) {
    const clone = srcCard.cloneNode(true);
    prepararCardClonado(srcCard, clone);
    clone.style.position = 'absolute';
    clone.style.pointerEvents = 'none'; // evita capturar cliques internos, drag é pelo overlay
    return clone;
}

// Redistribui emojis no card clonado (não afeta o card original) e ignora quando a nota é 100
function distribuirEmojisDaZonaNoCard(cardEl) {
    if (!cardEl) return;
    try {
        const scoreEl = cardEl.querySelector('.score-big');
        const scoreTxt = (scoreEl && scoreEl.textContent || '').trim();
        if (scoreTxt === '100') return; // não distribuir para 100
        const zoneEl = cardEl.querySelector('.zone-phrase');
        if (!zoneEl) return;
        const leftCorner = cardEl.querySelector('.card-corner-left');
        const rightCorner = cardEl.querySelector('.card-corner-right');
        const text = (zoneEl.textContent || '').trim();
        // Segmentar por grafema (mantém ZWJ); usa Intl.Segmenter se disponível
        const segmentGraphemes = (s) => {
            try {
                if (typeof Intl !== 'undefined' && Intl.Segmenter) {
                    const seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
                    return Array.from(seg.segment(s), it => it.segment);
                }
            } catch (_) { }
            const arr = Array.from(s);
            const out = [];
            for (let i = 0; i < arr.length; i++) {
                let g = arr[i];
                while (i + 1 < arr.length && arr[i + 1] === '\uFE0F') { g += arr[++i]; }
                while (i + 2 < arr.length && arr[i + 1] === '\u200D') {
                    g += arr[++i];
                    g += arr[++i];
                    while (i + 1 < arr.length && arr[i + 1] === '\uFE0F') { g += arr[++i]; }
                }
                out.push(g);
            }
            return out;
        };
        const units = segmentGraphemes(text);
        const isEmojiUnit = (u) => {
            if (!u) return false;
            for (const ch of Array.from(u)) {
                const cp = ch.codePointAt(0);
                if (cp >= 0x1F000 && cp <= 0x1FAFF) return true;
                if ((cp >= 0x2190 && cp <= 0x21FF) || (cp >= 0x2300 && cp <= 0x23FF)) return true;
                if ((cp >= 0x2460 && cp <= 0x24FF) || (cp >= 0x2600 && cp <= 0x27BF)) return true;
                if ((cp >= 0x2900 && cp <= 0x297F) || (cp >= 0x2B00 && cp <= 0x2BFF)) return true;
            }
            return false;
        };
        // leading
        let s = 0; const leading = [];
        while (s < units.length) {
            const u = units[s];
            if (u === ' ') { s++; continue; }
            if (isEmojiUnit(u)) { leading.push(u); s++; continue; }
            break;
        }
        // trailing
        let e = units.length - 1; const trailing = [];
        while (e >= 0) {
            const u = units[e];
            if (u === ' ') { e--; continue; }
            if (isEmojiUnit(u)) { trailing.push(u); e--; continue; }
            break;
        }
        const core = units.slice(s, e + 1).join('');
        // manter o mais próximo do texto dentro; demais vão pros cantos
        const keepLeft = leading.length ? leading[leading.length - 1] : '';
        const keepRight = trailing.length ? trailing[trailing.length - 1] : '';
        const zoneText = [keepLeft, core, keepRight].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
        zoneEl.textContent = zoneText;
        if (leftCorner) {
            const extraLeft = leading.slice(0, Math.max(0, leading.length - 1)).reverse();
            leftCorner.innerHTML = extraLeft.length ? extraLeft.map(x => `<div>${x}</div>`).join('') : '';
        }
        if (rightCorner) {
            const extraRight = trailing.slice(0, Math.max(0, trailing.length - 1)).reverse();
            rightCorner.innerHTML = extraRight.length ? extraRight.map(x => `<div>${x}</div>`).join('') : '';
        }
    } catch (_) { }
}

function tornarOverlayPosicionado(el) {
    if (!el) return;
    el.style.position = 'absolute';
    el.style.pointerEvents = 'none';
}

// Exposta para ser chamada após recalcular o card
function atualizarCardOverlayDoShareCard() {
    if (!_compose) return;
    const srcCard = document.getElementById('shareCard');
    if (!srcCard || srcCard.style.display === 'none') return;
    garantirCardOverlay();
    if (_compose.cardEl) {
        // Atualiza conteúdo textual do clone para refletir mudanças
        const fresh = srcCard.cloneNode(true);
        prepararCardClonado(srcCard, fresh);

        // Configurações específicas do overlay
        fresh.style.position = 'absolute';
        fresh.style.left = _compose.cardEl.style.left || '16px';
        fresh.style.top = _compose.cardEl.style.top || '16px';
        fresh.style.pointerEvents = 'none';

        // Atualiza apenas metrics; mantém baseWidth congelada
        const cs = window.getComputedStyle(srcCard);
        _compose.baseWidth = (_compose.frozenBaseWidth != null) ? _compose.frozenBaseWidth : _compose.baseWidth;
        const num = (v) => parseFloat(v || '0') || 0;
        _compose.metrics = {
            boxSizing: cs.boxSizing,
            hPadding: num(cs.paddingLeft) + num(cs.paddingRight),
            hBorder: num(cs.borderLeftWidth) + num(cs.borderRightWidth)
        };

        // manter largura base e aplicar escala via transform
        fresh.style.boxSizing = cs.boxSizing;
        const hPadding = num(cs.paddingLeft) + num(cs.paddingRight);
        const hBorder = num(cs.borderLeftWidth) + num(cs.borderRightWidth);
        let baseContent = _compose.baseWidth || fresh.getBoundingClientRect().width;
        if (cs.boxSizing === 'content-box') baseContent = Math.max(0, (_compose.baseWidth || 0) - hPadding - hBorder);

        // aplica escala atual
        const s2 = (_compose.scale / 100);
        fresh.style.transformOrigin = 'top left';
        fresh.style.transform = `scale(${s2})`;

        // Manter o border radius ao atualizar o card
        if (_compose.currentBorderRadius) {
            const { 'top-left': tl, 'top-right': tr, 'bottom-right': br, 'bottom-left': bl } = _compose.currentBorderRadius;
            fresh.style.borderRadius = `${tl}px ${tr}px ${br}px ${bl}px`;
        }

        _compose.cardEl.replaceWith(fresh);
        _compose.cardEl = fresh;
    }
}

function aplicarLarguraOverlayDaBase() {
    if (!_compose || !_compose.cardEl || !_compose.baseWidth) return;
    const cs = window.getComputedStyle(document.getElementById('shareCard'));
    // garante largura base fixa
    const num = (v) => parseFloat(v || '0') || 0;
    const hPadding = num(cs.paddingLeft) + num(cs.paddingRight);
    const hBorder = num(cs.borderLeftWidth) + num(cs.borderRightWidth);
    let baseContent = _compose.baseWidth;
    if (cs.boxSizing === 'content-box') baseContent = Math.max(0, _compose.baseWidth - hPadding - hBorder);
    _compose.cardEl.style.boxSizing = cs.boxSizing;
    // aplica escala
    const s = (_compose.scale / 100);
    _compose.cardEl.style.transformOrigin = 'top left';
    _compose.cardEl.style.transform = `scale(${s})`;
}

function recalibrarLarguraOverlayDaOrigem() {
    if (!_compose || !_compose.cardEl) return;
    const srcCard = document.getElementById('shareCard');
    if (!srcCard || srcCard.style.display === 'none') return;
    requestAnimationFrame(() => {
        const rect = srcCard.getBoundingClientRect();
        const cs = window.getComputedStyle(srcCard);
        // congela nova largura base conforme pedido
        _compose.frozenBaseWidth = rect.width;
        _compose.baseWidth = rect.width;
        // aplica novamente largura e escala
        const num = (v) => parseFloat(v || '0') || 0;
        const hPadding = num(cs.paddingLeft) + num(cs.paddingRight);
        const hBorder = num(cs.borderLeftWidth) + num(cs.borderRightWidth);
        let baseContent = _compose.baseWidth;
        if (cs.boxSizing === 'content-box') baseContent = Math.max(0, _compose.baseWidth - hPadding - hBorder);
        _compose.cardEl.style.boxSizing = cs.boxSizing;
        const s = (_compose.scale / 100);
        _compose.cardEl.style.transformOrigin = 'top left';
        _compose.cardEl.style.transform = `scale(${s})`;
    });
};

// Modificar o event listener do formulário para incluir a verificação de intervalo
const originalSubmitHandler = document.getElementById('calcForm')?.onsubmit;
document.getElementById('calcForm').onsubmit = function (e) {
    // Sempre considerar como não intervalado
    const scoreBig = document.getElementById('scoreBig');
    if (scoreBig) {
        scoreBig.style.display = 'block';
    }

    // Chamar o handler original se existir
    if (originalSubmitHandler) {
        return originalSubmitHandler.call(this, e);
    }
};

document.getElementById('calcForm').addEventListener('submit', function (event) {
    event.preventDefault();

});

