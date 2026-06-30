#!/bin/bash
set -e

echo "============================================"
echo "  Controle de Contas - Atualizacao"
echo "============================================"
echo ""

echo "[1/3] Parando servicos..."
docker compose down

echo "[2/3] Reconstruindo imagens..."
docker compose build --no-cache

echo "[3/3] Subindo servicos..."
docker compose up -d

echo ""
echo "============================================"
echo "  Sistema atualizado com sucesso!"
echo "============================================"
