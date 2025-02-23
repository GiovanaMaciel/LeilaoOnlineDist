@echo off
REM multipass_setup.cmd

REM Excluir VMs existentes (opcional – descomente se desejar remover as VMs já criadas)
REM multipass delete manager worker1 worker2
REM multipass purge

REM Criar VMs com Multipass
multipass launch --name manager --memory 2G --disk 10G
multipass launch --name worker1 --memory 2G --disk 10G
multipass launch --name worker2 --memory 2G --disk 10G

REM Instalar Docker em todas as VMs
for %%v in (manager worker1 worker2) do (
  multipass exec %%v -- bash -c "sudo apt-get update && sudo apt-get install -y docker.io"
)

REM Obter o IP do nó manager
for /f "tokens=2" %%i in ('multipass info manager ^| findstr "IPv4"') do set manager_ip=%%i

REM Inicializar Docker Swarm no nó manager
multipass exec manager -- docker swarm init --advertise-addr %manager_ip%

REM Obter o token para workers
for /f "delims=" %%t in ('multipass exec manager -- docker swarm join-token -q worker') do set worker_token=%%t

REM Juntar os workers ao swarm
for %%w in (worker1 worker2) do (
  multipass exec %%w -- docker swarm join --token %worker_token% %manager_ip%:2377
)

echo Cluster Docker Swarm configurado com sucesso.
pause
