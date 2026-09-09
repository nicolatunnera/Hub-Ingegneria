#!/bin/bash

################################################################################
# Engineering Cloud Hub - Firebase Rules Deployment Script
# Deploya le Firestore Security Rules automaticamente
################################################################################

set -e

echo "🚀 Engineering Cloud Hub - Firebase Rules Deployer"
echo "=================================================="
echo ""

# Check if firebase-tools is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ firebase-tools non installato!"
    echo ""
    echo "Installa con:"
    echo "  npm install -g firebase-tools"
    echo ""
    exit 1
fi

# Check if logged in
echo "🔐 Verificando autenticazione Firebase..."
if ! firebase projects:list &> /dev/null; then
    echo "❌ Non autenticato!"
    echo ""
    echo "Effettua login con:"
    echo "  firebase login"
    echo ""
    exit 1
fi

echo "✅ Autenticazione ok"
echo ""

# Get project ID
echo "📋 Progetti disponibili:"
firebase projects:list

echo ""
read -p "Inserisci il Project ID (es: hub-ingegneria): " PROJECT_ID

if [ -z "$PROJECT_ID" ]; then
    echo "❌ Project ID mancante!"
    exit 1
fi

echo ""
echo "🔄 Deploying rules per: $PROJECT_ID"
echo ""

# Deploy rules
firebase deploy --only firestore:rules --project "$PROJECT_ID"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ SUCCESSO! Rules deployate!"
    echo ""
    echo "📍 Verifica su:"
    echo "   https://console.firebase.google.com/project/$PROJECT_ID/firestore/rules"
    echo ""
else
    echo "❌ Deploy fallito!"
    exit 1
fi
