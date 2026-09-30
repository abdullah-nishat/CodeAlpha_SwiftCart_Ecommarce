const path = require('path');
const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const pool = require('./config/db');
require('dotenv').config();

const app = express();
const PORT = Number(process.env.PORT || 5000);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  store: new pgSession({ pool, tableName: 'user_sessions', createTableIfMissing: true }),
  secret: process.env.SESSION_SECRET || 'development-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, secure: false, maxAge: 1000 * 60 * 60 * 24 * 7, sameSite: 'lax' }
}));

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/products', require('./routes/products.routes'));
app.use('/api/categories', require('./routes/categories.routes'));
app.use('/api/cart', require('./routes/cart.routes'));
app.use('/api/wishlist', require('./routes/wishlist.routes'));
app.use('/api/orders', require('./routes/orders.routes'));
app.use('/api/admin', require('./routes/admin.routes'));

app.use(express.static(path.join(__dirname, '../public')));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: err.message || 'Internal server error' });
});

const bcrypt = require('bcrypt');

async function ensureDefaultAdmin() {
  try {
    const adminEmail = 'admin@swiftcart.com';
    const existing = await pool.query('SELECT id, role FROM users WHERE email = $1', [adminEmail]);
    if (!existing.rowCount) {
      const hash = await bcrypt.hash('Admin123', 12);
      await pool.query(
        `INSERT INTO users (full_name, email, password_hash, role)
         VALUES ($1, $2, $3, 'ADMIN')`,
        ['SwiftCart Admin', adminEmail, hash]
      );
      console.log('✓ Default admin account verified: admin@swiftcart.com / Admin123');
    }
  } catch (err) {
    // If database tables are not yet migrated, log a note without crashing
    console.warn('Note on default admin initialization:', err.message);
  }
}

pool.query('SELECT NOW()')
  .then(async () => {
    await ensureDefaultAdmin();
    app.listen(PORT, () => console.log(`SwiftCart running at http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('PostgreSQL connection failed:', err.message);
    process.exit(1);
  });
