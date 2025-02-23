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
├── setup_deploy.sh          # Script para criação e configuração de VMs e deploy
├── templates/               # Arquivos de templates HTML
│   └── index.html           # Interface principal da aplicação
└── static/                  # Arquivos estáticos (JS, CSS, imagens)
    └── logo.png             # Logo da aplicação 
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
### Executando com o script setup_deploy.sh
Esse script automatiza todo o processo de criação das VMs, configuração do ambiente e deploy da aplicação.
* **Clone o repositório**
```markdown
 git clone <URL-do-repositório>
```
É importante que você esteja a um repositório anterior ao da aplicação, e que o script "setup_deploy.sh" esteja nesse mesmo repositório anterior. Exemplo:
```markdown
├── Documents/               # Pasta anterior
    └── LeilaoOnlineDist/    # Pasta da aplicação
    └── setup_deploy.sh      # script para automatização
```

* **Dê permissão de execução ao script**
```markdown
chmod +x setup_deploy.sh
```
* **Execute o script**
```markdown
./setup_deploy.sh
```

**Esse script irá:**
* Criar 3 VMs (manager, worker1 e worker2).
* Instalar o Docker nas VMs.
* Configurar o Docker Swarm.
* Compactar e transferir o projeto para a VM manager.
* Construir a imagem Docker da aplicação.
* Realizar o deploy utilizando Docker Swarm.

**Acessando a aplicação**

Após a execução do script, a aplicação estará rodando. Agora basta descobrir o IP das VMs manager, worker1, worker2:
```markdown
multipass list
```
Com os IPs, acesse três abas no navegador com:
```markdown
http://<IP_DA_VM>:5000
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
