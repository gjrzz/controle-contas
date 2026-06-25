#!/bin/bash
set -e

echo "============================================"
echo "  Instalando Docker Engine - Ubuntu 22.04"
echo "============================================"
echo ""

echo "[1/6] Atualizando pacotes..."
apt-get update -y

echo "[2/6] Instalando dependencias..."
apt-get install -y ca-certificates curl gnupg

echo "[3/6] Adicionando chave GPG do Docker..."
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo "[4/6] Adicionando repositorio oficial..."
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | \
    tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update -y

echo "[5/6] Instalando Docker e Compose..."
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

echo "[6/6] Adicionando usuario ao grupo docker..."
usermod -aG docker ${SUDO_USER:-$USER}
systemctl enable docker
systemctl start docker

echo ""
echo "============================================"
echo "  Docker instalado com sucesso!"
echo "  Faca logout e login para usar sem sudo."
echo "============================================"
