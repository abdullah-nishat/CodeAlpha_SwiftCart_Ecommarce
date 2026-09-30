const express = require('express');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.post('/checkout', async (req, res) => {
  const client = await pool.connect();
  try {
    const { customerName, email, phone, address, city, postcode, note } = req.body;
    if (!customerName || !email || !phone || !address || !city || !postcode) {
      return res.status(400).json({ message: 'Please complete all required checkout fields' });
    }

    await client.query('BEGIN');
    const cart = await client.query(
      `SELECT ci.quantity, p.id AS product_id, p.name, p.price::float, p.discount_percent,
              p.stock, p.image_url
       FROM cart_items ci JOIN products p ON p.id = ci.product_id
       WHERE ci.user_id = $1 FOR UPDATE OF p`,
      [req.session.user.id]
    );
    if (!cart.rowCount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Your cart is empty' });
    }

    let subtotal = 0;
    for (const item of cart.rows) {
      if (item.quantity > item.stock) throw new Error(`${item.name} has only ${item.stock} item(s) left`);
      const unitPrice = Number((item.price * (1 - item.discount_percent / 100)).toFixed(2));
      subtotal += unitPrice * item.quantity;
    }
    subtotal = Number(subtotal.toFixed(2));
    const shippingFee = subtotal >= 3000 ? 0 : 80;
    const total = Number((subtotal + shippingFee).toFixed(2));
    const orderNumber = `SC-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Date.now().toString().slice(-6)}`;

    const order = await client.query(
      `INSERT INTO orders (order_number, user_id, status, subtotal, shipping_fee, total,
                           customer_name, email, phone, address, city, postcode, note)
       VALUES ($1,$2,'CONFIRMED',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING id, order_number AS "orderNumber", status, total::float`,
      [orderNumber, req.session.user.id, subtotal, shippingFee, total,
       customerName.trim(), email.trim().toLowerCase(), phone.trim(), address.trim(), city.trim(), postcode.trim(), note?.trim() || null]
    );

    for (const item of cart.rows) {
      const unitPrice = Number((item.price * (1 - item.discount_percent / 100)).toFixed(2));
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, image_url)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [order.rows[0].id, item.product_id, item.name, unitPrice, item.quantity, item.image_url]
      );
      await client.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [item.quantity, item.product_id]);
    }
    await client.query('DELETE FROM cart_items WHERE user_id = $1', [req.session.user.id]);
    await client.query('COMMIT');
    res.status(201).json({ order: order.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(400).json({ message: error.message || 'Checkout failed' });
  } finally {
    client.release();
  }
});

router.get('/mine', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, order_number AS "orderNumber", status, subtotal::float,
              shipping_fee::float AS "shippingFee", total::float,
              customer_name AS "customerName", created_at AS "createdAt"
       FROM orders WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.session.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error); res.status(500).json({ message: 'Could not load orders' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const order = await pool.query(
      `SELECT id, order_number AS "orderNumber", status, subtotal::float,
              shipping_fee::float AS "shippingFee", total::float,
              customer_name AS "customerName", email, phone, address, city, postcode, note, created_at AS "createdAt"
       FROM orders WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.session.user.id]
    );
    if (!order.rowCount) return res.status(404).json({ message: 'Order not found' });
    const items = await pool.query(
      `SELECT product_id AS "productId", product_name AS "productName", unit_price::float AS "unitPrice", quantity, image_url AS "imageUrl"
       FROM order_items WHERE order_id = $1`, [req.params.id]
    );
    res.json({ ...order.rows[0], items: items.rows });
  } catch (error) {
    console.error(error); res.status(500).json({ message: 'Could not load order' });
  }
});

module.exports = router;
