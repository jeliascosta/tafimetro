// app.js

// Configurações da API do Strava
const STRAVA_CONFIG = {
    clientId: '70009', // Você precisará registrar um app no Strava
    redirectUri: window.location.origin + window.location.pathname, // Usar a página atual como callback
    scope: 'read,activity:read_all',
    apiUrl: 'https://www.strava.com/api/v3'
};

// Funcionalidade de integração com Strava
class StravaIntegration {
    constructor() {
        this.accessToken = localStorage.getItem('strava_access_token');
        this.refreshToken = localStorage.getItem('strava_refresh_token');
        this.tokenExpiresAt = localStorage.getItem('strava_token_expires_at');
        this.init();
    }

    init() {
        const stravaBtn = document.getElementById('stravaImportBtn');
        const stravaStatus = document.getElementById('stravaStatus');

        if (stravaBtn) {
            stravaBtn.addEventListener('click', () => this.handleStravaImport());
        }

        // Verificar se há token na URL (callback do OAuth)
        this.handleOAuthCallback();
    }

    handleOAuthCallback() {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');

        if (error) {
            this.updateStatus('Erro na autenticação com Strava: ' + error, 'error');
            return;
        }

        if (code) {
            this.exchangeCodeForToken(code);
            // Limpar URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }

    async exchangeCodeForToken(code) {
        try {
            this.updateStatus('Autenticando com Strava...', 'loading');

            const response = await fetch('https://www.strava.com/oauth/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    client_id: STRAVA_CONFIG.clientId,
                    client_secret: '6f68aafcc1677901871f9d4af210c0e005c9606e', // Você precisará configurar
                    code: code,
                    grant_type: 'authorization_code'
                })
            });

            const data = await response.json();

            if (data.access_token) {
                this.accessToken = data.access_token;
                this.refreshToken = data.refresh_token;
                this.tokenExpiresAt = Date.now() + (data.expires_in * 1000);

                localStorage.setItem('strava_access_token', this.accessToken);
                localStorage.setItem('strava_refresh_token', this.refreshToken);
                localStorage.setItem('strava_token_expires_at', this.tokenExpiresAt);

                this.updateStatus('Autenticado com sucesso! Buscando atividades...', 'success');
                setTimeout(() => this.fetchRecentActivities(), 1000);
            } else {
                throw new Error(data.error || 'Erro ao obter token');
            }
        } catch (error) {
            this.updateStatus('Erro na autenticação: ' + error.message, 'error');
        }
    }

    async handleStravaImport() {
        if (!this.accessToken || this.isTokenExpired()) {
            this.authenticate();
            return;
        }

        await this.fetchRecentActivities();
    }

    authenticate() {
        const authUrl = `https://www.strava.com/oauth/authorize?` +
            `client_id=${STRAVA_CONFIG.clientId}&` +
            `redirect_uri=${encodeURIComponent(STRAVA_CONFIG.redirectUri)}&` +
            `response_type=code&` +
            `scope=${encodeURIComponent(STRAVA_CONFIG.scope)}`;

        window.location.href = authUrl;
    }

    isTokenExpired() {
        return !this.tokenExpiresAt || Date.now() >= parseInt(this.tokenExpiresAt);
    }

    async refreshAccessToken() {
        if (!this.refreshToken) {
            this.authenticate();
            return;
        }

        try {
            const response = await fetch('https://www.strava.com/oauth/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    client_id: STRAVA_CONFIG.clientId,
                    client_secret: '6f68aafcc1677901871f9d4af210c0e005c9606e',
                    grant_type: 'refresh_token',
                    refresh_token: this.refreshToken
                })
            });

            const data = await response.json();

            if (data.access_token) {
                this.accessToken = data.access_token;
                this.tokenExpiresAt = Date.now() + (data.expires_in * 1000);

                localStorage.setItem('strava_access_token', this.accessToken);
                localStorage.setItem('strava_token_expires_at', this.tokenExpiresAt);

                if (data.refresh_token) {
                    this.refreshToken = data.refresh_token;
                    localStorage.setItem('strava_refresh_token', this.refreshToken);
                }
            }
        } catch (error) {
            console.error('Erro ao refresh token:', error);
            this.authenticate();
        }
    }

    async fetchRecentActivities() {
        if (!this.accessToken) {
            this.authenticate();
            return;
        }

        if (this.isTokenExpired()) {
            await this.refreshAccessToken();
        }

        try {
            this.updateStatus('Buscando atividades recentes...', 'loading');

            const response = await fetch(`${STRAVA_CONFIG.apiUrl}/athlete/activities?per_page=10`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            if (!response.ok) {
                throw new Error('Erro ao buscar atividades');
            }

            const activities = await response.json();
            this.displayActivitySelector(activities);
        } catch (error) {
            this.updateStatus('Erro ao buscar atividades: ' + error.message, 'error');
        }
    }

    displayActivitySelector(activities) {
        // Filtrar apenas corridas
        const runs = activities.filter(activity => activity.type === 'Run');
        
        if (runs.length === 0) {
            this.updateStatus('Nenhuma corrida encontrada nas atividades recentes', 'error');
            return;
        }

        // Limpar status ao abrir modal
        this.updateStatus('', '');

        // Criar modal de seleção
        const modal = this.createActivityModal(runs);
        document.body.appendChild(modal);
    }

    createActivityModal(activities) {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: white;
            padding: 20px;
            border-radius: 8px;
            max-width: 500px;
            width: 90%;
            height: 70vh;
            display: flex;
            flex-direction: column;
        `;

        // Header fixo com título
        const header = document.createElement('div');
        header.style.cssText = `
            flex-shrink: 0;
            margin-bottom: 15px;
        `;
        
        const title = document.createElement('h3');
        title.textContent = 'Selecione uma corrida:';
        title.style.cssText = `
            margin: 0;
            color: #333;
        `;
        header.appendChild(title);

        // Área de rolagem para as atividades
        const scrollContainer = document.createElement('div');
        scrollContainer.style.cssText = `
            flex: 1;
            overflow-y: auto;
            border: 1px solid #ddd;
            border-radius: 4px;
            padding: 10px;
            margin-bottom: 15px;
        `;

        const list = document.createElement('div');
        list.id = 'activityList';
        scrollContainer.appendChild(list);

        // Footer fixo com botão cancelar
        const footer = document.createElement('div');
        footer.style.cssText = `
            flex-shrink: 0;
            text-align: center;
        `;
        
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancelar';
        cancelBtn.style.cssText = `
            padding: 8px 20px;
            background-color: #6c757d;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        `;
        cancelBtn.onmouseover = () => cancelBtn.style.backgroundColor = '#5a6268';
        cancelBtn.onmouseout = () => cancelBtn.style.backgroundColor = '#6c757d';
        cancelBtn.onclick = () => modal.remove();
        footer.appendChild(cancelBtn);

        // Montar estrutura
        content.appendChild(header);
        content.appendChild(scrollContainer);
        content.appendChild(footer);

        modal.className = 'strava-modal';
        modal.appendChild(content);

        // Adicionar atividades à lista
        activities.forEach(activity => {
            const date = new Date(activity.start_date).toLocaleDateString('pt-BR');
            const item = document.createElement('div');
            item.style.cssText = `
                padding: 12px;
                margin: 8px 0;
                border: 1px solid #ddd;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s ease;
                background: white;
            `;
            item.innerHTML = `
                <strong>${activity.name}</strong><br>
                <span style="font-size: 0.9em; color: #666;">
                    📅 ${date} | 🛣️ ${(activity.distance / 1000).toFixed(2)}km | 🕒 ${this.formatTime(activity.moving_time)} | ⏱️ ${this.formatPace(activity.distance, activity.moving_time)}
                </span>
            `;
            item.onmouseover = () => {
                item.style.background = '#f8f9fa';
                item.style.borderColor = '#007bff';
            };
            item.onmouseout = () => {
                item.style.background = 'white';
                item.style.borderColor = '#ddd';
            };
            item.onclick = () => {
                this.importActivityData(activity);
                modal.remove();
            };
            list.appendChild(item);
        });

        // Adicionar modal ao body
        document.body.appendChild(modal);
        
        // Fechar modal ao clicar fora
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        };

        return modal;
    }

    importActivityData(activity) {
        try {
            // Preencher formulário com dados da atividade
            document.getElementById('distancia').value = (activity.distance / 1000).toFixed(2);
            
            // Converter tempo total para formato mm:ss
            const tempoSegundos = activity.moving_time;
            const horas = Math.floor(tempoSegundos / 3600);
            const minutos = Math.floor((tempoSegundos % 3600) / 60);
            const segundos = tempoSegundos % 60;
            
            let tempoFormatado;
            if (horas > 0) {
                tempoFormatado = `${horas}:${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
            } else {
                tempoFormatado = `${minutos}:${segundos.toString().padStart(2, '0')}`;
            }
            
            // Preencher campo de tempo
            document.getElementById('tempo').value = tempoFormatado;
            
            // Calcular e preencher campo de pace
            const distanciaKm = activity.distance / 1000;
            const paceSegundosPorKm = tempoSegundos / distanciaKm;
            const paceMinutos = Math.floor(paceSegundosPorKm / 60);
            const paceSegundos = Math.floor(paceSegundosPorKm % 60);
            const paceFormatado = `${paceMinutos}:${paceSegundos.toString().padStart(2, '0')}`;
            
            document.getElementById('pace').value = paceFormatado;
            
            // Mudar para tipo de entrada "tempo"
            document.querySelector('input[name="tipoEntrada"][value="tempo"]').checked = true;
            atualizarVisibilidadeCampos();
            
            // Definir esteira para "Não" após importação
            const esteiraSelect = document.getElementById('esteira');
            if (esteiraSelect) {
                esteiraSelect.value = 'nao';
            }
            
            // Formatar data da atividade
            const dataAtividade = new Date(activity.start_date_local);
            const dataFormatada = dataAtividade.toLocaleDateString('pt-BR', { 
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric' 
            });
            
            // Formatar tempos
            const tempoMovFormatado = this.formatTime(activity.moving_time);
            const tempoDeslocFormatado = this.formatTime(activity.elapsed_time);
            
            // Comparar tempos para detectar pausas
            const diferencaTempos = Math.abs(activity.elapsed_time - activity.moving_time);
            if (diferencaTempos > 10)
                alert('De acordo com o STRAVA, o tempo decorrido desta corrida foi maior que o tempo de movimentação. Lembre de indicar ao TAFímetro se houve ou não pausa total!');

            this.updateStatus(`Atividade importada: ${activity.name} (${dataFormatada})<br>Distância: ${(activity.distance / 1000).toFixed(2)}km<br>Tempo de movimentação: ${tempoMovFormatado}<br>Tempo decorrido: ${tempoDeslocFormatado}`, 'success');
            
            // Salvar no localStorage
            localStorage.setItem('tafimetro_distancia', document.getElementById('distancia').value);
            localStorage.setItem('tafimetro_tempo', tempoFormatado);
            localStorage.setItem('tafimetro_pace', paceFormatado);
            localStorage.setItem('tafimetro_tipoEntrada', 'tempo');
            
        } catch (error) {
            this.updateStatus('Erro ao importar dados: ' + error.message, 'error');
        }
    }

    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }

    formatPace(distanceMeters, timeSeconds) {
        const paceSeconds = timeSeconds / (distanceMeters / 1000);
        const minutes = Math.floor(paceSeconds / 60);
        const seconds = Math.floor(paceSeconds % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}/km`;
    }

    updateStatus(message, type = '') {
        const statusEl = document.getElementById('stravaStatus');
        if (statusEl) {
            if (message && message.trim() !== '') {
                statusEl.innerHTML = message;
                statusEl.style.display = 'block';
                statusEl.className = type;
            } else {
                statusEl.style.display = 'none';
                statusEl.innerHTML = '';
                statusEl.className = '';
            }
        }
    }
}

const tituloGraficos = document.getElementById('titulo-graficos');
const inputIdade = document.getElementById('idade');

// Função para atualizar emojis e texto baseado no sexo selecionado
function atualizarEmojisPorSexo(sexo) {
    // Atualiza emoji no label do campo sexo
    const labelSexo = document.querySelector('label[for="sexo"]');
    if (labelSexo) {
        labelSexo.innerHTML = sexo === 'M' ? '👨 Sexo:' : '👩 Sexo:';
    }

    // Atualiza emoji no título TAFímetro
    const tituloTAFímetro = document.querySelector('h1');
    if (tituloTAFímetro) {
        const emojiCorredor = sexo === 'M' ? '🏃🏻‍♂️' : '🏃🏻‍♀️';
        // Substitui o emoji do corredor mantendo o resto do conteúdo
        const textoAtual = tituloTAFímetro.innerHTML;
        // Substitui tanto o emoji masculino quanto feminino do corredor
        const textoNovo = textoAtual
            .replace(/🏃🏻‍♀️/g, emojiCorredor)
            .replace(/🏃🏻‍♂️/g, emojiCorredor);
        tituloTAFímetro.innerHTML = textoNovo;
    }

    // Atualiza a frase de instrução
    const instrucaoFrase = document.getElementById('instrucaoFrase');
    if (instrucaoFrase) {
        const genero = sexo === 'M' ? 'Desbravador' : 'Desbravadora';
        instrucaoFrase.textContent = `📈 ${genero}, insira os dados da sua corrida!`;
    }
}

// Preenche tabela de referência para um sexo específico em um tbody dado
function preencherTabelaParaSexo(tbodyId, sexoReferencia) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    tbody.innerHTML = '';
    const distancias = [
        { label: '2.4', km: 2.4 },
        { label: '5', km: 5 },
        { label: '10', km: 10 },
        { label: '15', km: 15 },
        { label: 'Meia', km: 21.0975 }
    ];

    for (let idade = 25; idade <= 60; idade += 5) {
        const tr = document.createElement('tr');
        let rowHtml = `<td>${idade} anos</td>`;

        for (const d of distancias) {
            try {
                const ultimoTaf = document.getElementById('ultimoTaf')?.value || 'A1';
                const { tempo, pace } = tempoEPaceParaNota(100, idade, sexoReferencia, d.km, ultimoTaf);
                rowHtml += `<td class="ref-cell"><div class="ref-tempo">${tempo}</div><div class="ref-pace">${pace}</div></td>`;
            } catch (err) {
                rowHtml += `<td class="ref-cell"><div class="ref-tempo">--</div><div class="ref-pace">--</div></td>`;
            }
        }

        tr.innerHTML = rowHtml;
        tbody.appendChild(tr);
    }
}

