#!/bin/bash
# multipass_setup.sh

# Criar VMs com Multipass
multipass launch --name manager --mem 2G --disk 10G
multipass launch --name worker1 --mem 2G --disk 10G
multipass launch --name worker2 --mem 2G --disk 10G

# Instalar Docker em todas as VMs
for vm in manager worker1 worker2; do
  multipass exec $vm -- bash -c "sudo apt-get update && sudo apt-get install -y docker.io"
done

# Inicializar Docker Swarm no nó manager
manager_ip=$(multipass info manager | grep IPv4 | awk '{print $2}')
multipass exec manager -- docker swarm init --advertise-addr $manager_ip

# Obter token de worker
worker_token=$(multipass exec manager -- docker swarm join-token -q worker)

# Juntar os workers ao swarm
for worker in worker1 worker2; do
  multipass exec $worker -- docker swarm join --token $worker_token $manager_ip:2377
done

echo "Cluster Docker Swarm configurado com sucesso."
