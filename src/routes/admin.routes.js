const express = require('express');
const multer = require('multer');
const path = require('path');
const pool = require('../config/db');
const { requireAdmin } = require('../middleware/auth');
const { slugify } = require('../utils/helpers');

const router = express.Router();
router.use(requireAdmin);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(__dirname, '../../public/uploads')),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '-')}`)
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ['image/jpeg','image/png','image/webp','image/gif'].includes(file.mimetype);
    cb(ok ? null : new Error('Only JPG, PNG, WEBP or GIF images are allowed'), ok);
  }
});

router.get('/stats', async (_req, res) => {
  try {
    const [orders, customers, products, revenue] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS count FROM orders'),
      pool.query(`SELECT COUNT(*)::int AS count FROM users WHERE role='CUSTOMER'`),
      pool.query('SELECT COUNT(*)::int AS count FROM products'),
      pool.query(`SELECT COALESCE(SUM(total),0)::float AS total FROM orders WHERE status='DELIVERED'`)
    ]);
    res.json({ totalOrders: orders.rows[0].count, customers: customers.rows[0].count, products: products.rows[0].count, revenue: revenue.rows[0].total });
  } catch (error) { console.error(error); res.status(500).json({ message: 'Could not load stats' }); }
});

router.get('/products', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.id,p.name,p.slug,p.price::float,p.stock,p.featured,p.image_url AS "imageUrl",c.name AS "categoryName"
       FROM products p JOIN categories c ON c.id=p.category_id ORDER BY p.id DESC`
    );
    res.json(result.rows);
  } catch (error) { console.error(error); res.status(500).json({ message: 'Could not load products' }); }
});

router.post('/products', upload.single('image'), async (req, res) => {
  try {
    const { name, shortDescription, description, price, discountPercent, stock, categoryId, featured } = req.body;
    const slug = slugify(req.body.slug || name);
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : '/images/placeholder.svg';
    const result = await pool.query(
      `INSERT INTO products (name,slug,short_description,description,price,discount_percent,stock,featured,image_url,category_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
      [name, slug, shortDescription, description, Number(price), Number(discountPercent || 0), Number(stock || 0), featured === 'true', imageUrl, Number(categoryId)]
    );
    res.status(201).json({ id: result.rows[0].id, message: 'Product created' });
  } catch (error) {
    console.error(error);
    res.status(error.code === '23505' ? 409 : 500).json({ message: error.code === '23505' ? 'Product slug already exists' : 'Could not create product' });
  }
});

router.put('/products/:id', upload.single('image'), async (req, res) => {
  try {
    const existing = await pool.query('SELECT image_url FROM products WHERE id=$1', [req.params.id]);
    if (!existing.rowCount) return res.status(404).json({ message: 'Product not found' });
    const { name, shortDescription, description, price, discountPercent, stock, categoryId, featured } = req.body;
    const slug = slugify(req.body.slug || name);
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : existing.rows[0].image_url;
    await pool.query(
      `UPDATE products SET name=$1,slug=$2,short_description=$3,description=$4,price=$5,
       discount_percent=$6,stock=$7,featured=$8,image_url=$9,category_id=$10,updated_at=NOW() WHERE id=$11`,
      [name,slug,shortDescription,description,Number(price),Number(discountPercent||0),Number(stock||0),featured==='true',imageUrl,Number(categoryId),req.params.id]
    );
    res.json({ message: 'Product updated' });
  } catch (error) { console.error(error); res.status(500).json({ message: 'Could not update product' }); }
});

router.delete('/products/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM products WHERE id=$1', [req.params.id]);
    res.json({ message: 'Product deleted' });
  } catch (error) { console.error(error); res.status(400).json({ message: 'Product cannot be deleted because it is referenced by an order/cart' }); }
});

router.get('/orders', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.id,o.order_number AS "orderNumber",o.status,o.total::float,u.full_name AS "userName",o.created_at AS "createdAt"
       FROM orders o JOIN users u ON u.id=o.user_id ORDER BY o.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) { console.error(error); res.status(500).json({ message: 'Could not load orders' }); }
});

router.patch('/orders/:id/status', async (req, res) => {
  const client = await pool.connect();
  try {
    const allowed = ['CONFIRMED','PROCESSING','SHIPPED','DELIVERED','CANCELLED'];
    if (!allowed.includes(req.body.status)) return res.status(400).json({ message: 'Invalid status' });
    await client.query('BEGIN');
    const current = await client.query('SELECT status FROM orders WHERE id=$1 FOR UPDATE', [req.params.id]);
    if (!current.rowCount) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Order not found' }); }
    if (current.rows[0].status === 'CANCELLED' && req.body.status !== 'CANCELLED') throw new Error('Cancelled order cannot be reopened');
    if (current.rows[0].status === 'DELIVERED' && req.body.status === 'CANCELLED') throw new Error('Delivered order cannot be cancelled');

    if (req.body.status === 'CANCELLED' && current.rows[0].status !== 'CANCELLED') {
      const items = await client.query('SELECT product_id, quantity FROM order_items WHERE order_id=$1', [req.params.id]);
      for (const item of items.rows) await client.query('UPDATE products SET stock=stock+$1 WHERE id=$2', [item.quantity,item.product_id]);
    }
    await client.query('UPDATE orders SET status=$1,updated_at=NOW() WHERE id=$2', [req.body.status,req.params.id]);
    await client.query('COMMIT');
    res.json({ message: 'Order status updated' });
  } catch (error) {
    await client.query('ROLLBACK'); console.error(error); res.status(400).json({ message: error.message || 'Could not update status' });
  } finally { client.release(); }
});

module.exports = router;
