# 📚 Documentação Técnica - Wallex

## Arquitetura do Sistema

O Wallex é construído como uma Single Page Application (SPA) que utiliza a API V2 unificada do Etherscan para acessar dados de múltiplas redes blockchain. A arquitetura foi projetada para ser simples, eficiente e facilmente extensível.

### Componentes Principais

**Frontend Responsivo**
A interface utiliza HTML5 semântico com CSS3 moderno, implementando o design system glass morphism através do Tailwind CSS. O JavaScript ES6+ gerencia toda a lógica de negócio, manipulação DOM e comunicação com APIs externas.

**Sistema de Configuração de Redes**
O objeto `CHAIN_CONFIG` centraliza todas as configurações das redes blockchain suportadas, incluindo Chain IDs, nomes, símbolos nativos e URLs dos exploradores. Esta abordagem facilita a adição de novas redes sem modificar a lógica principal.

**Gerenciamento de Estado**
O estado da aplicação é mantido através de variáveis globais como `currentTokenInfo`, `currentTransactions` e `debugMode`. Este padrão simples é adequado para o escopo atual da aplicação.

## API Integration

### Etherscan API V2 Unificada

A migração para a API V2 trouxe benefícios significativos em termos de simplicidade e manutenibilidade. O endpoint unificado `https://api.etherscan.io/v2/api` permite acessar dados de todas as redes suportadas usando apenas o parâmetro `chainid`.

**Exemplo de Requisição**
```javascript
const url = `https://api.etherscan.io/v2/api?module=account&action=tokentx&contractaddress=${tokenAddress}&address=${walletAddress}&startblock=0&endblock=99999999&sort=desc&apikey=${API_KEY}&chainid=${chainId}`;
```

**Tratamento de Respostas**
O sistema implementa múltiplas camadas de validação para garantir a robustez. Primeiro verifica se a resposta HTTP é válida, depois valida a estrutura JSON e finalmente verifica se os dados retornados estão no formato esperado.

### Detecção de Tokens

O sistema utiliza uma abordagem em cascata para detectar informações de tokens. Primeiro tenta usar o endpoint `tokeninfo` da API, depois busca informações através de transações existentes e finalmente consulta uma base de dados local de tokens conhecidos.

**Base de Dados de Tokens Conhecidos**
```javascript
const knownTokens = {
    '0xAEdED60cBadD688279908dF18194FD31387baEb4': {
        name: 'Golden Eggs',
        symbol: 'GEGG',
        decimals: 18
    }
};
```

## Funcionalidades Avançadas

### Sistema de Debug em Tempo Real

O sistema de debug foi projetado para fornecer visibilidade completa sobre o funcionamento interno da aplicação. Cada operação importante gera logs categorizados que são exibidos em tempo real na interface.

**Categorias de Debug**
- `info`: Informações gerais sobre o progresso
- `success`: Operações concluídas com sucesso
- `warning`: Situações que requerem atenção
- `error`: Erros que impedem o funcionamento
- `token`: Operações específicas de tokens

### Análise de Fluxo Inteligente

A análise de fluxo separa automaticamente as transações em entradas e saídas, calculando o saldo líquido no período analisado. O sistema considera a direção da transação comparando o endereço da carteira com os campos `from` e `to` de cada transação.

**Lógica de Classificação**
```javascript
const isIncoming = tx.to.toLowerCase() === walletAddress.toLowerCase();
const isOutgoing = tx.from.toLowerCase() === walletAddress.toLowerCase();
```

### Sistema de Filtros

Os filtros avançados permitem refinar os resultados da análise. O sistema suporta filtros por valor mínimo/máximo, tipo de transação (recebidas/enviadas) e endereço específico. Os filtros são aplicados em tempo real conforme o usuário modifica os critérios.

## Segurança e Performance

### Tratamento de Erros Robusto

Toda função crítica é envolvida em blocos try-catch com fallbacks apropriados. O sistema verifica a existência de elementos DOM antes de manipulá-los e valida dados de entrada antes de processá-los.

**Exemplo de Verificação Segura**
```javascript
const element = document.getElementById('targetElement');
if (element) {
    element.textContent = value || 'Valor padrão';
}
```

### Otimizações de Performance

O sistema implementa skeleton loading durante operações assíncronas, evitando a sensação de travamento. As operações de DOM são batched quando possível, e timeouts são utilizados para evitar conflitos de timing.

### Proteção de API Keys

A API key é integrada diretamente no código para simplificar a experiência do usuário. Em um ambiente de produção, recomenda-se implementar um proxy backend para proteger as credenciais.

## Extensibilidade

### Adicionando Novas Redes

Para adicionar suporte a uma nova rede blockchain, basta incluir uma entrada no objeto `CHAIN_CONFIG` com as informações necessárias:

```javascript
'nova-rede': {
    name: 'Nova Rede',
    chainId: 12345,
    symbol: 'NOVA',
    explorer: 'https://explorer.nova-rede.com'
}
```

### Adicionando Tokens Conhecidos

Novos tokens podem ser adicionados à base de dados local através do objeto `knownTokens`, facilitando a detecção automática de informações.

### Customização da Interface

O design utiliza variáveis CSS customizadas que podem ser facilmente modificadas para alterar cores, espaçamentos e outros aspectos visuais sem afetar a funcionalidade.

## Deployment e Manutenção

### Requisitos Mínimos

A aplicação requer apenas um servidor web capaz de servir arquivos estáticos. Não há dependências de backend ou banco de dados, tornando o deployment extremamente simples.

### Monitoramento

O sistema de debug integrado facilita o monitoramento em produção. Logs detalhados permitem identificar rapidamente problemas de conectividade ou dados malformados.

### Atualizações

A arquitetura modular permite atualizações incrementais sem afetar funcionalidades existentes. Novas features podem ser adicionadas através de funções independentes que se integram ao sistema existente.

## Considerações Futuras

### Escalabilidade

Para suportar um volume maior de usuários, considera-se implementar cache local de dados e otimizações adicionais de performance. A migração para um framework moderno como React ou Vue.js pode ser benéfica para funcionalidades mais complexas.

### Funcionalidades Avançadas

O roadmap inclui análise de NFTs, gráficos interativos e integração com carteiras. A arquitetura atual suporta essas expansões sem modificações estruturais significativas.

### Compliance e Regulamentação

Futuras versões podem incluir funcionalidades de compliance para atender regulamentações específicas de diferentes jurisdições, como relatórios fiscais automatizados e classificação de transações por categoria.
