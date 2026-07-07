#!/bin/sh
set -e

echo "=== UPA do Tênis — Iniciando ==="

# Aplicar migrations pendentes
echo ">> Aplicando migrations do Prisma..."
node node_modules/prisma/build/index.js migrate deploy

echo ">> Iniciando servidor Next.js..."
exec node server.js
