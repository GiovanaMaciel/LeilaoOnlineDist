#!/bin/bash
set -e

echo "=============================================="
echo "1) Criando as VMs (manager, worker1, worker2)..."
echo "=============================================="
multipass launch --name manager --cpus 2 --memory 2G --disk 10G
multipass launch --name worker1 --cpus 2 --memory 2G --disk 10G
multipass launch --name worker2 --cpus 2 --memory 2G --disk 10G

echo "=============================================="
echo "2) Instalando Docker em todas as VMs..."
echo "=============================================="
for vm in manager worker1 worker2; do
  echo "Instalando Docker na VM $vm..."
  multipass exec "$vm" -- bash -c "curl -fsSL https://get.docker.com | sudo bash"
done

echo "=============================================="
echo "3) Inicializando Docker Swarm no manager..."
echo "=============================================="
multipass exec manager -- bash -c "sudo docker swarm init --advertise-addr \$(hostname -I | awk '{print \$1}')"

echo "=============================================="
echo "4) Obtendo token para adicionar workers ao Swarm..."
echo "=============================================="
# Obtém o IP do manager
manager_ip=$(multipass info manager | grep "IPv4" | awk '{print $2}')
# Obtém o token dos workers com sudo
worker_token=$(multipass exec manager -- bash -c "sudo docker swarm join-token -q worker")
echo "Manager IP: $manager_ip"
echo "Worker Token: $worker_token"

echo "=============================================="
echo "5) Adicionando os workers ao Swarm..."
echo "=============================================="
for worker in worker1 worker2; do
  echo "Adicionando $worker ao Swarm..."
  multipass exec "$worker" -- sudo docker swarm join --token "$worker_token" "$manager_ip":2377
done

echo "=============================================="
echo "6) Verificando e gerando o arquivo compactado da aplicação..."
echo "=============================================="
if [ ! -f "LeilaoOnlineDist.tar.gz" ]; then
  echo "Arquivo LeilaoOnlineDist.tar.gz não encontrado. Compactando a pasta LeilaoOnlineDist..."
  tar -czvf LeilaoOnlineDist.tar.gz LeilaoOnlineDist
else
  echo "Arquivo LeilaoOnlineDist.tar.gz encontrado."
fi

echo "=============================================="
echo "7) Transferindo a aplicação para o manager..."
echo "=============================================="
multipass transfer LeilaoOnlineDist.tar.gz manager:

echo "=============================================="
echo "8) Extraindo a aplicação no manager..."
echo "=============================================="
multipass exec manager -- tar -xzvf LeilaoOnlineDist.tar.gz

echo "=============================================="
echo "9) Construindo a imagem Docker da aplicação no manager..."
echo "=============================================="
multipass exec manager -- bash -c "cd LeilaoOnlineDist && sudo docker build -t my_flask_app ."

echo "=============================================="
echo "10) Deploy do stack Swarm (criando serviços e distribuindo contêineres)..."
echo "=============================================="
multipass exec manager -- bash -c "cd LeilaoOnlineDist && sudo docker stack deploy -c docker-stack.yml leilao"

echo "=============================================="
echo "Setup concluído!"