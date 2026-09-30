const bcrypt = require('bcrypt');
const pool = require('../config/db');

async function main() {
  const email = (process.argv[2] || 'admin@swiftcart.com').trim().toLowerCase();
  const password = process.argv[3] || 'Admin123';
  const fullName = process.argv[4] || 'SwiftCart Admin';
  const hash = await bcrypt.hash(password, 12);
  const result = await pool.query(
    `INSERT INTO users (full_name, email, password_hash, role)
     VALUES ($1,$2,$3,'ADMIN')
     ON CONFLICT (email) DO UPDATE SET full_name=EXCLUDED.full_name, password_hash=EXCLUDED.password_hash, role='ADMIN'
     RETURNING id, full_name, email, role`,
    [fullName, email, hash]
  );
  console.log('Admin ready:', result.rows[0]);
  await pool.end();
}

main().catch(async (e) => { console.error(e); await pool.end(); process.exit(1); });