// Preenche ambas as tabelas (homens e mulheres)
function preencherTabelaReferencia() {
    try {
        preencherTabelaParaSexo('tabelaTemposM', 'M');
        preencherTabelaParaSexo('tabelaTemposF', 'F');
    } catch (e) {
        console.error('Erro ao preencher tabelas de referência:', e);
    }
}

// Função helper para obter distância formatada para 1 casa decimal (usada nos cálculos)
function obterDistanciaFormatada() {
    const valor = parseFloat(document.getElementById('distancia').value);
    return !isNaN(valor) ? parseFloat(valor/*.toFixed(1)*/) : valor;
}

// Função global para atualizar visibilidade dos campos
function atualizarVisibilidadeCampos() {
    const tipoSelecionado = document.querySelector('input[name="tipoEntrada"]:checked').value;
    const entradaTempo = document.getElementById('tempoInput');
    const entradaPace = document.getElementById('paceInput');
    const stravaContainer = document.getElementById('stravaImportContainer');
    
    if (tipoSelecionado === 'tempo') {
        entradaTempo.style.display = 'block';
        entradaPace.style.display = 'none';
        stravaContainer.style.display = 'none';
        document.getElementById('tempo').required = true;
        document.getElementById('pace').required = false;
        localStorage.setItem('tafimetro_tipoEntrada', 'tempo');
    } else if (tipoSelecionado === 'pace') {
        entradaTempo.style.display = 'none';
        entradaPace.style.display = 'block';
        stravaContainer.style.display = 'none';
        document.getElementById('tempo').required = false;
        document.getElementById('pace').required = true;
        localStorage.setItem('tafimetro_tipoEntrada', 'pace');
    } else if (tipoSelecionado === 'importar') {
        console.log("ENTROU AQUI")
        entradaTempo.style.display = 'none';
        entradaPace.style.display = 'none';
        stravaContainer.style.display = 'block';
        document.getElementById('tempo').required = false;
        document.getElementById('pace').required = false;
        localStorage.setItem('tafimetro_tipoEntrada', 'importar');
    }
}

