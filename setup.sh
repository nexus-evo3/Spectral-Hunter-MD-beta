#!/bin/bash
echo "🛡️ Installation de Spectral Hunter..."

# Cloner le repo
git clone https://github.com/nexus-evo3/Spectral-Hunter-MD-V1.git
cd Spectral-Hunter-MD-V1

# Installer les dépendances
npm install

echo "✅ Installation terminée !"
echo "🚀 Démarrage du bot..."
node index.js
