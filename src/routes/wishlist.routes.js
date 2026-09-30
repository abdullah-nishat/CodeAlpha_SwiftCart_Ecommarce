const express = require('express');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT w.id, p.id AS "productId", p.name, p.slug, p.price::float,
              p.discount_percent AS "discountPercent", p.stock, p.image_url AS "imageUrl"
       FROM wishlist_items w JOIN products p ON p.id = w.product_id
       WHERE w.user_id = $1 ORDER BY w.id DESC`, [req.session.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error); res.status(500).json({ message: 'Could not load wishlist' });
  }
});

router.post('/', async (req, res) => {
  try {
    await pool.query(
      `INSERT INTO wishlist_items (user_id, product_id) VALUES ($1, $2)
       ON CONFLICT (user_id, product_id) DO NOTHING`,
      [req.session.user.id, Number(req.body.productId)]
    );
    res.status(201).json({ message: 'Added to wishlist' });
  } catch (error) {
    console.error(error); res.status(500).json({ message: 'Could not add to wishlist' });
  }
});

router.delete('/:productId', async (req, res) => {
  try {
    await pool.query('DELETE FROM wishlist_items WHERE user_id = $1 AND product_id = $2', [req.session.user.id, req.params.productId]);
    res.json({ message: 'Removed from wishlist' });
  } catch (error) {
    console.error(error); res.status(500).json({ message: 'Could not remove wishlist item' });
  }
});

module.exports = router;