document.addEventListener('DOMContentLoaded', function () {
    // Inicializar integração com Strava
    window.stravaIntegration = new StravaIntegration();
    
    // Limpar status inicial
    const statusEl = document.getElementById('stravaStatus');
    if (statusEl) {
        statusEl.style.display = 'none';
        statusEl.textContent = '';
        statusEl.className = '';
    }
    
    // Controle de exibição dos campos de entrada
    const botoesRadio = document.querySelectorAll('input[name="tipoEntrada"]');
    const entradaTempo = document.getElementById('tempoInput');
    const entradaPace = document.getElementById('paceInput');
    const stravaContainer = document.getElementById('stravaImportContainer');



    // Adicionar listeners aos radio buttons
    botoesRadio.forEach(radio => {
        radio.addEventListener('change', atualizarVisibilidadeCampos);
    });

    // restaurar tipoEntrada salvo
    const tipoSalvo = localStorage.getItem('tafimetro_tipoEntrada');
    if (tipoSalvo === 'tempo' || tipoSalvo === 'pace' || tipoSalvo === 'importar') {
        const rb = document.querySelector(`input[name="tipoEntrada"][value="${tipoSalvo}"]`);
        if (rb) rb.checked = true;
        if (tipoSalvo === 'tempo') {
            entradaTempo.style.display = 'block';
            entradaPace.style.display = 'none';
            stravaContainer.style.display = 'none';
            document.getElementById('tempo').required = true;
            document.getElementById('pace').required = false;
        } else if (tipoSalvo === 'pace') {
            entradaTempo.style.display = 'none';
            entradaPace.style.display = 'block';
            stravaContainer.style.display = 'none';
            document.getElementById('tempo').required = false;
            document.getElementById('pace').required = true;
        } else if (tipoSalvo === 'importar') {
            entradaTempo.style.display = 'none';
            entradaPace.style.display = 'none';
            stravaContainer.style.display = 'block';
            document.getElementById('tempo').required = false;
            document.getElementById('pace').required = false;
        }
    }

    // Estado inicial - chamar depois da restauração
    atualizarVisibilidadeCampos();

    const tEl = document.getElementById('tempo');
    const pEl = document.getElementById('pace');
    const iEl = document.getElementById('idade');
    const dEl = document.getElementById('distancia');
    const sEl = document.getElementById('sexo');
    const vT = localStorage.getItem('tafimetro_tempo');
    const vP = localStorage.getItem('tafimetro_pace');
    const vI = localStorage.getItem('tafimetro_idade');
    const vD = localStorage.getItem('tafimetro_distancia');
    const vS = localStorage.getItem('tafimetro_sexo');
    const vUltimoTaf = localStorage.getItem('tafimetro_ultimoTaf');
    if (tEl && vT != null) tEl.value = vT;
    if (pEl && vP != null) pEl.value = vP;
    if (iEl && vI != null) iEl.value = vI;
    if (dEl && vD != null) dEl.value = vD;
    if (sEl && vS != null) sEl.value = vS;
    if (document.getElementById('ultimoTaf') && vUltimoTaf != null) document.getElementById('ultimoTaf').value = vUltimoTaf;
    if (tEl) tEl.addEventListener('input', () => localStorage.setItem('tafimetro_tempo', tEl.value || ''));
    if (pEl) pEl.addEventListener('input', () => localStorage.setItem('tafimetro_pace', pEl.value || ''));
    if (iEl) iEl.addEventListener('change', () => localStorage.setItem('tafimetro_idade', iEl.value || ''));
    if (dEl) dEl.addEventListener('change', () => localStorage.setItem('tafimetro_distancia', dEl.value || ''));
    if (sEl) {
        sEl.addEventListener('change', () => {
            localStorage.setItem('tafimetro_sexo', sEl.value || '');
            atualizarEmojisPorSexo(sEl.value);
        });
        // Atualizar emojis na inicialização também
        atualizarEmojisPorSexo(sEl.value);
    }

    // Adicionar listener para salvar a seleção do Último TAFímetro e atualizar o card, tabelas e gráficos
    const ultimoTafEl = document.getElementById('ultimoTaf');
    if (ultimoTafEl) {
        ultimoTafEl.addEventListener('change', () => {
            const valorTaf = ultimoTafEl.value || '';
            localStorage.setItem('tafimetro_ultimoTaf', valorTaf);

            // Atualiza o card
            if (typeof atualizarCardOverlayDoShareCard === 'function') {
                atualizarCardOverlayDoShareCard();
            }

            // Atualiza as tabelas de referência
            preencherTabelaReferencia();

            // Atualiza a tabela de notas
            if (typeof atualizarTabelaNotas === 'function') {
                atualizarTabelaNotas();
            }

            // Atualiza os gráficos
            if (typeof gerarGraficos === 'function') {
                gerarGraficos();
            }

            // Atualiza o título dos gráficos
            if (typeof atualizarTituloGraficos === 'function') {
                atualizarTituloGraficos();
            }
        });
    }

    // Handler para copiar/baixar somente o card (movido do index.html)
    const btnShareCard = document.getElementById('copyCardBtn');
    if (!btnShareCard) return;
    btnShareCard.addEventListener('click', async () => {
        const card = document.getElementById('shareCard');
        if (!card || card.style.display === 'none') {
            alert('Nenhum card gerado ainda!');
            return;
        }
        try {
            const CARD_EXPORT_SCALE = 3;
            const canvas = await html2canvas(card, { backgroundColor: null, scale: CARD_EXPORT_SCALE, useCORS: true });
            const filename = montarNomeArquivo();
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png', 1));

            if (blob) {
                const file = new File([blob], filename, { type: 'image/png' });
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({ files: [file], title: 'TAFímetro', text: 'Meu card do TAFímetro' });
                    return;
                }
            }
            if (navigator.share) {
                const dataUrl = canvas.toDataURL('image/png', 1);
                await navigator.share({ title: 'TAFímetro', text: 'Meu card do TAFímetro', url: dataUrl });

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
            alert('Não foi possível gerar a imagem.');
        }
    });

    const btnDownloadCard = document.getElementById('downloadCardBtn');
    if (btnDownloadCard) {
        btnDownloadCard.addEventListener('click', async () => {
            const card = document.getElementById('shareCard');
            if (!card || card.style.display === 'none') {
                alert('Nenhum card gerado ainda!');
                return;
            }

            try {
                // Salvar os estilos originais
                const card = document.getElementById('shareCard');
                const originalBorderRadius = card.style.borderRadius;
                
                // Remover border-radius temporariamente
                card.style.borderRadius = '0';
                
                const canvas = await html2canvas(card, {
                    scale: 3,
                    backgroundColor: null,
                    useCORS: true,
                    logging: false
                });

                // Restaurar o border-radius original
                card.style.borderRadius = originalBorderRadius;

                // Cortar 3px a partir do chão
                const ctx = canvas.getContext('2d');
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height - 5); // 3px * scale 3 = 9px
                const croppedCanvas = document.createElement('canvas');
                croppedCanvas.width = canvas.width;
                croppedCanvas.height = canvas.height - 5;
                croppedCanvas.getContext('2d').putImageData(imageData, 0, 0);

                // Criar link de download
                const dataUrl = croppedCanvas.toDataURL('image/png');
                const link = document.createElement('a');
                link.download = `tafimetro-card-${new Date().toISOString().split('T')[0]}.png`;
                link.href = dataUrl;

                // Adicionar ao documento, clicar e remover
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

            } catch (err) {
                console.error('Erro ao baixar o card:', err);
                alert('Não foi possível baixar o card. Tente novamente.');
            }
        });
    }

    // Manipulação do formulário
    document.getElementById('calcForm').addEventListener('submit', function (e) {
        e.preventDefault();

        const tipoEntrada = document.querySelector('input[name="tipoEntrada"]:checked').value;
        const idade = parseInt(document.getElementById('idade').value);
        const sexo = document.getElementById('sexo').value;
        const distancia = obterDistanciaFormatada();

        // Verificar se o pace é menor que 2:50
        let paceSegundos = 0;

        if (tipoEntrada === 'tempo') {
            const tempo = document.getElementById('tempo').value;
            const distancia = parseFloat(document.getElementById('distancia').value);
            if (distancia > 0) {
                const tempoSegundos = tempoStringParaSegundos(tempo);
                paceSegundos = tempoSegundos / distancia;
            }
        } else {
            const pace = document.getElementById('pace').value;
            paceSegundos = tempoStringParaSegundos(pace);
        }

        // 2:30 em segundos = 170 segundos
        if (paceSegundos > 0 && paceSegundos < 150) {
            alert('Pace menor que 02:30?!! Melhor que o Kipchoge?!! 👀 Olha o golpe hein... 😅 Verifique!');
            return false;
        }

        try {
            let nota;
            let notaA1;
            const ultimoTaf = document.getElementById('ultimoTaf')?.value || 'A1';
            if (tipoEntrada === 'tempo') {
                const tempo = document.getElementById('tempo').value;
                nota = calcularNota(tempo, idade, sexo, distancia, ultimoTaf);
                notaA1 = calcularNota(tempo, idade, sexo, distancia, "A1");
            } else {
                const pace = document.getElementById('pace').value;
                nota = calcularNotaPorPace(pace, idade, sexo, distancia, ultimoTaf);
                notaA1 = calcularNotaPorPace(pace, idade, sexo, distancia, "A1");
            }

            // Renderiza a "share card" estilo app de corrida
            const notaInteiro = Math.max(0, Math.min(100, Math.floor(Number(nota) || 0)));
            const notaA1Inteiro = Math.max(0, Math.min(100, Math.floor(Number(notaA1) || 0)));


            // zona de exemplo: décadas, 90+ é "90-100"
            function rotuloZona(n) {
                if (n === 100) return '100';
                if (n >= 90) return '90-99';
                const low = Math.floor(n / 10) * 10;
                const high = low + 9;
                return `${low}-${high}`;
            }

            let frasesHomem = {
                '50-59': '😁 VIBRANDO!!! 😁',
                '60-69': '🎯💪 ZONA 2, TÁ PAGO!! 💪🎯',
                '70-79': '🏃‍♂️👏 SHOWD CADÊNCIA! 👏🏃‍♂️',
                '80-89': '🔥🏃‍♂️👉 Q TREINO TOP! 👈🏃‍♂️🔥',
                '90-99': '😱🏅⚡ DANGER ZONE ⚡🏅😱',
                '100': '💯🏆😂 DE BIKE, CTZ 😂🏆💯'
            };
            if (ultimoTaf === "L2") {
                frasesHomem = {
                    ...frasesHomem,
                    '90-99': '📈🏅👟 ALÔ, L1?!! 👟🏅📈',
                    '100': '💯😎 L1, TÔ NA ÁREA! 😎💯'
                }
            }
            if (ultimoTaf === "L1") {
                frasesHomem = {
                    ...frasesHomem,
                    '90-99': '📈👉🅱️ ZONA BRAVO 🅱️👈📈',
                    '100': '💯👏 BRAVO? PARTIU!!! 👏💯'
                }
            }
            if (ultimoTaf === "B2") {
                frasesHomem = {
                    ...frasesHomem,
                    '90-99': '📈🏅👟 ALÔ, B1?!! 👟🏅📈',
                    '100': '💯😎 B1, TÔ NA ÁREA! 😎💯'
                }
            }
            if (ultimoTaf === "B1") {
                frasesHomem = {
                    ...frasesHomem,
                    '90-99': '📈👉🅰️ ZONA ALFA 🅰️👈📈',
                    '100': '💯😎 ALFA? PARTIU!!! 😎💯'
                }
            }
            if (ultimoTaf === "A2") {
                frasesHomem = {
                    ...frasesHomem,
                    '90-99': '📈🏅👟 ALÔ, A1?!! 👟🏅📈',
                    '100': '💯🛴 A1, TÔ NA ÁREA! 🛴💯'
                }
            }
            let frasesMulher = {
                ...frasesHomem,
                '70-79': '🏃‍♀️👏 SHOWD CADÊNCIA! 👏🏃‍♀️',
                '80-89': '🔥🏃‍♀️👉 Q TREINO TOP! 👈🏃‍♀️🔥',
            };
            let frasesCardPrint = {
                '60-69': '🎯 ZONA 2, PAGO!! 🎯',
                '70-79': '👏 SHOWD CADÊNCIA! 👏',
                '80-89': '🔥 Q TREINO TOP!! 🔥',
                '90-99': '⚡ DANGER ZONE ⚡',
                '100': '💯😂 DE BIKE, CTZ 😂💯'
            }
            if (ultimoTaf === "L2") {
                frasesCardPrint = {
                    ...frasesCardPrint,
                    '90-99': '📈👟 ALÔ, L1?!! 👟📈',
                    '100': '💯 L1, TÔ NA ÁREA! 💯'
                }
            }
            if (ultimoTaf === "L1") {
                frasesCardPrint = {
                    ...frasesCardPrint,
                    '90-99': '👉🅱️ ZONA BRAVO 🅱️👈',
                    '100': '💯👏 BRAVO? PARTIU! 👏💯'
                }
            }
            if (ultimoTaf === "B2") {
                frasesCardPrint = {
                    ...frasesCardPrint,
                    '90-99': '📈👟 ALÔ, B1?!! 👟📈',
                    '100': '💯 B1, TÔ NA ÁREA! 💯'
                }
            }
            if (ultimoTaf === "B1") { //🔝
                frasesCardPrint = {
                    ...frasesCardPrint,
                    '90-99': '👉🅰️ ZONA ALFA 🅰️👈',
                    '100': '💯😎 ALFA? PARTIU! 😎💯'
                }
            }
            if (ultimoTaf === "A2") {
                frasesCardPrint = {
                    ...frasesCardPrint,
                    '90-99': '🏅👟 ALÔ, A1?!! 👟🏅',
                    '100': '💯🛴 A1, TÔ NA ÁREA! 🛴💯'
                }
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
            if (ultimoTaf === "A1" && notaInteiro === 100) {
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
                if (ultimoTaf?.includes('A')) {
                    if (ultimoTaf === "A1") {
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
                    else {
                        bgStart = black90Start;
                        bgEnd = black90End;
                    }
                }
                else {
                    if (ultimoTaf?.includes('L')) {
                        bgStart = silverL90Start;
                        bgEnd = silverL90End;
                    }
                    else {
                        bgStart = silverB90Start;
                        bgEnd = silverB90End;
                    }
                }
            }

            // cor do texto — fixa por sexo para < 90 (sem variação por luminância)
            let textColor;
            if (ultimoTaf === "A1" && notaInteiro === 100) {
                textColor = sexo === 'F' ? '#2c0045ff' : '#002157ff';
            }
            else if ((!ultimoTaf?.includes('A') && notaInteiro >= 90) || notaInteiro < 90) {
                textColor = sexo === 'F' ? 'rgb(54, 0, 96)' : 'rgb(0, 37, 96)';
            } else {
                // 90–99: manter cores claras atuais por sexo
                textColor = sexo === 'F' ? 'rgb(230, 180, 204)' : 'rgb(156, 202, 221)';
            }

            const zone = rotuloZona(notaInteiro);
            const phrase = frases[zone] || (notaInteiro >= 90 ? frases['90-100'] : '💪 BORA VIBRAR! 💪');
            const printPhrase = (frasesPrint && frasesPrint[zone]) ? frasesPrint[zone] : phrase;

            // calcular tempo / pace para exibir no card
            let displayTempo = '--:--', displayPace = '--:--';
            try {
                if (tipoEntrada === 'tempo') {
                    const tempoVal = document.getElementById('tempo').value;
                    const seg = tempoStringParaSegundos(tempoVal);
                    displayTempo = segundosParaMMSS(seg);
                    displayPace = segundosParaMMSS(seg / distancia);
                } else {
                    const paceVal = document.getElementById('pace').value;
                    const paceSeg = tempoStringParaSegundos(paceVal);
                    displayPace = segundosParaMMSS(paceSeg);
                    const seg = paceSeg * distancia;
                    displayTempo = segundosParaMMSS(seg);
                }
            } catch (e) { /* segura se inputs faltarem */ }

            const distLabel = Number.isFinite(distancia)
                ? (parseFloat(distancia.toFixed(1)) % 1 === 0
                    ? `${distancia.toFixed(0)} k <span class="tafimetro-separator">|</span> <span class="tafimetro-value">${ultimoTaf}</span>`
                    : `${distancia.toFixed(1)} k <span class="tafimetro-separator">|</span> <span class="tafimetro-value">${ultimoTaf}</span>`)
                : `-- k <span class="tafimetro-separator">|</span> <span class="tafimetro-value">${ultimoTaf}</span>`;

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
            document.getElementById('scoreDistancia').innerHTML = distLabel;
            document.getElementById('zoneSmall').textContent = zone;
            document.getElementById('cardTempo').textContent = displayTempo;
            document.getElementById('cardPace').textContent = `${displayPace} /km`;
            const zonePhraseEl = document.getElementById('zonePhrase');
            zonePhraseEl.textContent = phrase;

            zonePhraseEl.style.color = ''; // resetar para cor padrão
            // Aplicar cor rgb(254, 240, 165) quando a nota estiver entre 90 e 99
            if (ultimoTaf.includes('A') && notaInteiro >= 90 && notaInteiro <= 100) {
                if (ultimoTaf !== "A1" || notaInteiro < 100) {
                    zonePhraseEl.style.color = 'rgba(242, 244, 164, 1)';
                }
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

// Gera dados (array de {x: tempoSegundos, y: nota}) para uma distância e sexo
function gerarDadosParaDistancia(notas, idade, sexo, km) {
    const dados = [];
    const ultimoTaf = document.getElementById('ultimoTaf')?.value || 'A1';
    for (const nota of notas) {
        try {
            const res = tempoEPaceParaNota(nota, idade, sexo, km, ultimoTaf);
            let tempo;
            if (res && typeof res === 'object') tempo = res.tempo || res.time || res.t || res;
            else tempo = res;
            const seg = tempoStringParaSegundos(tempo);
            if (isFinite(seg)) dados.push({ x: seg, y: nota });
            else dados.push({ x: null, y: nota });
        } catch (e) {
            dados.push({ x: null, y: nota });
        }
    }
    return dados;
}

// Cria/atualiza todos os gráficos — agora com Nota no eixo Y (iniciando em 50)
function gerarGraficos() {
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js não carregado');
        return;
    }

    // Intervalo de notas: 50 → 100 (a cada 5)
    const notas = [];
    for (let n = 50; n <= 100; n += n >= 90 ? 1 : 5) notas.push(n);

    const idade = parseInt(document.getElementById('idade')?.value) || 30;
    const distancias = [
        { id: 'chart-2-4', km: 2.4, label: '2.4 km' },
        { id: 'chart-5', km: 5, label: '5 km' },
        { id: 'chart-10', km: 10, label: '10 km' },
        { id: 'chart-15', km: 15, label: '15 km' },
        { id: 'chart-meia', km: 21.0975, label: 'Meia' }
    ];

    window._charts = window._charts || {};

    for (const d of distancias) {
        const canvasEl = document.getElementById(d.id);
        if (!canvasEl) continue;

        if (window._charts[d.id]) {
            try { window._charts[d.id].destroy(); } catch (e) { }
        }

        const dadosHomens = gerarDadosParaDistancia(notas, idade, 'M', d.km);
        const dadosMulheres = gerarDadosParaDistancia(notas, idade, 'F', d.km);

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
                        borderColor: 'rgb(216, 27, 96)',
                        backgroundColor: 'rgba(216,27,96,0.08)',
                        spanGaps: true,
                        tension: 0.25,
                        pointRadius: 3,
                        parsing: false
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
            window._charts[d.id] = new Chart(canvasEl.getContext('2d'), config);
        } catch (e) {
            console.error('Erro ao criar gráfico', d.id, e);
        }
    }
}

// Função para converter código do nível para nome completo
function codigoParaNomeNivel(codigo) {
    const nomes = {
        'A1': 'ALFA 1',
        'A2': 'ALFA 2',
        'B1': 'BRAVO 1',
        'B2': 'BRAVO 2',
        'L1': 'LIGHT 1',
        'L2': 'LIGHT 2'
    };
    return nomes[codigo] || codigo;
}

// Adicione esta função para atualizar o título
function atualizarTituloGraficos() {
    const idade = inputIdade.value;
    const nivel = document.getElementById('ultimoTaf').value;
    const nomeNivel = codigoParaNomeNivel(nivel);
    tituloGraficos.textContent = `Gráficos: Nota vs Tempo, ${nomeNivel}`;
}

function onFormInputsChange() {
    atualizarTituloGraficos();
    atualizarTituloReferencia();
    atualizarTabelaNotas();
    try { gerarGraficos(); } catch (e) { }
}

// Chamar gerarGraficos() após carregar página e quando idade mudar
document.addEventListener('DOMContentLoaded', function () {
    onFormInputsChange();
    const idadeInput = document.getElementById('idade');
    if (idadeInput) {
        idadeInput.addEventListener('change', onFormInputsChange);
        idadeInput.addEventListener('input', onFormInputsChange);
    }
    // Inicializa compositor após DOM pronto
    try { configurarCompositor(); } catch (e) { console.warn('Compositor não inicializado:', e); }
});

// Chamar a função uma vez para definir o título inicial
onFormInputsChange();

function atualizarTabelaNotas() {
    const idade = parseInt(document.getElementById('idade').value);
    const sexo = document.getElementById('sexo').value;
    const distancia = obterDistanciaFormatada();
    const tabelaNotas = document.getElementById('tabelaNotas');
    const idadeRef = document.getElementById('idade-ref');

    // Atualiza a idade no título
    idadeRef.textContent = idade;

    // Limpa a tabela
    tabelaNotas.innerHTML = '';

    // Gera linhas para notas de 100 a 50
    const ultimoTaf = document.getElementById('ultimoTaf')?.value || 'A1';
    for (let nota = 50; nota <= 100; nota += 1) {
        const resultado = tempoEPaceParaNota(nota, idade, sexo, distancia, ultimoTaf);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${nota}</td>
            <td>${resultado.tempo}</td>
            <td>${resultado.pace}</td>
        `;
        tabelaNotas.appendChild(tr);
    }
}


// Inicializar a tabela
document.addEventListener('DOMContentLoaded', onFormInputsChange);

function atualizarTituloReferencia() {
    const idade = document.getElementById('idade').value;
    const sexo = document.getElementById('sexo').value;
    const distancia = document.getElementById('distancia').value;
    const nivel = document.getElementById('ultimoTaf').value;
    
    document.getElementById('idade-ref').textContent = idade;
    document.getElementById('distancia-ref').textContent = distancia;
    const nomeNivel = codigoParaNomeNivel(nivel);
    document.getElementById('nivel-ref').textContent = nomeNivel; // Show the full level name (ALFA 1, LIGHT 2, etc.)
    document.getElementById('sexo-ref').textContent = sexo === 'M' ? 'Masc.' : 'Fem.';
    
    // Atualiza o título da tabela de referência
    const tituloReferencia = document.getElementById('titulo-referencia');
    if (tituloReferencia) {
        tituloReferencia.textContent = `Tempos de Referência para Nota 100 (${nomeNivel})`;
    }
}




// Adicionar listener para o toggle de mostrar/ocultar Pace (removido junto com hustle)

// Adicionar listener para o toggle de mostrar/ocultar Pace
document.getElementById('togglePace').addEventListener('change', function () {
    const paceContainers = document.querySelectorAll('.meta-item:has(#cardPace)');
    const isChecked = this.checked;

    // Salvar preferência no localStorage
    localStorage.setItem('showPace', isChecked);

    // Mostrar ou ocultar todo o container de Pace
    paceContainers.forEach(container => {
        container.style.display = isChecked ? 'unset' : 'none';
    });

    // Atualizar o card de compartilhamento
    if (typeof atualizarCardOverlayDoShareCard === 'function') {
        atualizarCardOverlayDoShareCard();
    }
});

// Verificar preferências salvas ao carregar a página
document.addEventListener('DOMContentLoaded', function () {
    const togglePace = document.getElementById('togglePace');
    const paceContainers = document.querySelectorAll('.meta-item:has(#cardPace)');
    const savedPacePreference = localStorage.getItem('showPace');
    const showPace = savedPacePreference === null ? true : savedPacePreference === 'true';

    // Aplicar preferência do Pace
    togglePace.checked = showPace;
    paceContainers.forEach(container => {
        container.style.display = showPace ? 'unset' : 'none';
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
        const borderRadius = `${tl}px ${tr}px ${br}px ${bl}px`;
        clone.style.borderRadius = borderRadius;
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

    // Distribui emojis somente no clone e não para nota 100
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
}

document.addEventListener("DOMContentLoaded", () => {
    const metasTop = window.temposRefOrig;
    if (!metasTop) return;

    // --- Funções auxiliares ---
    const tempoParaSegundos = (tempoStr) => {
        if (!tempoStr) return 0;
        const partes = tempoStr.split(":").map(Number);
        if (partes.length === 2) return partes[0] * 60 + partes[1];
        if (partes.length === 3) return partes[0] * 3600 + partes[1] * 60 + partes[2];
        return 0;
    };

    const segundosParaTempo = (seg) => {
        let min = Math.floor(seg / 60);
        let s = seg % 60;

        // Arredonda os segundos
        s = Math.round(s);

        // Se virou 60, ajusta
        if (s === 60) {
            min += 1;
            s = 0;
        }

        return `${min}:${s.toString().padStart(2, "0")}`;
    };

    const calcularPace = (distanciaKm, tempoStr) => {
        const segundos = tempoParaSegundos(tempoStr);
        if (!segundos || !distanciaKm) return "--:--";
        const paceSeg = segundos / distanciaKm;
        return segundosParaTempo(paceSeg);
    };

    // --- Preenche tabela estática ---
    const tbody = document.getElementById("temposRefOrigTbody");
    if (!tbody) return;

    tbody.innerHTML = '';

    for (const [distancia, dados] of Object.entries(metasTop)) {
        // Normaliza a distância (ex.: "meia" → 21.1 km)
        const km = distancia.includes("meia")
            ? 21.1
            : parseFloat(distancia.replace("km", "").replace(",", "."));

        // Exibe apenas metas existentes
        if (dados.M) {
            const { idade, tempo } = dados.M;
            const tr = document.createElement('tr');
            tr.style.background = 'rgb(232, 240, 255)';
            tr.innerHTML = `
                <td>${distancia}</td>
                <td>M</td>
                <td>${idade}</td>
                <td>${tempo}</td>
                <td>${calcularPace(km, tempo)}</td>
            `;
            tbody.appendChild(tr);
        }

        if (dados.F) {
            const { idade, tempo } = dados.F;
            const tr = document.createElement('tr');
            tr.style.background = 'rgb(255, 232, 240)';
            tr.innerHTML = `
                <td>${distancia}</td>
                <td>F</td>
                <td>${idade}</td>
                <td>${tempo}</td>
                <td>${calcularPace(km, tempo)}</td>
            `;
            tbody.appendChild(tr);
        }
    }
});

// Adicionar listener para o select de intervalo
document.getElementById('intervalado')?.addEventListener('change', function () {
    const scoreBig = document.getElementById('scoreBig');
    const obsDiv = document.getElementById('obsIntervalado');

    // if (scoreBig) {
    //     scoreBig.style.display = this.value === 'sim' ? 'none' : 'block';
    // }

    if (obsDiv) {
        obsDiv.style.display = this.value === 'sim' ? 'block' : 'none';
    }

});

// Modificar o event listener do formulário para incluir a verificação de intervalo
const originalSubmitHandler = document.getElementById('calcForm')?.onsubmit;
document.getElementById('calcForm').onsubmit = function (e) {
    // Verificar se é intervalo e esconder o scoreBig se necessário
    const isIntervalado = document.getElementById('intervalado')?.value === 'sim';
    const scoreBig = document.getElementById('scoreBig');
    if (scoreBig && isIntervalado) {
        scoreBig.style.display = 'none';
    }
    else scoreBig.style.display = 'block';

    // Chamar o handler original se existir
    if (originalSubmitHandler) {
        return originalSubmitHandler.call(this, e);
    }
};

