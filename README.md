# Plataforma de Leilão Online Distribuída

Uma plataforma de leilão online distribuída que permite criar, gerenciar e participar de leilões em tempo real. Desenvolvida com Flask, Redis, Docker Swarm e Multipass, essa aplicação é escalável, tolerante a falhas e capaz de lidar com um grande número de usuários simultâneos com tempo de inatividade mínimo.

## Visão Geral
A aplicação permite que os usuários:

* **Criem leilões** para itens, com validações robustas (data de término futura, não duplicidade de título e descrição).
* **Visualizem os leilões ativos** em uma interface moderna com layout em duas colunas, onde o lado esquerdo exibe uma lista interativa de leilões ativos e o lado direito mostra os detalhes do leilão selecionado.
* **Realizem lances em tempo real**, com atualizações instantâneas através do Redis Pub/Sub.
* **Recebam feedback direto na interface**, sem pop-ups, com animações e mensagens de status claras.

## Funcionalidades
* **Validação de Leilões:**
  * Não permite criar leilões com data de término inferior à data atual.
  * Bloqueia a criação de leilões com título e descrição idênticos.

* **Interface de Usuário Moderna:**
  * Layout em duas colunas com barra de navegação.
  * Área "Leilões Ativos" com efeito de hover e scroll personalizado, mantendo o formulário "Criar Leilão" sempre visível.
  * Animações em botões para uma melhor experiência do usuário.
  * Mensagens de feedback exibidas diretamente na interface.

* **Bidding em Tempo Real:**
  * Atualizações de lances via SSE (Server-Sent Events) e Redis Pub/Sub.
  * Desabilitação dos inputs e exibição de mensagem fixa quando o leilão estiver encerrado.

* **Escalabilidade e Tolerância a Falhas:**
  * Orquestração com Docker Swarm e execução em múltiplas VMs com Multipass.
  * Utilização do Gunicorn com workers baseados em gevent para alta concorrência.

## Estrutura do Projeto
```markdown
/ (raiz)
├── app.py                   # Aplicação Flask com todas as rotas e lógica
├── requirements.txt         # Dependências do Python
├── Dockerfile               # Instruções para build da imagem Docker
├── docker-compose.yml       # Configuração para execução local
├── docker-stack.yml         # Configuração para deploy com Docker Swarm
├── multipass_setup.sh       # Script para criação e configuração de VMs com Multipass
├── templates/               # Arquivos de templates HTML
│   └── index.html           # Interface principal da aplicação
└── static/                  # Arquivos estáticos (JS, CSS, imagens)
    └── script.js            # Código JavaScript para interatividade e SSE
```
## Tecnologias Utilizadas
* **Flask:** Framework web em Python.
* **Redis:** Armazenamento de dados em tempo real e Pub/Sub.
* **Docker Swarm:** Orquestração de contêineres para escalabilidade e alta disponibilidade.
* **Multipass:** Gerenciamento de VMs para um ambiente distribuído.
* **Gunicorn & gevent:** Servidor WSGI para produção, com suporte assíncrono.
* **Bootstrap:** Framework CSS para um design responsivo e moderno.

## Como Executar
### Pré-requisitos
* **Docker e Docker Compose** instalados.
* **Multipass** para criação de VMs (para deploy distribuído).
* **Python 3.9+** (caso deseje rodar localmente sem Docker).

### Execução Local
1. **Clone o repositório:**
```markdown
git clone <URL-do-repositório>
cd <nome-do-repositório>
```

2. **Instale as dependências:**
```markdown
pip install -r requirements.txt
```

3. **Inicie a aplicação com Docker Compose:**
```markdown
docker-compose up --build
```

4. **Acesse a aplicação:**

    Abra o navegador e vá para http://localhost:5000.

### Deploy com Docker Swarm e Multipass
1. **Configure as VMs:**

    Execute o script multipass_setup.sh para criar e configurar as VMs.
```markdown
bash multipass_setup.sh
```

2. **Construa a imagem Docker:**
```markdown
docker build -t my_flask_app:latest .
```

3. **Realize o deploy usando Docker Swarm:**

    No nó manager, execute:
```markdown
docker stack deploy -c docker-stack.yml my_stack
```

## Uso da Aplicação
* **Criar Leilão:**

    Preencha o formulário na coluna esquerda com título, descrição, preço inicial e data/hora de término. Validações impedirão a criação de leilões com data passada ou duplicados.

* **Visualizar Leilões Ativos:**

    A lista de leilões ativos está na área com scroll personalizado. Passe o mouse sobre um item para ver o efeito de destaque.

* **Participar de um Leilão:**

    Clique em um leilão para ver os detalhes e lances. Se o leilão estiver ativo, você poderá enviar lances; caso contrário, os campos serão desabilitados e uma mensagem fixa informará que o leilão está encerrado.

* **Interações em Tempo Real:**
    A plataforma utiliza SSE para atualizar os lances em tempo real. As mensagens de status são exibidas diretamente na interface.
