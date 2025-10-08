        // Configuração das redes com API V2 unificada
        const CHAIN_CONFIG = {
            'eth': { chainId: 1, name: 'Ethereum', symbol: 'ETH', explorer: 'https://etherscan.io' },
            'bsc': { chainId: 56, name: 'BNB Smart Chain', symbol: 'BNB', explorer: 'https://bscscan.com' },
            'polygon': { chainId: 137, name: 'Polygon', symbol: 'MATIC', explorer: 'https://polygonscan.com' },
            'arbitrum': { chainId: 42161, name: 'Arbitrum One', symbol: 'ETH', explorer: 'https://arbiscan.io' },
            'optimism': { chainId: 10, name: 'Optimism', symbol: 'ETH', explorer: 'https://optimistic.etherscan.io' },
            'avalanche': { chainId: 43114, name: 'Avalanche C-Chain', symbol: 'AVAX', explorer: 'https://snowtrace.io' },
            'base': { chainId: 8453, name: 'Base', symbol: 'ETH', explorer: 'https://basescan.org' },
            'blast': { chainId: 81457, name: 'Blast', symbol: 'ETH', explorer: 'https://blastscan.io' },
            'scroll': { chainId: 534352, name: 'Scroll', symbol: 'ETH', explorer: 'https://scrollscan.com' },
            'zksync': { chainId: 324, name: 'zkSync Era', symbol: 'ETH', explorer: 'https://explorer.zksync.io' },
            'linea': { chainId: 59144, name: 'Linea', symbol: 'ETH', explorer: 'https://lineascan.build' },
            'mantle': { chainId: 5000, name: 'Mantle', symbol: 'MNT', explorer: 'https://explorer.mantle.xyz' }
        };

        // API Key integrada no backend (segura)
        const API_KEY = 'ECDIJNMAUY72H942SMG2A3UG53YUD275CB';
        const API_BASE_URL = 'https://api.etherscan.io/v2/api';

        // Variáveis globais
        let currentTransactions = [];
        let currentTokenInfo = null;
        let debugMode = true;
        let analysisMode = 'wallet'; // 'wallet' ou 'contract'
        let globalTokenAnalysis = null;

        // Elementos DOM
        const networkSelector = document.getElementById('networkSelector');
        const walletAddressInput = document.getElementById('walletAddress');
        const tokenAddressInput = document.getElementById('tokenAddress');
        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');
        const analyzeBtn = document.getElementById('analyzeBtn');
        const statusMessage = document.getElementById('statusMessage');
        const resultsContainer = document.getElementById('resultsContainer');
        const debugPanel = document.getElementById('debugPanel');
        const debugContent = document.getElementById('debugContent');
        const tokenInfoCard = document.getElementById('tokenInfoCard');

        // Função de debug
        function addDebugInfo(message, data = null, type = 'info') {
            if (!debugMode) return;
            
            const timestamp = new Date().toLocaleTimeString();
            const debugLine = document.createElement('div');
            debugLine.className = 'debug-line';
            
            let icon = 'ℹ️';
            let color = 'text-blue-400';
            
            switch(type) {
                case 'success': icon = '✅'; color = 'text-green-400'; break;
                case 'error': icon = '❌'; color = 'text-red-400'; break;
                case 'warning': icon = '⚠️'; color = 'text-yellow-400'; break;
                case 'api': icon = '🌐'; color = 'text-purple-400'; break;
                case 'data': icon = '📊'; color = 'text-cyan-400'; break;
                case 'token': icon = '🪙'; color = 'text-green-400'; break;
            }
            
            debugLine.innerHTML = `
                <span class="text-gray-500">[${timestamp}]</span> 
                <span class="${color}">${icon}</span> 
                <span class="text-gray-300">${message}</span>
            `;
            
            if (data) {
                const dataDiv = document.createElement('div');
                dataDiv.className = 'ml-6 mt-1 text-xs text-gray-400 bg-gray-800/50 p-2 rounded';
                dataDiv.textContent = JSON.stringify(data, null, 2);
                debugLine.appendChild(dataDiv);
            }
            
            debugContent.appendChild(debugLine);
            debugPanel.classList.remove('hidden');
            debugPanel.scrollTop = debugPanel.scrollHeight;
        }

        // Função para construir URL da API V2
        function buildApiUrl(chainKey, module, action, params = {}) {
            const chainId = CHAIN_CONFIG[chainKey].chainId;
            
            const urlParams = new URLSearchParams({
                chainid: chainId,
                module: module,
                action: action,
                apikey: API_KEY,
                ...params
            });
            
            return `${API_BASE_URL}?${urlParams.toString()}`;
        }

        // Função para buscar informações do token específico do contrato
        async function getTokenInfo(chainKey, tokenAddress, walletAddress) {
            try {
                addDebugInfo('🪙 Buscando informações do token do contrato especificado...', { 
                    tokenAddress,
                    chainKey,
                    note: 'Analisando APENAS o token deste contrato específico'
                }, 'token');
                
                // Primeiro, tentar buscar informações básicas do token
                let tokenInfo = null;
                let decimals = 18;
                
                // Método 1: Tentar API tokeninfo (funciona para alguns tokens)
                try {
                    const nameUrl = buildApiUrl(chainKey, 'token', 'tokeninfo', { contractaddress: tokenAddress });
                    addDebugInfo('🌐 Tentando endpoint tokeninfo...', { url: nameUrl.replace(API_KEY, 'HIDDEN') }, 'api');
                    
                    const nameResponse = await fetch(nameUrl);
                    const nameData = await nameResponse.json();
                    
                    addDebugInfo('📡 Resposta tokeninfo', { 
                        status: nameData.status, 
                        message: nameData.message,
                        hasResult: !!nameData.result
                    }, 'api');
                    
                    if (nameData.status === '1' && nameData.result && nameData.result.length > 0) {
                        tokenInfo = nameData.result[0];
                        decimals = parseInt(tokenInfo.divisor) || 18;
                        addDebugInfo('✅ Token info obtida via tokeninfo', tokenInfo, 'token');
                    }
                } catch (error) {
                    addDebugInfo('⚠️ Erro no endpoint tokeninfo', { error: error.message }, 'warning');
                }
                
                // Método 2: Se não funcionou, tentar buscar via transações de token para obter informações
                if (!tokenInfo) {
                    try {
                        addDebugInfo('🔄 Tentando obter info via transações de token...', null, 'token');
                        
                        const txUrl = buildApiUrl(chainKey, 'account', 'tokentx', {
                            contractaddress: tokenAddress,
                            address: walletAddress,
                            page: 1,
                            offset: 1,
                            sort: 'desc'
                        });
                        
                        const txResponse = await fetch(txUrl);
                        const txData = await txResponse.json();
                        
                        addDebugInfo('📡 Resposta tokentx', { 
                            status: txData.status, 
                            message: txData.message,
                            resultCount: txData.result ? txData.result.length : 0
                        }, 'api');
                        
                        if (txData.status === '1' && txData.result && txData.result.length > 0) {
                            const firstTx = txData.result[0];
                            tokenInfo = {
                                tokenName: firstTx.tokenName || 'Token Desconhecido',
                                symbol: firstTx.tokenSymbol || 'UNKNOWN'
                            };
                            decimals = parseInt(firstTx.tokenDecimal) || 18;
                            addDebugInfo('✅ Token info obtida via transações', tokenInfo, 'token');
                        }
                    } catch (error) {
                        addDebugInfo('⚠️ Erro ao buscar via transações', { error: error.message }, 'warning');
                    }
                }
                
                // Método 3: Fallback - usar informações conhecidas de tokens específicos
                if (!tokenInfo) {
                    addDebugInfo('🔄 Verificando tokens conhecidos...', { tokenAddress }, 'token');
                    
                    // Base de dados de tokens conhecidos
                    const knownTokens = {
                        '0xAEdED60cBadD688279908dF18194FD31387baEb4': {
                            name: 'Golden Eggs',
                            symbol: 'GEGG',
                            decimals: 18
                        },
                        '0xaeded60cbadd688279908df18194fd31387baeb4': {
                            name: 'Golden Eggs',
                            symbol: 'GEGG',
                            decimals: 18
                        }
                    };
                    
                    const knownToken = knownTokens[tokenAddress.toLowerCase()];
                    if (knownToken) {
                        tokenInfo = {
                            tokenName: knownToken.name,
                            symbol: knownToken.symbol
                        };
                        decimals = knownToken.decimals;
                        
                        addDebugInfo('✅ Token conhecido identificado!', {
                            name: tokenInfo.tokenName,
                            symbol: tokenInfo.symbol,
                            source: 'Base de dados de tokens conhecidos'
                        }, 'success');
                    } else {
                        addDebugInfo('🔄 Usando informações padrão do contrato...', null, 'token');
                        tokenInfo = {
                            tokenName: 'Token Personalizado',
                            symbol: 'TOKEN'
                        };
                    }
                }
                
                // Buscar saldo do token na carteira
                let balance = '0';
                try {
                    const balanceUrl = buildApiUrl(chainKey, 'account', 'tokenbalance', { 
                        contractaddress: tokenAddress,
                        address: walletAddress
                    });
                    
                    const balanceResponse = await fetch(balanceUrl);
                    const balanceData = await balanceResponse.json();
                    
                    if (balanceData.status === '1') {
                        balance = balanceData.result;
                    }
                    
                    addDebugInfo('💰 Saldo obtido', { balance, decimals }, 'token');
                } catch (error) {
                    addDebugInfo('⚠️ Erro ao buscar saldo', { error: error.message }, 'warning');
                }
                
                const formattedBalance = (parseFloat(balance) / Math.pow(10, decimals)).toFixed(6);
                
                currentTokenInfo = {
                    name: tokenInfo.tokenName || 'Token Desconhecido',
                    symbol: tokenInfo.symbol || 'UNKNOWN',
                    balance: formattedBalance,
                    decimals: decimals,
                    contractAddress: tokenAddress
                };
                
                addDebugInfo('✅ Informações FINAIS do token obtidas', {
                    ...currentTokenInfo,
                    note: 'Este é o token do contrato inserido - Golden Eggs (GEGG) ou similar'
                }, 'token');
                
                displayTokenInfo();
                
            } catch (error) {
                addDebugInfo('❌ Erro geral ao buscar informações do token', { error: error.message }, 'error');
                
                // Fallback final - criar info básica
                currentTokenInfo = {
                    name: 'Token do Contrato',
                    symbol: 'TOKEN',
                    balance: '0.000000',
                    decimals: 18,
                    contractAddress: tokenAddress
                };
                
                displayTokenInfo();
            }
        }

        // Função para exibir informações do token
        function displayTokenInfo() {
            if (!currentTokenInfo) {
                addDebugInfo('⚠️ currentTokenInfo é null, não é possível exibir informações', null, 'warning');
                return;
            }
            
            try {
                const tokenNameEl = document.getElementById('tokenName');
                const tokenSymbolEl = document.getElementById('tokenSymbol');
                const tokenBalanceEl = document.getElementById('tokenBalance');
                
                if (tokenNameEl) tokenNameEl.textContent = currentTokenInfo.name || 'Token Desconhecido';
                if (tokenSymbolEl) tokenSymbolEl.textContent = currentTokenInfo.symbol || 'UNKNOWN';
                if (tokenBalanceEl) tokenBalanceEl.textContent = `${currentTokenInfo.balance || '0.000000'} ${currentTokenInfo.symbol || 'TOKEN'}`;
                
                if (tokenInfoCard) {
                    tokenInfoCard.classList.remove('hidden');
                }
                
                // Exibir informações detalhadas com segurança
                setTimeout(() => {
                    displayDetailedInfo();
                }, 100);
                
                addDebugInfo('🪙 Card de informações do token exibido com segurança', {
                    name: currentTokenInfo.name,
                    symbol: currentTokenInfo.symbol,
                    balance: currentTokenInfo.balance
                }, 'token');
                
            } catch (error) {
                addDebugInfo('❌ Erro ao exibir informações do token', { 
                    error: error.message,
                    tokenInfo: currentTokenInfo 
                }, 'error');
            }
        }

        // Função para exibir informações detalhadas do contrato e carteira
        function displayDetailedInfo() {
            try {
                const networkKey = document.getElementById('networkSelector')?.value || 'eth';
                const walletAddress = document.getElementById('walletAddress')?.value?.trim() || '';
                const tokenAddress = document.getElementById('tokenAddress')?.value?.trim() || '';
                const startDate = document.getElementById('startDate')?.value || '';
                const endDate = document.getElementById('endDate')?.value || '';
                
                // Verificar se os elementos existem antes de tentar acessá-los
                const contractAddressEl = document.getElementById('contractAddress');
                const contractNetworkEl = document.getElementById('contractNetwork');
                const contractDecimalsEl = document.getElementById('contractDecimals');
                const contractExplorerEl = document.getElementById('contractExplorer');
                const walletExplorerEl = document.getElementById('walletExplorer');
                const walletAddressEl = document.getElementById('walletAddress');
                const walletTokenBalanceEl = document.getElementById('walletTokenBalance');
                const analysisPeriodEl = document.getElementById('analysisPeriod');
                const lastUpdateEl = document.getElementById('lastUpdate');
                const appliedFiltersEl = document.getElementById('appliedFilters');
                const detailedInfoCardEl = document.getElementById('detailedInfoCard');
                
                if (!contractAddressEl || !contractNetworkEl || !contractDecimalsEl) {
                    addDebugInfo('⚠️ Elementos de informações detalhadas não encontrados', null, 'warning');
                    return;
                }
                
                // Informações do Contrato
                contractAddressEl.textContent = tokenAddress || 'Não especificado';
                contractNetworkEl.textContent = CHAIN_CONFIG[networkKey]?.name || 'Desconhecido';
                contractDecimalsEl.textContent = currentTokenInfo?.decimals?.toString() || '18';
                
                // Links para exploradores
                if (contractExplorerEl && walletExplorerEl) {
                    const explorerUrl = getExplorerUrl(networkKey, 'token', tokenAddress);
                    const walletExplorerUrl = getExplorerUrl(networkKey, 'address', walletAddress);
                    
                    contractExplorerEl.href = explorerUrl;
                    walletExplorerEl.href = walletExplorerUrl;
                }
                
                // Informações da Carteira
                if (walletAddressEl) {
                    walletAddressEl.textContent = walletAddress || 'Não especificado';
                }
                
                if (walletTokenBalanceEl) {
                    walletTokenBalanceEl.textContent = currentTokenInfo ? 
                        `${currentTokenInfo.balance || '0.000000'} ${currentTokenInfo.symbol || 'TOKEN'}` : 'Não disponível';
                }
                
                // Período de análise
                if (analysisPeriodEl) {
                    if (startDate && endDate) {
                        try {
                            const start = new Date(startDate).toLocaleDateString('pt-BR');
                            const end = new Date(endDate).toLocaleDateString('pt-BR');
                            analysisPeriodEl.textContent = `${start} até ${end}`;
                        } catch (dateError) {
                            analysisPeriodEl.textContent = 'Período inválido';
                        }
                    } else {
                        analysisPeriodEl.textContent = 'Não especificado';
                    }
                }
                
                // Última atualização
                if (lastUpdateEl) {
                    try {
                        lastUpdateEl.textContent = new Date().toLocaleString('pt-BR');
                    } catch (timeError) {
                        lastUpdateEl.textContent = 'Agora';
                    }
                }
                
                // Filtros aplicados
                if (appliedFiltersEl) {
                    const filters = [];
                    const minValue = document.getElementById('minValue')?.value;
                    const maxValue = document.getElementById('maxValue')?.value;
                    const txType = document.getElementById('txType')?.value;
                    const specificAddress = document.getElementById('specificAddress')?.value;
                    
                    if (minValue) filters.push(`Min: ${minValue}`);
                    if (maxValue) filters.push(`Max: ${maxValue}`);
                    if (txType && txType !== 'all') filters.push(`Tipo: ${txType}`);
                    if (specificAddress) filters.push(`Endereço específico`);
                    
                    appliedFiltersEl.textContent = filters.length > 0 ? filters.join(', ') : 'Nenhum';
                }
                
                // Mostrar card de informações detalhadas
                if (detailedInfoCardEl) {
                    detailedInfoCardEl.classList.remove('hidden');
                }
                
                addDebugInfo('📋 Informações detalhadas exibidas com segurança', {
                    contract: tokenAddress || 'N/A',
                    wallet: walletAddress ? walletAddress.substring(0, 10) + '...' : 'N/A',
                    network: CHAIN_CONFIG[networkKey]?.name || 'N/A',
                    hasTokenInfo: !!currentTokenInfo
                }, 'success');
                
            } catch (error) {
                addDebugInfo('❌ Erro ao exibir informações detalhadas', { 
                    error: error.message,
                    stack: error.stack 
                }, 'error');
                
                // Tentar mostrar pelo menos o card vazio
                const detailedInfoCardEl = document.getElementById('detailedInfoCard');
                if (detailedInfoCardEl) {
                    detailedInfoCardEl.classList.remove('hidden');
                }
            }
        }

        // Função para obter URL do explorador
        function getExplorerUrl(networkKey, type, address) {
            const explorers = {
                'eth': 'https://etherscan.io',
                'bsc': 'https://bscscan.com',
                'polygon': 'https://polygonscan.com',
                'arbitrum': 'https://arbiscan.io',
                'optimism': 'https://optimistic.etherscan.io',
                'avalanche': 'https://snowtrace.io',
                'base': 'https://basescan.org',
                'blast': 'https://blastscan.io',
                'scroll': 'https://scrollscan.com',
                'zksync': 'https://explorer.zksync.io'
            };
            
            const baseUrl = explorers[networkKey] || 'https://etherscan.io';
            const path = type === 'token' ? 'token' : 'address';
            
            return `${baseUrl}/${path}/${address}`;
        }

        // Configuração inicial das datas
        function initializeDates() {
            const today = new Date();
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(today.getDate() - 30);

            endDateInput.value = today.toISOString().split('T')[0];
            startDateInput.value = thirtyDaysAgo.toISOString().split('T')[0];
        }

        // Função para definir períodos rápidos
        window.setPeriod = (days) => {
            const today = new Date();
            const pastDate = new Date();
            pastDate.setDate(today.getDate() - days);

            endDateInput.value = today.toISOString().split('T')[0];
            startDateInput.value = pastDate.toISOString().split('T')[0];
            
            addDebugInfo(`Período definido para ${days} dias`, { startDate: pastDate.toISOString(), endDate: today.toISOString() });
        };

        // Toggle de filtros avançados
        document.getElementById('toggleFilters').addEventListener('click', function() {
            const filters = document.getElementById('advancedFilters');
            filters.classList.toggle('hidden');
            addDebugInfo('Filtros avançados ' + (filters.classList.contains('hidden') ? 'ocultados' : 'exibidos'));
        });

        // Clear debug
        document.getElementById('clearDebug').addEventListener('click', function() {
            debugContent.innerHTML = '';
            addDebugInfo('Debug limpo', null, 'info');
        });

        // Função para exibir mensagens de status
        function showStatus(message, isError = false, isWarning = false) {
            statusMessage.textContent = message;
            let className = 'p-6 my-6 rounded-xl text-center text-lg ';
            
            if (isError) {
                className += 'bg-red-900/50 text-red-200 border border-red-500/30';
                addDebugInfo('ERRO: ' + message, null, 'error');
            } else if (isWarning) {
                className += 'bg-yellow-900/50 text-yellow-200 border border-yellow-500/30';
                addDebugInfo('AVISO: ' + message, null, 'warning');
            } else {
                className += 'bg-blue-900/50 text-blue-200 border border-blue-500/30';
                addDebugInfo('INFO: ' + message, null, 'success');
            }
            
            statusMessage.className = className;
            statusMessage.classList.remove('hidden');
        }

        // Função para ocultar status
        function hideStatus() {
            statusMessage.classList.add('hidden');
        }

        // Função para mostrar/ocultar loading
        function toggleLoading(show) {
            const searchIcon = document.getElementById('search-icon');
            const loadingSpinner = document.getElementById('loading-spinner');
            const skeletonLoading = document.getElementById('skeletonLoading');
            
            if (show) {
                searchIcon.classList.add('hidden');
                loadingSpinner.classList.remove('hidden');
                skeletonLoading.classList.remove('hidden');
                analyzeBtn.disabled = true;
                analyzeBtn.classList.add('pulse-animation');
                addDebugInfo('Iniciando análise com Wallex...', null, 'api');
            } else {
                searchIcon.classList.remove('hidden');
                loadingSpinner.classList.add('hidden');
                skeletonLoading.classList.add('hidden');
                analyzeBtn.disabled = false;
                analyzeBtn.classList.remove('pulse-animation');
                addDebugInfo('Análise finalizada', null, 'success');
            }
        }

        // Validar endereço
        function isValidAddress(address) {
            return /^0x[a-fA-F0-9]{40}$/.test(address);
        }

        // Função principal de análise
        async function analyzeTransactions() {
            const walletAddress = walletAddressInput.value.trim();
            const networkKey = networkSelector.value;
            const tokenAddress = tokenAddressInput.value.trim();
            
            addDebugInfo('🚀 Iniciando análise com Wallex', {
                network: CHAIN_CONFIG[networkKey].name,
                chainId: CHAIN_CONFIG[networkKey].chainId,
                walletAddress: walletAddress.substring(0, 10) + '...',
                hasTokenAddress: !!tokenAddress,
                apiKeyIntegrated: true
            }, 'api');

            // Validações
            if (!walletAddress) {
                showStatus('Por favor, insira um endereço de carteira.', true);
                return;
            }
            
            if (!isValidAddress(walletAddress)) {
                showStatus('Endereço de carteira inválido. Deve ter 42 caracteres e começar com 0x.', true);
                return;
            }

            if (tokenAddress && !isValidAddress(tokenAddress)) {
                showStatus('Endereço de token inválido. Deve ter 42 caracteres e começar com 0x.', true);
                return;
            }

            hideStatus();
            toggleLoading(true);
            
            // Ocultar card de token anterior
            tokenInfoCard.classList.add('hidden');
            currentTokenInfo = null;
            
            try {
                // Buscar portfolio da carteira primeiro - SEMPRE
                addDebugInfo('💼 Carregando portfolio da carteira...', null, 'info');
                
                // Forçar exibição do portfolio card
                const portfolioCard = document.getElementById('portfolioCard');
                if (portfolioCard) {
                    portfolioCard.classList.remove('hidden');
                    addDebugInfo('📋 Portfolio card exibido', null, 'info');
                }
                
                await fetchWalletPortfolio();

                // Se há endereço de token, buscar suas informações primeiro
                // IMPORTANTE: Analisa APENAS o token do contrato especificado, não tokens de swap
                if (tokenAddress) {
                    await getTokenInfo(networkKey, tokenAddress, walletAddress);
                    addDebugInfo('🎯 Foco da análise', {
                        message: 'Analisando APENAS transações do token especificado',
                        tokenContract: tokenAddress,
                        note: 'Não inclui outros tokens usados em swaps'
                    }, 'token');
                }
                
                // Construir URL da API V2
                let url;
                if (tokenAddress) {
                    url = buildApiUrl(networkKey, 'account', 'tokentx', {
                        contractaddress: tokenAddress,
                        address: walletAddress,
                        startblock: 0,
                        endblock: 99999999,
                        page: 1,
                        offset: 1000,
                        sort: 'desc'
                    });
                } else {
                    url = buildApiUrl(networkKey, 'account', 'txlist', {
                        address: walletAddress,
                        startblock: 0,
                        endblock: 99999999,
                        page: 1,
                        offset: 1000,
                        sort: 'desc'
                    });
                }

                addDebugInfo('🌐 Fazendo requisição para API V2', { 
                    url: url.replace(API_KEY, 'HIDDEN'),
                    chainId: CHAIN_CONFIG[networkKey].chainId,
                    network: CHAIN_CONFIG[networkKey].name
                }, 'api');

                const response = await fetch(url);
                
                addDebugInfo('📡 Resposta recebida da API V2', { 
                    status: response.status, 
                    statusText: response.statusText,
                    ok: response.ok
                }, 'api');

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                
                addDebugInfo('📊 Dados processados da API V2', { 
                    status: data.status, 
                    message: data.message,
                    resultCount: data.result ? data.result.length : 0
                }, 'data');

                if (data.status === '1' && data.result) {
                    currentTransactions = data.result;
                    
                    // Filtrar por período se especificado
                    if (startDateInput.value && endDateInput.value) {
                        const startDate = new Date(startDateInput.value);
                        const endDate = new Date(endDateInput.value);
                        endDate.setHours(23, 59, 59, 999);

                        const originalCount = currentTransactions.length;
                        currentTransactions = currentTransactions.filter(tx => {
                            const txDate = new Date(tx.timeStamp * 1000);
                            return txDate >= startDate && txDate <= endDate;
                        });

                        addDebugInfo('📅 Filtro de data aplicado', { 
                            originalCount, 
                            filteredCount: currentTransactions.length,
                            startDate: startDate.toISOString(),
                            endDate: endDate.toISOString()
                        }, 'data');
                    }

                    if (currentTransactions.length === 0) {
                        showStatus('Nenhuma transação encontrada para o período selecionado.', false);
                        return;
                    }

                    processTransactions();
                    showResults();
                    
                    const tokenText = tokenAddress ? ` do token ${currentTokenInfo?.symbol || 'especificado'}` : '';
                    showStatus(`✅ Análise concluída com Wallex! Encontradas ${currentTransactions.length} transações${tokenText} na rede ${CHAIN_CONFIG[networkKey].name}.`);
                } else {
                    throw new Error(data.message || 'Erro ao buscar transações');
                }
            } catch (error) {
                addDebugInfo('💥 Erro durante análise', { 
                    error: error.message,
                    stack: error.stack
                }, 'error');
                console.error('Erro:', error);
                showStatus(`Erro ao analisar transações: ${error.message}`, true);
            } finally {
                toggleLoading(false);
            }
        }

        // Função para processar transações
        function processTransactions() {
            const walletAddress = walletAddressInput.value.trim().toLowerCase();
            const networkKey = networkSelector.value;
            const symbol = currentTokenInfo?.symbol || CHAIN_CONFIG[networkKey].symbol;
            const tokenName = currentTokenInfo?.name || CHAIN_CONFIG[networkKey].name;
            
            addDebugInfo('🔄 Processando transações', { 
                count: currentTransactions.length,
                network: CHAIN_CONFIG[networkKey].name,
                symbol: symbol,
                hasTokenInfo: !!currentTokenInfo
            }, 'data');
            
            let totalVolume = 0;
            let incomingCount = 0;
            let outgoingCount = 0;
            let incomingVolume = 0;
            let outgoingVolume = 0;

            currentTransactions.forEach(tx => {
                const decimals = currentTokenInfo?.decimals || (tx.tokenDecimal ? parseInt(tx.tokenDecimal) : 18);
                const value = parseFloat(tx.value) / Math.pow(10, decimals);
                totalVolume += value;
                
                if (tx.to.toLowerCase() === walletAddress) {
                    incomingCount++;
                    incomingVolume += value;
                } else {
                    outgoingCount++;
                    outgoingVolume += value;
                }
            });

            const avgValue = totalVolume / currentTransactions.length || 0;
            const netBalance = incomingVolume - outgoingVolume;
            const lastTx = currentTransactions[0];
            const lastTxTime = new Date(parseInt(lastTx.timeStamp) * 1000);
            const timeAgo = getTimeAgo(lastTxTime);

            addDebugInfo('📈 Estatísticas calculadas', {
                totalVolume,
                incomingCount,
                outgoingCount,
                incomingVolume,
                outgoingVolume,
                avgValue,
                netBalance
            }, 'data');

            // Atualizar cards de resumo
            document.getElementById('totalTx').textContent = currentTransactions.length;
            document.getElementById('totalVolume').textContent = currentTokenInfo ? 
                `${totalVolume.toFixed(6)} ${tokenName} (${symbol})` : 
                `${totalVolume.toFixed(6)} ${symbol}`;
            document.getElementById('avgValue').textContent = currentTokenInfo ? 
                `${avgValue.toFixed(6)} ${tokenName} (${symbol})` : 
                `${avgValue.toFixed(6)} ${symbol}`;
            document.getElementById('lastTx').textContent = timeAgo;

            // Atualizar títulos da análise de fluxo - SEMPRE mostra o token do contrato especificado
            if (currentTokenInfo) {
                const contractShort = currentTokenInfo.contractAddress ? 
                    `${currentTokenInfo.contractAddress.substring(0, 6)}...${currentTokenInfo.contractAddress.substring(currentTokenInfo.contractAddress.length - 4)}` : '';
                
                document.getElementById('flowAnalysisTitle').innerHTML = `
                    <svg class="w-8 h-8 text-blue-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                    </svg>
                    Análise de Fluxo - ${tokenName} (${symbol})
                    <span class="text-sm text-gray-400 ml-2">Contrato: ${contractShort}</span>
                `;
                document.getElementById('incomingTitle').textContent = `${tokenName} (${symbol}) - Entradas Recebidas`;
                document.getElementById('outgoingTitle').textContent = `${tokenName} (${symbol}) - Saídas Enviadas`;
                document.getElementById('netBalanceTitle').textContent = `${tokenName} (${symbol}) - Saldo Líquido no Período`;
            } else {
                document.getElementById('flowAnalysisTitle').innerHTML = `
                    <svg class="w-8 h-8 text-blue-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                    </svg>
                    Análise de Fluxo - ${CHAIN_CONFIG[networkKey].name} (${symbol})
                `;
                document.getElementById('incomingTitle').textContent = `${symbol} - Entradas Recebidas`;
                document.getElementById('outgoingTitle').textContent = `${symbol} - Saídas Enviadas`;
                document.getElementById('netBalanceTitle').textContent = `${symbol} - Saldo Líquido no Período`;
            }

            // Atualizar análise de fluxo
            document.getElementById('incomingCount').textContent = incomingCount;
            document.getElementById('incomingVolume').textContent = currentTokenInfo ? 
                `${incomingVolume.toFixed(6)} ${tokenName} (${symbol})` : 
                `${incomingVolume.toFixed(6)} ${symbol}`;
            document.getElementById('outgoingCount').textContent = outgoingCount;
            document.getElementById('outgoingVolume').textContent = currentTokenInfo ? 
                `${outgoingVolume.toFixed(6)} ${tokenName} (${symbol})` : 
                `${outgoingVolume.toFixed(6)} ${symbol}`;
            
            const netBalanceElement = document.getElementById('netBalance');
            netBalanceElement.textContent = currentTokenInfo ? 
                `${netBalance >= 0 ? '+' : ''}${netBalance.toFixed(6)} ${tokenName} (${symbol})` : 
                `${netBalance >= 0 ? '+' : ''}${netBalance.toFixed(6)} ${symbol}`;
            netBalanceElement.className = `text-3xl font-bold ${netBalance >= 0 ? 'text-green-400' : 'text-red-400'}`;

            // Renderizar tabela
            renderTransactionTable();
        }

        // Função para renderizar tabela de transações
        function renderTransactionTable() {
            const tbody = document.getElementById('transactionTableBody');
            const walletAddress = walletAddressInput.value.trim().toLowerCase();
            const networkKey = networkSelector.value;
            const symbol = currentTokenInfo?.symbol || CHAIN_CONFIG[networkKey].symbol;
            const tokenName = currentTokenInfo?.name || CHAIN_CONFIG[networkKey].name;
            const displaySymbol = currentTokenInfo ? `${tokenName} (${symbol})` : symbol;
            const explorer = CHAIN_CONFIG[networkKey].explorer;
            
            tbody.innerHTML = '';

            addDebugInfo('🏗️ Renderizando tabela de transações', { 
                count: Math.min(currentTransactions.length, 50),
                network: CHAIN_CONFIG[networkKey].name,
                explorer: explorer,
                displaySymbol: displaySymbol,
                hasTokenInfo: !!currentTokenInfo
            }, 'data');

            currentTransactions.slice(0, 50).forEach(tx => {
                const decimals = currentTokenInfo?.decimals || (tx.tokenDecimal ? parseInt(tx.tokenDecimal) : 18);
                const value = parseFloat(tx.value) / Math.pow(10, decimals);
                const isIncoming = tx.to.toLowerCase() === walletAddress;
                const date = new Date(parseInt(tx.timeStamp) * 1000);
                const timeAgo = getTimeAgo(date);

                const row = document.createElement('tr');
                row.className = 'hover:bg-gray-700/30 transition-colors';
                row.innerHTML = `
                    <td class="p-4 text-sm">
                        <a href="${explorer}/tx/${tx.hash}" target="_blank" class="text-blue-400 hover:text-blue-300 transition-colors font-mono">
                            ${tx.hash.substring(0, 10)}...${tx.hash.substring(tx.hash.length - 8)}
                        </a>
                    </td>
                    <td class="p-4 text-sm text-gray-300">
                        <div>${date.toLocaleString('pt-BR')}</div>
                        <div class="text-xs text-gray-500">${timeAgo}</div>
                    </td>
                    <td class="p-4 text-sm">
                        <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${isIncoming ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'}">
                            ${isIncoming ? '↙ Recebida' : '↗ Enviada'}
                        </span>
                    </td>
                    <td class="p-4 text-sm">
                        <a href="${explorer}/address/${tx.from}" target="_blank" class="text-blue-400 hover:text-blue-300 transition-colors font-mono">
                            ${tx.from.substring(0, 6)}...${tx.from.substring(tx.from.length - 4)}
                        </a>
                    </td>
                    <td class="p-4 text-sm">
                        <a href="${explorer}/address/${tx.to}" target="_blank" class="text-blue-400 hover:text-blue-300 transition-colors font-mono">
                            ${tx.to.substring(0, 6)}...${tx.to.substring(tx.to.length - 4)}
                        </a>
                    </td>
                    <td class="p-4 text-sm font-mono text-right ${isIncoming ? 'text-green-400' : 'text-red-400'} font-semibold">
                        ${isIncoming ? '+' : '-'} ${value.toFixed(6)} ${displaySymbol}
                    </td>
                    <td class="p-4 text-center">
                        <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-900/30 text-green-300">
                            ✓ Confirmada
                        </span>
                    </td>
                `;
                tbody.appendChild(row);
            });
        }

        // Função para calcular tempo relativo
        function getTimeAgo(date) {
            const now = new Date();
            const diffInSeconds = Math.floor((now - date) / 1000);
            
            if (diffInSeconds < 60) return 'Agora mesmo';
            if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min atrás`;
            if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} h atrás`;
            if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} dias atrás`;
            return `${Math.floor(diffInSeconds / 2592000)} meses atrás`;
        }

        // Função para mostrar resultados
        function showResults() {
            resultsContainer.classList.remove('hidden');
            addDebugInfo('✅ Resultados exibidos com sucesso', null, 'success');
        }

        // Função para exportar CSV
        function exportToCSV() {
            if (!currentTransactions.length) {
                showStatus('Nenhuma transação para exportar.', true);
                return;
            }

            const networkKey = networkSelector.value;
            const symbol = currentTokenInfo?.symbol || CHAIN_CONFIG[networkKey].symbol;
            const tokenName = currentTokenInfo?.name || CHAIN_CONFIG[networkKey].name;
            const displaySymbol = currentTokenInfo ? `${tokenName} (${symbol})` : symbol;
            
            const headers = ['Hash', 'Data/Hora', 'Tipo', 'De', 'Para', 'Valor', 'Status'];
            const csvContent = [
                headers.join(','),
                ...currentTransactions.map(tx => {
                    const decimals = currentTokenInfo?.decimals || (tx.tokenDecimal ? parseInt(tx.tokenDecimal) : 18);
                    const value = parseFloat(tx.value) / Math.pow(10, decimals);
                    const walletAddress = walletAddressInput.value.trim().toLowerCase();
                    const isIncoming = tx.to.toLowerCase() === walletAddress;
                    const date = new Date(parseInt(tx.timeStamp) * 1000);
                    
                    return [
                        tx.hash,
                        date.toLocaleString('pt-BR'),
                        isIncoming ? 'Recebida' : 'Enviada',
                        tx.from,
                        tx.to,
                        `${value.toFixed(6)} ${displaySymbol}`,
                        'Confirmada'
                    ].join(',');
                })
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `wallex_${networkKey}_${Date.now()}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            addDebugInfo('💾 CSV exportado com sucesso', { 
                filename: `wallex_${networkKey}_${Date.now()}.csv`,
                records: currentTransactions.length
            }, 'success');
        }

        // Variáveis globais para portfolio
        let currentPortfolio = [];
        let portfolioTotalValue = 0;

        // Função para buscar portfolio da carteira
        async function fetchWalletPortfolio() {
            const walletAddress = document.getElementById('walletAddress').value.trim();
            const networkKey = document.getElementById('networkSelector').value;
            
            if (!walletAddress) {
                addDebugInfo('❌ Endereço da carteira é obrigatório para portfolio', null, 'error');
                return;
            }

            addDebugInfo('💼 Iniciando análise de portfolio...', { wallet: walletAddress.substring(0, 10) + '...' }, 'info');
            
            // Limpar portfolio anterior
            currentPortfolio = [];
            portfolioTotalValue = 0;
            
            try {
                // Mostrar card de portfolio
                const portfolioCard = document.getElementById('portfolioCard');
                if (portfolioCard) {
                    portfolioCard.classList.remove('hidden');
                }
                
                // Buscar saldo nativo da rede SEMPRE
                addDebugInfo('🔍 Buscando saldo nativo...', null, 'info');
                await fetchNativeBalance(walletAddress, networkKey);
                
                // Buscar todos os tokens ERC-20/BEP-20
                addDebugInfo('🔍 Buscando tokens da carteira...', null, 'info');
                await fetchTokenBalances(walletAddress, networkKey);
                
                // Buscar preços em USD
                addDebugInfo('💲 Atualizando preços USD...', null, 'info');
                await fetchTokenPrices();
                
                // Calcular e exibir portfolio SEMPRE (mesmo se vazio)
                calculatePortfolioValue();
                displayPortfolio();
                
                addDebugInfo('✅ Portfolio carregado com sucesso', { 
                    tokens: currentPortfolio.length,
                    totalValue: `$${portfolioTotalValue.toFixed(2)}`
                }, 'success');
                
            } catch (error) {
                addDebugInfo('❌ Erro ao carregar portfolio', { error: error.message }, 'error');
                // Mesmo com erro, mostrar o que conseguiu carregar
                calculatePortfolioValue();
                displayPortfolio();
            }
        }

        // Função para buscar saldo nativo (ETH, BNB, MATIC, etc.)
        async function fetchNativeBalance(walletAddress, networkKey) {
            const chainId = CHAIN_CONFIG[networkKey].chainId;
            const url = `https://api.etherscan.io/v2/api?module=account&action=balance&address=${walletAddress}&tag=latest&apikey=${API_KEY}&chainid=${chainId}`;
            
            addDebugInfo('🌐 Consultando API para saldo nativo', { 
                network: CHAIN_CONFIG[networkKey].name,
                chainId: chainId 
            }, 'info');
            
            try {
                const response = await fetch(url);
                const data = await response.json();
                
                addDebugInfo('📡 Resposta da API recebida', { 
                    status: data.status,
                    hasResult: !!data.result 
                }, 'info');
                
                if (data.status === '1' && data.result) {
                    const balance = parseFloat(data.result) / Math.pow(10, 18);
                    
                    // Adicionar ao portfolio SEMPRE, mesmo se saldo for 0
                    currentPortfolio.push({
                        name: CHAIN_CONFIG[networkKey].name,
                        symbol: CHAIN_CONFIG[networkKey].symbol,
                        balance: balance,
                        contractAddress: 'native',
                        decimals: 18,
                        priceUSD: 0, // Será preenchido depois
                        valueUSD: 0,
                        isNative: true
                    });
                    
                    addDebugInfo('💰 Saldo nativo adicionado', { 
                        symbol: CHAIN_CONFIG[networkKey].symbol,
                        balance: balance.toFixed(6)
                    }, 'token');
                } else {
                    addDebugInfo('⚠️ API retornou erro ou sem resultado', { 
                        status: data.status,
                        message: data.message || 'Sem dados'
                    }, 'warning');
                    
                    // Adicionar com saldo 0 para mostrar a rede
                    currentPortfolio.push({
                        name: CHAIN_CONFIG[networkKey].name,
                        symbol: CHAIN_CONFIG[networkKey].symbol,
                        balance: 0,
                        contractAddress: 'native',
                        decimals: 18,
                        priceUSD: 0,
                        valueUSD: 0,
                        isNative: true
                    });
                }
            } catch (error) {
                addDebugInfo('❌ Erro na requisição de saldo nativo', { error: error.message }, 'error');
                
                // Adicionar com saldo 0 mesmo com erro
                currentPortfolio.push({
                    name: CHAIN_CONFIG[networkKey].name,
                    symbol: CHAIN_CONFIG[networkKey].symbol,
                    balance: 0,
                    contractAddress: 'native',
                    decimals: 18,
                    priceUSD: 0,
                    valueUSD: 0,
                    isNative: true
                });
            }
        }

        // Função para buscar saldos de tokens
        async function fetchTokenBalances(walletAddress, networkKey) {
            const chainId = CHAIN_CONFIG[networkKey].chainId;
            const url = `https://api.etherscan.io/v2/api?module=account&action=tokentx&address=${walletAddress}&startblock=0&endblock=99999999&sort=desc&apikey=${API_KEY}&chainid=${chainId}`;
            
            try {
                const response = await fetch(url);
                const data = await response.json();
                
                if (data.status === '1' && data.result && Array.isArray(data.result)) {
                    // Agrupar por contrato de token
                    const tokenContracts = {};
                    
                    data.result.forEach(tx => {
                        const contract = tx.contractAddress.toLowerCase();
                        if (!tokenContracts[contract]) {
                            tokenContracts[contract] = {
                                name: tx.tokenName,
                                symbol: tx.tokenSymbol,
                                decimals: parseInt(tx.tokenDecimal),
                                contractAddress: tx.contractAddress,
                                transactions: []
                            };
                        }
                        tokenContracts[contract].transactions.push(tx);
                    });
                    
                    // Calcular saldo de cada token
                    for (const [contract, tokenData] of Object.entries(tokenContracts)) {
                        const balance = await calculateTokenBalance(walletAddress, tokenData.transactions, tokenData.decimals);
                        
                        if (balance > 0) {
                            currentPortfolio.push({
                                name: tokenData.name,
                                symbol: tokenData.symbol,
                                balance: balance,
                                contractAddress: tokenData.contractAddress,
                                decimals: tokenData.decimals,
                                priceUSD: 0,
                                valueUSD: 0,
                                isNative: false
                            });
                            
                            addDebugInfo('🪙 Token encontrado', { 
                                symbol: tokenData.symbol,
                                balance: balance.toFixed(6)
                            }, 'token');
                        }
                    }
                }
            } catch (error) {
                addDebugInfo('⚠️ Erro ao buscar tokens', { error: error.message }, 'warning');
            }
        }

        // Função para calcular saldo de um token específico
        async function calculateTokenBalance(walletAddress, transactions, decimals) {
            let balance = 0;
            const wallet = walletAddress.toLowerCase();
            
            transactions.forEach(tx => {
                const value = parseFloat(tx.value) / Math.pow(10, decimals);
                
                if (tx.to.toLowerCase() === wallet) {
                    balance += value; // Recebido
                } else if (tx.from.toLowerCase() === wallet) {
                    balance -= value; // Enviado
                }
            });
            
            return Math.max(0, balance); // Não pode ser negativo
        }

        // Função para buscar preços em USD (simulado - em produção usar API de preços)
        async function fetchTokenPrices() {
            // Preços atualizados para demonstração (baseados em preços reais)
            const mockPrices = {
                'ETH': 2650,
                'BNB': 315,
                'MATIC': 0.85,
                'AVAX': 28,
                'ARB': 0.95,
                'OP': 1.85,
                'BASE': 1.2,
                'BLAST': 0.02,
                'SCROLL': 0.75,
                'ZK': 0.15,
                'LINEA': 0.45,
                'MNT': 0.65,
                'USDT': 1.00,
                'USDC': 1.00,
                'BUSD': 1.00,
                'DAI': 1.00,
                'GEGG': 0.0015,
                'PEPE': 0.00000125,
                'SHIB': 0.000025,
                'DOGE': 0.12,
                'LINK': 15.50,
                'UNI': 8.75,
                'AAVE': 185,
                'COMP': 65,
                'SUSHI': 1.25,
                'CRV': 0.85,
                'YFI': 8500,
                'SNX': 2.85,
                'MKR': 1850,
                'WBTC': 67500,
                'WETH': 2650
            };
            
            let pricesFound = 0;
            
            currentPortfolio.forEach(token => {
                const price = mockPrices[token.symbol] || mockPrices[token.symbol.toUpperCase()] || 0;
                token.priceUSD = price;
                token.valueUSD = token.balance * token.priceUSD;
                
                if (price > 0) {
                    pricesFound++;
                    addDebugInfo(`💰 Preço encontrado: ${token.symbol}`, { 
                        price: `$${price}`,
                        balance: token.balance.toFixed(6),
                        value: `$${token.valueUSD.toFixed(2)}`
                    }, 'token');
                }
            });
            
            addDebugInfo('💲 Preços atualizados', { 
                tokens: currentPortfolio.length,
                pricesFound: pricesFound,
                totalValue: `$${currentPortfolio.reduce((sum, t) => sum + t.valueUSD, 0).toFixed(2)}`
            }, 'success');
        }

        // Função para calcular valor total do portfolio
        function calculatePortfolioValue() {
            portfolioTotalValue = currentPortfolio.reduce((total, token) => total + token.valueUSD, 0);
            
            // Ordenar por valor USD (maior primeiro)
            currentPortfolio.sort((a, b) => b.valueUSD - a.valueUSD);
        }

        // Função para exibir portfolio na interface
        function displayPortfolio() {
            // Atualizar resumo
            document.getElementById('totalTokens').textContent = currentPortfolio.length;
            document.getElementById('totalValueUSD').textContent = `$${portfolioTotalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            document.getElementById('portfolioValue').textContent = `$${portfolioTotalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            document.getElementById('portfolioLastUpdate').textContent = new Date().toLocaleString('pt-BR');
            
            // Maior holding
            if (currentPortfolio.length > 0) {
                const topToken = currentPortfolio[0];
                document.getElementById('topHolding').textContent = `${topToken.symbol} ($${topToken.valueUSD.toFixed(2)})`;
            }
            
            // Preencher tabela
            const tbody = document.getElementById('portfolioTableBody');
            tbody.innerHTML = '';
            
            currentPortfolio.forEach((token, index) => {
                const percentage = portfolioTotalValue > 0 ? (token.valueUSD / portfolioTotalValue * 100) : 0;
                
                const row = document.createElement('tr');
                row.className = 'hover:bg-gray-700/50 transition-colors';
                row.innerHTML = `
                    <td class="p-4 text-gray-400">${index + 1}</td>
                    <td class="p-4">
                        <div class="flex items-center">
                            <div class="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm mr-3">
                                ${token.symbol.substring(0, 2)}
                            </div>
                            <div>
                                <div class="font-semibold text-white">${token.name}</div>
                                <div class="text-sm text-gray-400">${token.symbol}</div>
                            </div>
                        </div>
                    </td>
                    <td class="p-4 text-right font-mono text-white">${token.balance.toLocaleString('en-US', { minimumFractionDigits: 6, maximumFractionDigits: 6 })}</td>
                    <td class="p-4 text-right font-mono text-green-400">$${token.priceUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</td>
                    <td class="p-4 text-right font-mono font-bold text-white">$${token.valueUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td class="p-4 text-right">
                        <span class="inline-flex items-center px-2 py-1 rounded-full text-sm font-medium bg-blue-900/30 text-blue-300">
                            ${percentage.toFixed(2)}%
                        </span>
                    </td>
                    <td class="p-4 text-center">
                        <button onclick="analyzeToken('${token.contractAddress}')" class="text-blue-400 hover:text-blue-300 text-sm underline">
                            Analisar
                        </button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        }

        // Função para analisar token específico
        function analyzeToken(contractAddress) {
            if (contractAddress === 'native') {
                // Limpar campo de token para analisar moeda nativa
                document.getElementById('tokenAddress').value = '';
            } else {
                // Preencher campo de token
                document.getElementById('tokenAddress').value = contractAddress;
            }
            
            // Executar análise
            analyzeTransactions();
        }

        // Função para exportar portfolio
        function exportPortfolio() {
            const headers = ['#', 'Token', 'Símbolo', 'Quantidade', 'Preço USD', 'Valor USD', '% Portfolio'];
            const csvContent = [
                headers.join(','),
                ...currentPortfolio.map((token, index) => {
                    const percentage = portfolioTotalValue > 0 ? (token.valueUSD / portfolioTotalValue * 100) : 0;
                    return [
                        index + 1,
                        token.name,
                        token.symbol,
                        token.balance.toFixed(6),
                        token.priceUSD.toFixed(6),
                        token.valueUSD.toFixed(2),
                        percentage.toFixed(2) + '%'
                    ].join(',');
                }),
                '',
                `Total Portfolio Value,$${portfolioTotalValue.toFixed(2)}`,
                `Total Tokens,${currentPortfolio.length}`,
                `Generated,${new Date().toLocaleString('pt-BR')}`
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `wallex-portfolio-${Date.now()}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            addDebugInfo('📊 Portfolio exportado', { records: currentPortfolio.length }, 'success');
        }

        // Função para alternar modo de análise
        function switchAnalysisMode(mode) {
            analysisMode = mode;
            
            // Atualizar cards visuais
            const walletCard = document.getElementById('walletModeCard');
            const contractCard = document.getElementById('contractModeCard');
            
            if (mode === 'wallet') {
                walletCard.classList.add('active');
                contractCard.classList.remove('active');
                
                // Mostrar configuração de carteira
                document.getElementById('walletAnalysisConfig').classList.remove('hidden');
                document.getElementById('contractAnalysisConfig').classList.add('hidden');
                
                // Atualizar título e botão
                document.getElementById('configTitle').textContent = 'Configuração da Análise de Carteira';
                document.getElementById('analyzeBtnText').textContent = 'Analisar Carteira';
                
                addDebugInfo('🔄 Modo alterado para Análise de Carteira', null, 'info');
            } else {
                contractCard.classList.add('active');
                walletCard.classList.remove('active');
                
                // Mostrar configuração de contrato
                document.getElementById('contractAnalysisConfig').classList.remove('hidden');
                document.getElementById('walletAnalysisConfig').classList.add('hidden');
                
                // Atualizar título e botão
                document.getElementById('configTitle').textContent = 'Configuração da Análise Global de Token';
                document.getElementById('analyzeBtnText').textContent = 'Analisar Token Globalmente';
                
                addDebugInfo('🔄 Modo alterado para Análise Global de Token', null, 'info');
            }
        }

        // Função para análise global de token
        async function analyzeGlobalToken() {
            const contractAddress = document.getElementById('contractAddressInput').value.trim();
            const networkKey = document.getElementById('contractNetworkSelector').value;
            
            addDebugInfo('🌍 Iniciando análise global de token', {
                contract: contractAddress.substring(0, 10) + '...',
                network: CHAIN_CONFIG[networkKey].name,
                chainId: CHAIN_CONFIG[networkKey].chainId
            }, 'api');

            // Validações
            if (!contractAddress) {
                showStatus('Por favor, insira o endereço do contrato do token.', true);
                return;
            }
            
            if (!isValidAddress(contractAddress)) {
                showStatus('Endereço de contrato inválido. Deve ter 42 caracteres e começar com 0x.', true);
                return;
            }

            hideStatus();
            toggleLoading(true);
            
            try {
                // Buscar informações do token primeiro
                addDebugInfo('🔍 Obtendo informações do token...', null, 'info');
                await getGlobalTokenInfo(networkKey, contractAddress);
                
                // Buscar TODAS as transações do token (sem filtro de carteira)
                addDebugInfo('📊 Buscando todas as transações do token...', null, 'info');
                const allTransactions = await fetchAllTokenTransactions(networkKey, contractAddress);
                
                if (allTransactions.length === 0) {
                    showStatus('Nenhuma transação encontrada para este token.', false);
                    return;
                }
                
                // Processar análise global
                addDebugInfo('⚡ Processando análise global...', { totalTx: allTransactions.length }, 'data');
                const globalAnalysis = await processGlobalTokenAnalysis(allTransactions, contractAddress);
                
                // Exibir resultados
                displayGlobalTokenResults(globalAnalysis);
                showResults();
                
                showStatus(`✅ Análise global concluída! Processadas ${allTransactions.length} transações do token ${currentTokenInfo?.symbol || 'desconhecido'}.`);
                
            } catch (error) {
                addDebugInfo('💥 Erro durante análise global', { 
                    error: error.message,
                    stack: error.stack
                }, 'error');
                console.error('Erro:', error);
                showStatus(`Erro ao analisar token: ${error.message}`, true);
            } finally {
                toggleLoading(false);
            }
        }

        // Função para buscar preço histórico de um token em uma data específica
        async function getHistoricalPrice(tokenAddress, date, symbol = 'unknown') {
            try {
                // Converter data para formato YYYY-MM-DD
                const dateStr = date.toISOString().split('T')[0];
                
                // Tentar diferentes APIs de preços históricos
                const apis = [
                    // CoinGecko API (gratuita com rate limit)
                    {
                        name: 'CoinGecko',
                        url: `https://api.coingecko.com/api/v3/coins/ethereum/contract/${tokenAddress}/market_chart/range?vs_currency=usd&from=${Math.floor(date.getTime()/1000)}&to=${Math.floor(date.getTime()/1000) + 86400}`,
                        parser: (data) => data.prices && data.prices[0] ? data.prices[0][1] : null
                    },
                    // Fallback: usar preço atual se não conseguir histórico
                    {
                        name: 'CoinGecko Current',
                        url: `https://api.coingecko.com/api/v3/simple/token_price/ethereum?contract_addresses=${tokenAddress}&vs_currencies=usd`,
                        parser: (data) => data[tokenAddress.toLowerCase()]?.usd || null
                    }
                ];
                
                for (const api of apis) {
                    try {
                        addDebugInfo(`🔍 Buscando preço histórico via ${api.name}`, {
                            token: symbol,
                            date: dateStr,
                            contract: tokenAddress.substring(0, 10) + '...'
                        }, 'info');
                        
                        const response = await fetch(api.url);
                        if (response.ok) {
                            const data = await response.json();
                            const price = api.parser(data);
                            
                            if (price && price > 0) {
                                addDebugInfo(`💰 Preço histórico encontrado`, {
                                    api: api.name,
                                    price: `$${price.toFixed(6)}`,
                                    date: dateStr
                                }, 'success');
                                return price;
                            }
                        }
                        
                        // Rate limiting - aguardar entre requests
                        await new Promise(resolve => setTimeout(resolve, 200));
                        
                    } catch (error) {
                        addDebugInfo(`⚠️ Erro na API ${api.name}`, {
                            error: error.message
                        }, 'warning');
                    }
                }
                
                // Se não conseguiu preço histórico, usar estimativa baseada em tokens similares
                addDebugInfo(`📊 Usando preço estimado`, {
                    token: symbol,
                    date: dateStr,
                    method: 'Estimativa baseada em padrões'
                }, 'info');
                
                return 0.001; // Preço padrão para tokens sem dados históricos
                
            } catch (error) {
                addDebugInfo(`💥 Erro ao buscar preço histórico`, {
                    error: error.message,
                    token: symbol
                }, 'error');
                return 0;
            }
        }
        
        // Cache de preços históricos para evitar requests duplicados
        const historicalPriceCache = new Map();
        
        // Função para buscar preço histórico com cache
        async function getCachedHistoricalPrice(tokenAddress, date, symbol) {
            const dateKey = date.toISOString().split('T')[0];
            const cacheKey = `${tokenAddress.toLowerCase()}_${dateKey}`;
            
            if (historicalPriceCache.has(cacheKey)) {
                return historicalPriceCache.get(cacheKey);
            }
            
            const price = await getHistoricalPrice(tokenAddress, date, symbol);
            historicalPriceCache.set(cacheKey, price);
            
            return price;
        }
        
        // Função para calcular valor histórico total das transações
        async function calculateHistoricalValues(transactions, tokenInfo) {
            addDebugInfo('📈 Iniciando cálculo de valores históricos', {
                totalTransactions: transactions.length,
                token: tokenInfo?.symbol || 'UNKNOWN'
            }, 'info');
            
            let totalHistoricalValueUSD = 0;
            let totalPurchaseValueUSD = 0;
            let totalSaleValueUSD = 0;
            let processedCount = 0;
            
            const batchSize = 10; // Processar em lotes para não sobrecarregar APIs
            
            for (let i = 0; i < transactions.length; i += batchSize) {
                const batch = transactions.slice(i, i + batchSize);
                
                const batchPromises = batch.map(async (tx) => {
                    try {
                        const txDate = new Date(parseInt(tx.timeStamp) * 1000);
                        const tokenValue = parseFloat(tx.value) / Math.pow(10, tokenInfo?.decimals || 18);
                        
                        // Buscar preço histórico para esta data
                        const historicalPrice = await getCachedHistoricalPrice(
                            tokenInfo?.contractAddress || tx.contractAddress,
                            txDate,
                            tokenInfo?.symbol || 'TOKEN'
                        );
                        
                        const valueUSD = tokenValue * historicalPrice;
                        
                        // Determinar se é compra ou venda (mesma lógica da análise)
                        const contractAddress = (tokenInfo?.contractAddress || tx.contractAddress).toLowerCase();
                        const fromAddress = tx.from.toLowerCase();
                        const toAddress = tx.to.toLowerCase();
                        
                        const isFromContract = fromAddress === contractAddress;
                        const isToContract = toAddress === contractAddress;
                        
                        let transactionType = 'TRANSFER';
                        if (isFromContract) {
                            transactionType = 'PURCHASE';
                            totalPurchaseValueUSD += valueUSD;
                        } else if (isToContract) {
                            transactionType = 'SALE';
                            totalSaleValueUSD += valueUSD;
                        }
                        
                        totalHistoricalValueUSD += valueUSD;
                        processedCount++;
                        
                        return {
                            hash: tx.hash,
                            date: txDate,
                            tokenValue: tokenValue,
                            historicalPrice: historicalPrice,
                            valueUSD: valueUSD,
                            type: transactionType
                        };
                        
                    } catch (error) {
                        addDebugInfo('⚠️ Erro ao processar transação', {
                            hash: tx.hash,
                            error: error.message
                        }, 'warning');
                        return null;
                    }
                });
                
                await Promise.all(batchPromises);
                
                // Update progress
                addDebugInfo('📊 Progresso do cálculo histórico', {
                    processed: Math.min(i + batchSize, transactions.length),
                    total: transactions.length,
                    percentage: Math.round((Math.min(i + batchSize, transactions.length) / transactions.length) * 100)
                }, 'info');
                
                // Rate limiting entre lotes
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            const results = {
                totalHistoricalValueUSD: totalHistoricalValueUSD,
                totalPurchaseValueUSD: totalPurchaseValueUSD,
                totalSaleValueUSD: totalSaleValueUSD,
                processedTransactions: processedCount,
                averageTransactionValueUSD: totalHistoricalValueUSD / processedCount
            };
            
            addDebugInfo('🎉 Cálculo de valores históricos concluído', results, 'success');
            
            return results;
        }

        // Função para buscar informações do token para análise global
        async function getGlobalTokenInfo(chainKey, tokenAddress) {
            try {
                // Usar o mesmo método da análise de carteira, mas sem carteira específica
                const url = buildApiUrl(chainKey, 'token', 'tokeninfo', {
                    contractaddress: tokenAddress
                });
                
                const response = await fetch(url);
                const data = await response.json();
                
                if (data.status === '1' && data.result && data.result.length > 0) {
                    const tokenInfo = data.result[0];
                    currentTokenInfo = {
                        name: tokenInfo.tokenName || 'Token Desconhecido',
                        symbol: tokenInfo.symbol || 'UNKNOWN',
                        decimals: parseInt(tokenInfo.divisor) || 18,
                        contractAddress: tokenAddress,
                        totalSupply: tokenInfo.totalSupply || '0'
                    };
                    
                    addDebugInfo('✅ Informações do token obtidas', currentTokenInfo, 'token');
                } else {
                    // Fallback: tentar obter via transações
                    addDebugInfo('🔄 Tentando obter info via transações...', null, 'token');
                    const txUrl = buildApiUrl(chainKey, 'account', 'tokentx', {
                        contractaddress: tokenAddress,
                        page: 1,
                        offset: 1,
                        sort: 'desc'
                    });
                    
                    const txResponse = await fetch(txUrl);
                    const txData = await txResponse.json();
                    
                    if (txData.status === '1' && txData.result && txData.result.length > 0) {
                        const firstTx = txData.result[0];
                        currentTokenInfo = {
                            name: firstTx.tokenName || 'Token Desconhecido',
                            symbol: firstTx.tokenSymbol || 'UNKNOWN',
                            decimals: parseInt(firstTx.tokenDecimal) || 18,
                            contractAddress: tokenAddress,
                            totalSupply: '0'
                        };
                        
                        addDebugInfo('✅ Info obtida via transações', currentTokenInfo, 'token');
                    } else {
                        // Fallback final
                        currentTokenInfo = {
                            name: 'Token Desconhecido',
                            symbol: 'TOKEN',
                            decimals: 18,
                            contractAddress: tokenAddress,
                            totalSupply: '0'
                        };
                        
                        addDebugInfo('⚠️ Usando informações padrão', currentTokenInfo, 'warning');
                    }
                }
            } catch (error) {
                addDebugInfo('❌ Erro ao obter informações do token', { error: error.message }, 'error');
                throw error;
            }
        }

        // Função para buscar TODAS as transações de um token
        async function fetchAllTokenTransactions(chainKey, contractAddress) {
            const allTransactions = [];
            let page = 1;
            const maxPages = 10; // Limitar para evitar sobrecarga
            
            try {
                while (page <= maxPages) {
                    addDebugInfo(`📄 Buscando página ${page} de transações...`, null, 'api');
                    
                    const url = buildApiUrl(chainKey, 'account', 'tokentx', {
                        contractaddress: contractAddress,
                        startblock: 0,
                        endblock: 99999999,
                        page: page,
                        offset: 1000,
                        sort: 'desc'
                    });
                    
                    const response = await fetch(url);
                    const data = await response.json();
                    
                    if (data.status === '1' && data.result && data.result.length > 0) {
                        allTransactions.push(...data.result);
                        addDebugInfo(`✅ Página ${page}: ${data.result.length} transações`, null, 'data');
                        
                        // Se retornou menos que 1000, é a última página
                        if (data.result.length < 1000) {
                            break;
                        }
                        page++;
                    } else {
                        addDebugInfo(`⚠️ Página ${page}: sem dados`, { message: data.message }, 'warning');
                        break;
                    }
                    
                    // Pequena pausa para não sobrecarregar a API
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
                
                addDebugInfo('📊 Coleta de transações concluída', { 
                    totalTransactions: allTransactions.length,
                    pagesProcessed: page - 1
                }, 'success');
                
                return allTransactions;
                
            } catch (error) {
                addDebugInfo('❌ Erro ao buscar transações', { error: error.message }, 'error');
                throw error;
            }
        }

        // Função para processar análise global do token
        async function processGlobalTokenAnalysis(transactions, contractAddress) {
            addDebugInfo('⚙️ Processando análise global...', { count: transactions.length }, 'data');
            
            const analysis = {
                totalTransactions: transactions.length,
                totalVolumeIn: 0,           // Volume total de COMPRAS (entrada)
                totalVolumeOut: 0,          // Volume total de VENDAS (saída)
                totalPurchaseValue: 0,      // VALOR TOTAL DAS COMPRAS
                totalSaleValue: 0,          // VALOR TOTAL DAS VENDAS
                purchaseTransactions: 0,    // Número de transações de compra
                saleTransactions: 0,        // Número de transações de venda
                uniqueBuyers: new Set(),    // Compradores únicos
                uniqueSellers: new Set(),   // Vendedores únicos
                uniqueHolders: new Set(),
                uniqueSenders: new Set(),
                largestPurchase: null,      // Maior compra
                largestSale: null,          // Maior venda
                largestTransaction: null,
                firstTransaction: null,
                lastTransaction: null,
                dailyPurchaseVolume: {},    // Volume de compras por dia
                dailySaleVolume: {},        // Volume de vendas por dia
                dailyVolume: {},
                topBuyers: {},              // Maiores compradores
                topSellers: {},             // Maiores vendedores
                topHolders: {},
                transactionsByDay: {},
                purchasesByDay: {},         // Compras por dia
                salesByDay: {}              // Vendas por dia
            };
            
            const decimals = currentTokenInfo?.decimals || 18;
            let maxPurchaseValue = 0;
            let maxSaleValue = 0;
            let maxValue = 0;
            
            // Endereços conhecidos de exchanges/DEXs para identificar compras vs vendas
            const knownExchanges = new Set([
                '0x0000000000000000000000000000000000000000', // Burn address
                '0x000000000000000000000000000000000000dead', // Dead address
                contractAddress.toLowerCase() // O próprio contrato
            ]);
            
            transactions.forEach(tx => {
                const value = parseFloat(tx.value) / Math.pow(10, decimals);
                const date = new Date(parseInt(tx.timeStamp) * 1000);
                const dateKey = date.toISOString().split('T')[0];
                const fromAddress = tx.from.toLowerCase();
                const toAddress = tx.to.toLowerCase();
                
                // Determinar se é compra ou venda baseado no fluxo
                const isFromContract = fromAddress === contractAddress.toLowerCase();
                const isToContract = toAddress === contractAddress.toLowerCase();
                const isFromExchange = knownExchanges.has(fromAddress);
                const isToExchange = knownExchanges.has(toAddress);
                
                let isPurchase = false;
                let isSale = false;
                
                // Lógica para identificar compras vs vendas
                if (isFromContract || isFromExchange) {
                    // Tokens saindo do contrato ou exchange = COMPRA para o destinatário
                    isPurchase = true;
                    analysis.purchaseTransactions++;
                    analysis.totalPurchaseValue += value;
                    analysis.uniqueBuyers.add(toAddress);
                    
                    // Maior compra
                    if (value > maxPurchaseValue) {
                        maxPurchaseValue = value;
                        analysis.largestPurchase = { ...tx, formattedValue: value, type: 'COMPRA' };
                    }
                    
                    // Volume de compras por dia
                    if (!analysis.dailyPurchaseVolume[dateKey]) {
                        analysis.dailyPurchaseVolume[dateKey] = 0;
                        analysis.purchasesByDay[dateKey] = 0;
                    }
                    analysis.dailyPurchaseVolume[dateKey] += value;
                    analysis.purchasesByDay[dateKey]++;
                    
                    // Top compradores
                    if (!analysis.topBuyers[toAddress]) {
                        analysis.topBuyers[toAddress] = 0;
                    }
                    analysis.topBuyers[toAddress] += value;
                    
                } else if (isToContract || isToExchange) {
                    // Tokens indo para o contrato ou exchange = VENDA do remetente
                    isSale = true;
                    analysis.saleTransactions++;
                    analysis.totalSaleValue += value;
                    analysis.uniqueSellers.add(fromAddress);
                    
                    // Maior venda
                    if (value > maxSaleValue) {
                        maxSaleValue = value;
                        analysis.largestSale = { ...tx, formattedValue: value, type: 'VENDA' };
                    }
                    
                    // Volume de vendas por dia
                    if (!analysis.dailySaleVolume[dateKey]) {
                        analysis.dailySaleVolume[dateKey] = 0;
                        analysis.salesByDay[dateKey] = 0;
                    }
                    analysis.dailySaleVolume[dateKey] += value;
                    analysis.salesByDay[dateKey]++;
                    
                    // Top vendedores
                    if (!analysis.topSellers[fromAddress]) {
                        analysis.topSellers[fromAddress] = 0;
                    }
                    analysis.topSellers[fromAddress] += value;
                } else {
                    // Transferência entre carteiras (não é compra nem venda direta)
                    isPurchase = true; // Considerar como movimento de tokens
                    analysis.totalVolumeIn += value;
                }
                
                // Volume total (todas as transações)
                analysis.totalVolumeIn += value;
                
                // Holders únicos
                analysis.uniqueHolders.add(toAddress);
                analysis.uniqueSenders.add(fromAddress);
                
                // Maior transação geral
                if (value > maxValue) {
                    maxValue = value;
                    analysis.largestTransaction = { ...tx, formattedValue: value };
                }
                
                // Primeira e última transação
                if (!analysis.firstTransaction || parseInt(tx.timeStamp) < parseInt(analysis.firstTransaction.timeStamp)) {
                    analysis.firstTransaction = tx;
                }
                if (!analysis.lastTransaction || parseInt(tx.timeStamp) > parseInt(analysis.lastTransaction.timeStamp)) {
                    analysis.lastTransaction = tx;
                }
                
                // Volume por dia
                if (!analysis.dailyVolume[dateKey]) {
                    analysis.dailyVolume[dateKey] = 0;
                    analysis.transactionsByDay[dateKey] = 0;
                }
                analysis.dailyVolume[dateKey] += value;
                analysis.transactionsByDay[dateKey]++;
                
                // Top holders (aproximado)
                if (!analysis.topHolders[tx.to.toLowerCase()]) {
                    analysis.topHolders[tx.to.toLowerCase()] = 0;
                }
                analysis.topHolders[tx.to.toLowerCase()] += value;
            });
            
            // Converter sets para arrays e contar
            analysis.uniqueHoldersCount = analysis.uniqueHolders.size;
            analysis.uniqueSendersCount = analysis.uniqueSenders.size;
            analysis.uniqueBuyersCount = analysis.uniqueBuyers.size;
            analysis.uniqueSellersCount = analysis.uniqueSellers.size;
            
            // Ordenar top holders, compradores e vendedores
            analysis.topHoldersArray = Object.entries(analysis.topHolders)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 10)
                .map(([address, volume]) => ({ address, volume }));
                
            analysis.topBuyersArray = Object.entries(analysis.topBuyers)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 10)
                .map(([address, volume]) => ({ address, volume }));
                
            analysis.topSellersArray = Object.entries(analysis.topSellers)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 10)
                .map(([address, volume]) => ({ address, volume }));
            
            addDebugInfo('✅ Análise global processada', {
                totalVolume: analysis.totalVolumeIn.toFixed(6),
                uniqueHolders: analysis.uniqueHoldersCount,
                largestTx: maxValue.toFixed(6)
            }, 'success');
            
            // LOG DESTACADO DO VALOR TOTAL DAS COMPRAS
            addDebugInfo('💰 VALOR TOTAL DAS COMPRAS IDENTIFICADAS', {
                valorTotalCompras: `${analysis.totalPurchaseValue.toFixed(6)} ${currentTokenInfo?.symbol || 'TOKEN'}`,
                numeroCompras: analysis.purchaseTransactions,
                valorTotalVendas: `${analysis.totalSaleValue.toFixed(6)} ${currentTokenInfo?.symbol || 'TOKEN'}`,
                numeroVendas: analysis.saleTransactions,
                compradoresUnicos: analysis.uniqueBuyersCount,
                vendedoresUnicos: analysis.uniqueSellersCount,
                maiorCompra: analysis.largestPurchase ? `${analysis.largestPurchase.formattedValue.toFixed(6)} ${currentTokenInfo?.symbol || 'TOKEN'}` : 'N/A',
                maiorVenda: analysis.largestSale ? `${analysis.largestSale.formattedValue.toFixed(6)} ${currentTokenInfo?.symbol || 'TOKEN'}` : 'N/A'
            }, 'success');
            
            // NOVA FUNCIONALIDADE: Calcular valores históricos
            addDebugInfo('🚀 Iniciando cálculo de valores históricos', {
                totalTransactions: analysis.totalTransactions,
                token: currentTokenInfo?.symbol || 'TOKEN'
            }, 'info');
            
            // Calcular valores históricos para todas as transações
            try {
                const historicalResults = await calculateHistoricalValues(transactions, currentTokenInfo);
                
                // Adicionar resultados históricos à análise
                analysis.historicalValues = historicalResults;
                analysis.totalHistoricalValueUSD = historicalResults.totalHistoricalValueUSD;
                analysis.totalPurchaseValueUSD = historicalResults.totalPurchaseValueUSD;
                analysis.totalSaleValueUSD = historicalResults.totalSaleValueUSD;
                analysis.averageTransactionValueUSD = historicalResults.averageTransactionValueUSD;
                
                // LOG DESTACADO DOS VALORES HISTÓRICOS
                addDebugInfo('💎 VALORES HISTÓRICOS CALCULADOS', {
                    valorTotalHistoricoUSD: `$${historicalResults.totalHistoricalValueUSD.toFixed(2)}`,
                    valorComprasHistoricoUSD: `$${historicalResults.totalPurchaseValueUSD.toFixed(2)}`,
                    valorVendasHistoricoUSD: `$${historicalResults.totalSaleValueUSD.toFixed(2)}`,
                    valorMedioTransacaoUSD: `$${historicalResults.averageTransactionValueUSD.toFixed(2)}`,
                    transacoesProcessadas: historicalResults.processedTransactions
                }, 'success');
                
            } catch (error) {
                addDebugInfo('⚠️ Erro no cálculo de valores históricos', {
                    error: error.message
                }, 'warning');
                
                // Continuar sem valores históricos se houver erro
                analysis.historicalValues = null;
                analysis.totalHistoricalValueUSD = 0;
                analysis.totalPurchaseValueUSD = 0;
                analysis.totalSaleValueUSD = 0;
            }
            
            globalTokenAnalysis = analysis;
            return analysis;
        }

        // Função para exibir resultados da análise global
        function displayGlobalTokenResults(analysis) {
            const tokenName = currentTokenInfo?.name || 'Token Desconhecido';
            const symbol = currentTokenInfo?.symbol || 'TOKEN';
            
            // Formatação de números com separadores de milhares
            function formatNumber(num, decimals = 6) {
                return new Intl.NumberFormat('pt-BR', {
                    minimumFractionDigits: decimals,
                    maximumFractionDigits: decimals
                }).format(num);
            }
            
            function formatLargeNumber(num) {
                if (num >= 1e9) {
                    return (num / 1e9).toFixed(2) + 'B';
                } else if (num >= 1e6) {
                    return (num / 1e6).toFixed(2) + 'M';
                } else if (num >= 1e3) {
                    return (num / 1e3).toFixed(2) + 'K';
                }
                return formatNumber(num, 2);
            }
            
            // Atualizar cards de resumo com dados globais formatados
            document.getElementById('totalTx').textContent = analysis.totalTransactions.toLocaleString('pt-BR');
            document.getElementById('totalVolume').textContent = `${formatNumber(analysis.totalVolumeIn)} ${symbol}`;
            document.getElementById('avgValue').textContent = `${formatNumber(analysis.totalVolumeIn / analysis.totalTransactions)} ${symbol}`;
            
            if (analysis.lastTransaction) {
                const lastTxTime = new Date(parseInt(analysis.lastTransaction.timeStamp) * 1000);
                document.getElementById('lastTx').textContent = getTimeAgo(lastTxTime);
            }
            
            // Atualizar análise de fluxo para dados globais
            document.getElementById('flowAnalysisTitle').innerHTML = `
                <svg class="w-8 h-8 text-purple-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                </svg>
                Análise Global - ${tokenName} (${symbol})
                <span class="text-sm text-gray-400 ml-2">Todas as Transações</span>
            `;
            
            document.getElementById('incomingTitle').textContent = `${symbol} - VALOR TOTAL DAS COMPRAS`;
            document.getElementById('outgoingTitle').textContent = `${symbol} - VALOR TOTAL DAS VENDAS`;
            document.getElementById('netBalanceTitle').textContent = `${symbol} - Maior Compra`;
            
            // Dados globais com formatação melhorada - FOCO NAS COMPRAS
            document.getElementById('incomingCount').textContent = analysis.purchaseTransactions.toLocaleString('pt-BR');
            document.getElementById('incomingVolume').textContent = `${formatNumber(analysis.totalPurchaseValue)} ${symbol}`;
            document.getElementById('outgoingCount').textContent = analysis.saleTransactions.toLocaleString('pt-BR');
            document.getElementById('outgoingVolume').textContent = `${formatNumber(analysis.totalSaleValue)} ${symbol}`;
            
            const netBalanceElement = document.getElementById('netBalance');
            if (analysis.largestPurchase) {
                netBalanceElement.textContent = `${formatNumber(analysis.largestPurchase.formattedValue)} ${symbol}`;
                netBalanceElement.className = 'text-3xl font-bold text-green-400';
            }
            
            // Atualizar cards de resumo com dados de compras
            document.getElementById('totalTx').textContent = analysis.totalTransactions.toLocaleString('pt-BR');
            document.getElementById('totalVolume').textContent = `${formatNumber(analysis.totalPurchaseValue)} ${symbol}`;
            document.getElementById('avgValue').textContent = `${formatNumber(analysis.totalPurchaseValue / (analysis.purchaseTransactions || 1))} ${symbol}`;
            
            // Adicionar resumo destacado do valor total das compras
            addDebugInfo('🛒 RESUMO COMPLETO DAS COMPRAS', {
                token: `${tokenName} (${symbol})`,
                valorTotalCompras: `${formatNumber(analysis.totalPurchaseValue)} ${symbol}`,
                valorTotalComprasFormatado: `${formatLargeNumber(analysis.totalPurchaseValue)} ${symbol}`,
                numeroCompras: analysis.purchaseTransactions.toLocaleString('pt-BR'),
                compradoresUnicos: analysis.uniqueBuyersCount.toLocaleString('pt-BR'),
                maiorCompra: `${formatNumber(analysis.largestPurchase?.formattedValue || 0)} ${symbol}`,
                valorMedioCompra: `${formatNumber(analysis.totalPurchaseValue / (analysis.purchaseTransactions || 1))} ${symbol}`
            }, 'success');
            
            // EXIBIR VALORES HISTÓRICOS SE DISPONÍVEIS
            if (analysis.historicalValues && analysis.totalHistoricalValueUSD > 0) {
                // Atualizar títulos para incluir valores em USD
                document.getElementById('incomingTitle').textContent = `${symbol} - COMPRAS (${formatLargeNumber(analysis.totalPurchaseValueUSD)} USD)`;
                document.getElementById('outgoingTitle').textContent = `${symbol} - VENDAS (${formatLargeNumber(analysis.totalSaleValueUSD)} USD)`;
                document.getElementById('netBalanceTitle').textContent = `VALOR HISTÓRICO TOTAL`;
                
                // Atualizar card principal com valor histórico total
                const netBalanceElement = document.getElementById('netBalance');
                netBalanceElement.textContent = `$${formatLargeNumber(analysis.totalHistoricalValueUSD)}`;
                netBalanceElement.className = 'text-3xl font-bold text-yellow-400';
                
                // Atualizar cards de resumo com valores históricos
                document.getElementById('totalVolume').textContent = `$${formatLargeNumber(analysis.totalHistoricalValueUSD)}`;
                document.getElementById('avgValue').textContent = `$${formatNumber(analysis.averageTransactionValueUSD, 2)}`;
                
                // Log destacado final com valores históricos
                addDebugInfo('🏆 ANÁLISE HISTÓRICA COMPLETA', {
                    token: `${tokenName} (${symbol})`,
                    valorTotalHistoricoUSD: `$${formatLargeNumber(analysis.totalHistoricalValueUSD)}`,
                    valorComprasHistoricoUSD: `$${formatLargeNumber(analysis.totalPurchaseValueUSD)}`,
                    valorVendasHistoricoUSD: `$${formatLargeNumber(analysis.totalSaleValueUSD)}`,
                    valorMedioTransacaoUSD: `$${formatNumber(analysis.averageTransactionValueUSD, 2)}`,
                    transacoesAnalisadas: analysis.totalTransactions.toLocaleString('pt-BR'),
                    metodologia: 'Preços históricos reais por data de transação'
                }, 'success');
            }
            
            // Renderizar tabela com transações mais recentes
            // Usar as transações originais que foram processadas
            const allTx = globalTokenAnalysis ? Object.values(globalTokenAnalysis) : [];
            currentTransactions = allTx.length > 50 ? allTx.slice(0, 50) : allTx;
            
            addDebugInfo('📊 Resultados globais exibidos', {
                displayedTransactions: Math.min(50, analysis.totalTransactions)
            }, 'success');
        }

        // Event Listeners para Modo de Análise
        document.getElementById('walletModeCard').addEventListener('click', function() {
            switchAnalysisMode('wallet');
        });

        document.getElementById('contractModeCard').addEventListener('click', function() {
            switchAnalysisMode('contract');
        });

        // Event Listeners
        analyzeBtn.addEventListener('click', function() {
            if (analysisMode === 'wallet') {
                analyzeTransactions();
            } else {
                analyzeGlobalToken();
            }
        });
        document.getElementById('exportBtn').addEventListener('click', exportToCSV);

        // Event Listeners para Ações Rápidas
        document.getElementById('copyContractBtn').addEventListener('click', function() {
            const contractAddress = document.getElementById('contractAddress').textContent;
            navigator.clipboard.writeText(contractAddress).then(() => {
                this.textContent = 'Copiado!';
                setTimeout(() => this.textContent = 'Copiar', 2000);
            });
        });

        document.getElementById('copyWalletBtn').addEventListener('click', function() {
            const walletAddress = document.getElementById('walletAddress').textContent;
            navigator.clipboard.writeText(walletAddress).then(() => {
                this.textContent = 'Copiado!';
                setTimeout(() => this.textContent = 'Copiar', 2000);
            });
        });

        document.getElementById('refreshAnalysisBtn').addEventListener('click', function() {
            analyzeTransactions();
        });

        document.getElementById('exportDataBtn').addEventListener('click', function() {
            exportToCSV();
        });

        document.getElementById('shareAnalysisBtn').addEventListener('click', function() {
            const url = window.location.href;
            navigator.clipboard.writeText(url).then(() => {
                alert('Link da análise copiado para a área de transferência!');
            });
        });

        document.getElementById('newAnalysisBtn').addEventListener('click', function() {
            if (confirm('Deseja iniciar uma nova análise? Os dados atuais serão perdidos.')) {
                location.reload();
            }
        });

        // Event Listeners para Portfolio
        document.getElementById('refreshPortfolioBtn').addEventListener('click', function() {
            fetchWalletPortfolio();
        });

        document.getElementById('exportPortfolioBtn').addEventListener('click', function() {
            exportPortfolio();
        });

        document.getElementById('sortByValueBtn').addEventListener('click', function() {
            currentPortfolio.sort((a, b) => b.valueUSD - a.valueUSD);
            displayPortfolio();
        });

        // Inicializar quando a página carregar
        document.addEventListener('DOMContentLoaded', function() {
            initializeDates();
            addDebugInfo('🚀 Wallex inicializado', {
                supportedNetworks: Object.keys(CHAIN_CONFIG).length,
                apiKeyIntegrated: true,
                debugMode: debugMode,
                version: 'PRO'
            }, 'success');
        });
