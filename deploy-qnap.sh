#!/bin/bash
# Script de despliegue para QNAP

echo "========================================="
echo "🚀 Desplegando PLC Dashboard en QNAP"
echo "========================================="

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}📦 Construyendo y levantando contenedores...${NC}"
docker-compose up -d --build

echo -e "${YELLOW}⏳ Esperando que los servicios inicien...${NC}"
sleep 10

echo -e "${YELLOW}📊 Verificando estado...${NC}"
docker-compose ps

# Obtener IP de la QNAP
QNAP_IP=$(ip route get 1 | awk '{print $NF;exit}')

echo "========================================="
echo -e "${GREEN}✅ Despliegue completado${NC}"
echo "========================================="
echo -e "📊 Dashboard: ${GREEN}http://$QNAP_IP:3000${NC}"
echo -e "   (Modo: ${YELLOW}MOCK${NC} - datos de prueba)"
echo ""
echo -e "📝 Para cambiar a BD real cuando esté lista:"
echo "   1. Edita docker-compose.yml"
echo "   2. Cambia NEXT_PUBLIC_USE_MOCK=false"
echo "   3. Ajusta DATABASE_URL con los datos de tu compañero"
echo "   4. Ejecuta: docker-compose up -d"
echo "========================================="