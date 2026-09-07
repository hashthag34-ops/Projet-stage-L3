// backend/hash.js
const bcrypt = require('bcrypt'); // ou 'bcryptjs'

async function generateHash() {
  const hash = await bcrypt.hash('Aime34', 10);
  console.log("Voici ton hash pour PostgreSQL :");
  console.log(hash);
}

generateHash();