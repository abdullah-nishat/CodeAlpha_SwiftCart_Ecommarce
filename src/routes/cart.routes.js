const express = require('express');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ci.id, ci.quantity, p.id AS "productId", p.name, p.slug, p.price::float,
              p.discount_percent AS "discountPercent", p.stock, p.image_url AS "imageUrl"
       FROM cart_items ci JOIN products p ON p.id = ci.product_id
       WHERE ci.user_id = $1 ORDER BY ci.id DESC`,
      [req.session.user.id]
    );
    const items = result.rows.map(i => ({ ...i, finalPrice: Number((i.price * (1 - i.discountPercent / 100)).toFixed(2)) }));
    const subtotal = Number(items.reduce((sum, i) => sum + i.finalPrice * i.quantity, 0).toFixed(2));
    res.json({ items, subtotal, count: items.reduce((sum, i) => sum + i.quantity, 0) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not load cart' });
  }
});

router.post('/', async (req, res) => {
  try {
    const productId = Number(req.body.productId);
    const quantity = Math.max(1, Number(req.body.quantity || 1));
    const p = await pool.query('SELECT id, stock FROM products WHERE id = $1', [productId]);
    if (!p.rowCount) return res.status(404).json({ message: 'Product not found' });
    if (p.rows[0].stock < 1) return res.status(400).json({ message: 'Product is out of stock' });

    const current = await pool.query('SELECT id, quantity FROM cart_items WHERE user_id = $1 AND product_id = $2', [req.session.user.id, productId]);
    const nextQty = (current.rows[0]?.quantity || 0) + quantity;
    if (nextQty > p.rows[0].stock) return res.status(400).json({ message: 'Requested quantity exceeds available stock' });

    if (current.rowCount) {
      await pool.query('UPDATE cart_items SET quantity = $1 WHERE id = $2', [nextQty, current.rows[0].id]);
    } else {
      await pool.query('INSERT INTO cart_items (user_id, product_id, quantity) VALUES ($1, $2, $3)', [req.session.user.id, productId, quantity]);
    }
    res.status(201).json({ message: 'Added to cart' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not add to cart' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const quantity = Math.max(1, Number(req.body.quantity || 1));
    const result = await pool.query(
      `SELECT ci.id, p.stock FROM cart_items ci JOIN products p ON p.id = ci.product_id
       WHERE ci.id = $1 AND ci.user_id = $2`,
      [req.params.id, req.session.user.id]
    );
    if (!result.rowCount) return res.status(404).json({ message: 'Cart item not found' });
    if (quantity > result.rows[0].stock) return res.status(400).json({ message: 'Requested quantity exceeds available stock' });
    await pool.query('UPDATE cart_items SET quantity = $1 WHERE id = $2', [quantity, req.params.id]);
    res.json({ message: 'Cart updated' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not update cart' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM cart_items WHERE id = $1 AND user_id = $2', [req.params.id, req.session.user.id]);
    res.json({ message: 'Item removed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not remove item' });
  }
});

module.exports = router;
