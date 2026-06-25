#!/bin/bash
set -e

echo "============================================"
echo "  Controle de Contas - Primeiro Deploy"
echo "============================================"
echo ""

echo "[1/5] Subindo banco de dados..."
docker compose up -d db
sleep 10

echo "[2/5] Subindo backend..."
docker compose up -d backend
sleep 5

echo "[3/5] Populando dados iniciais..."
docker compose run --rm backend npm run db:seed

echo "[4/5] Subindo frontend..."
docker compose up -d frontend

echo "[5/5] Verificando servicos..."
docker compose ps

echo ""
echo "============================================"
echo "  Sistema disponivel em http://$(hostname -I | awk '{print $1}')"
echo "============================================"
