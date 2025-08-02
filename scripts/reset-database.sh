#!/bin/bash

echo ""
echo "========================================"
echo "   SuperOAuth Database Reset Tool"
echo "========================================"
echo ""
echo "Ce script va vider toutes les données utilisateurs"
echo "de la base de données SuperOAuth."
echo ""
echo "⚠️  ATTENTION: Cette action est irréversible !"
echo ""

read -p "Voulez-vous vraiment continuer ? (oui/non): " confirm

case $confirm in
    [Oo]ui|[Oo]|[Yy]es|[Yy])
        echo ""
        echo "Exécution du script de reset..."
        echo ""
        npm run db:reset-force
        ;;
    *)
        echo ""
        echo "❌ Opération annulée."
        exit 0
        ;;
esac

echo ""
echo "✅ Terminé !"
