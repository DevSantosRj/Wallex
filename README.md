# 🚀 Wallex - Analisador Avançado de Transações Blockchain

![Wallex Logo](https://img.shields.io/badge/Wallex-PRO-green?style=for-the-badge&logo=ethereum)
![Version](https://img.shields.io/badge/Version-2.0-blue?style=for-the-badge)
![API](https://img.shields.io/badge/API-V2%20Unified-purple?style=for-the-badge)
![Networks](https://img.shields.io/badge/Networks-10+-orange?style=for-the-badge)

## 📋 Sobre o Projeto

**Wallex** é uma aplicação web avançada para análise completa e inteligente do histórico de transações de carteiras em múltiplas redes blockchain. Oferece insights profissionais, visualizações detalhadas e funcionalidades avançadas para análise de tokens e criptomoedas.

### ✨ Principais Funcionalidades

- 🌐 **Suporte a 10+ Redes Blockchain** (Ethereum, BSC, Polygon, Arbitrum, etc.)
- 🔑 **API V2 Unificada** - Uma única chave para todas as redes
- 🪙 **Detecção Automática de Tokens** - Nome, símbolo e saldo automáticos
- 📊 **Análise de Fluxo Inteligente** - Entradas, saídas e saldo líquido
- 🔍 **Filtros Avançados** - Por valor, tipo, endereço e período
- 📈 **Dashboard Completo** - Estatísticas em tempo real
- 💾 **Exportação CSV** - Download completo dos dados
- 🎨 **Interface Moderna** - Design glass morphism responsivo
- 🔧 **Debug em Tempo Real** - Troubleshooting completo

## 🌐 Redes Suportadas

| Rede | Chain ID | Símbolo | Explorador |
|------|----------|---------|------------|
| Ethereum | 1 | ETH | etherscan.io |
| BNB Smart Chain | 56 | BNB | bscscan.com |
| Polygon | 137 | MATIC | polygonscan.com |
| Arbitrum One | 42161 | ETH | arbiscan.io |
| Optimism | 10 | ETH | optimistic.etherscan.io |
| Avalanche C-Chain | 43114 | AVAX | snowtrace.io |
| Base | 8453 | ETH | basescan.org |
| Blast | 81457 | ETH | blastscan.io |
| Scroll | 534352 | ETH | scrollscan.com |
| zkSync Era | 324 | ETH | explorer.zksync.io |

## 🚀 Como Usar

### 1. Obter API Key
1. Acesse [etherscan.io](https://etherscan.io)
2. Crie uma conta gratuita
3. Gere uma API key no painel
4. Use a mesma chave para todas as 10 redes

### 2. Configurar Análise
1. Selecione a rede blockchain
2. Insira o endereço da carteira
3. (Opcional) Adicione contrato de token específico
4. Configure período e filtros
5. Clique em "Analisar Transações"

### 3. Visualizar Resultados
- **Dashboard**: Estatísticas gerais e métricas
- **Análise de Fluxo**: Entradas, saídas e saldo líquido
- **Tabela Detalhada**: Todas as transações com filtros
- **Informações Completas**: Dados do contrato e carteira

## 🛠️ Tecnologias Utilizadas

- **Frontend**: HTML5, CSS3, JavaScript ES6+
- **Framework CSS**: Tailwind CSS
- **API**: Etherscan API V2 Unificada
- **Design**: Glass Morphism, Gradientes
- **Responsividade**: Mobile-first design
- **Ícones**: Heroicons SVG

## 📊 Funcionalidades Avançadas

### Detecção Automática de Tokens
```javascript
// Suporte a tokens conhecidos
const knownTokens = {
    '0xAEdED60cBadD688279908dF18194FD31387baEb4': {
        name: 'Golden Eggs',
        symbol: 'GEGG',
        decimals: 18
    }
    // Mais tokens...
};
```

### Análise de Fluxo Inteligente
- **Entradas**: Tokens recebidos na carteira
- **Saídas**: Tokens enviados da carteira  
- **Saldo Líquido**: Diferença no período analisado
- **Formatação**: Nome completo + símbolo do token

### Filtros Avançados
- **Por Valor**: Mínimo e máximo
- **Por Tipo**: Recebidas, enviadas ou todas
- **Por Endereço**: Transações com endereço específico
- **Por Período**: Datas personalizadas

## 🔧 Instalação e Deploy

### Uso Local
```bash
# Clonar repositório
git clone https://github.com/DevSantosRj/Wallex.git

# Abrir no navegador
open index.html
```

### Deploy em Servidor
```bash
# Upload para servidor web
# Configurar HTTPS (recomendado)
# Apontar domínio para index.html
```

### GitHub Pages
1. Fork este repositório
2. Vá em Settings > Pages
3. Selecione branch main
4. Acesse via: `https://seuusuario.github.io/Wallex`

## 📈 Roadmap

### Versão 2.1 (Próxima)
- [ ] Suporte a mais 40+ redes
- [ ] Análise de NFTs
- [ ] Gráficos interativos
- [ ] Alertas de transações
- [ ] API própria

### Versão 2.2 (Futuro)
- [ ] Análise de DeFi
- [ ] Portfolio tracking
- [ ] Relatórios PDF
- [ ] Integração com carteiras
- [ ] Modo escuro/claro

## 🤝 Contribuição

Contribuições são bem-vindas! Para contribuir:

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

## 👨‍💻 Autor

**DevSantosRj**
- GitHub: [@DevSantosRj](https://github.com/DevSantosRj)
- LinkedIn: [Seu LinkedIn](https://linkedin.com/in/seu-perfil)

## 🙏 Agradecimentos

- [Etherscan](https://etherscan.io) pela API robusta
- [Tailwind CSS](https://tailwindcss.com) pelo framework CSS
- [Heroicons](https://heroicons.com) pelos ícones SVG
- Comunidade blockchain pelo feedback

## 📞 Suporte

Para suporte, abra uma [issue](https://github.com/DevSantosRj/Wallex/issues) ou entre em contato:

- 📧 Email: seu-email@exemplo.com
- 💬 Discord: SeuUsuario#1234
- 🐦 Twitter: [@SeuTwitter](https://twitter.com/seutwitter)

---

<div align="center">

**⭐ Se este projeto te ajudou, deixe uma estrela! ⭐**

![GitHub stars](https://img.shields.io/github/stars/DevSantosRj/Wallex?style=social)
![GitHub forks](https://img.shields.io/github/forks/DevSantosRj/Wallex?style=social)
![GitHub watchers](https://img.shields.io/github/watchers/DevSantosRj/Wallex?style=social)

</div>
