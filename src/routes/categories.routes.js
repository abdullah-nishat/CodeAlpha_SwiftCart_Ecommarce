const express = require('express');
const pool = require('../config/db');
const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    const result = await pool.query('SELECT id, name, slug FROM categories ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not load categories' });
  }
});

module.exports = router;
