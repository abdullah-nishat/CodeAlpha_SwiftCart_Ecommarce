const express = require('express');
const pool = require('../config/db');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(50, Math.max(1, Number(req.query.limit || 12)));
    const offset = (page - 1) * limit;
    const values = [];
    const where = [];

    if (req.query.search) {
      values.push(`%${req.query.search.trim()}%`);
      where.push(`(p.name ILIKE $${values.length} OR p.short_description ILIKE $${values.length})`);
    }
    if (req.query.category) {
      values.push(req.query.category);
      where.push(`c.slug = $${values.length}`);
    }
    if (req.query.minPrice) {
      values.push(Number(req.query.minPrice));
      where.push(`p.price >= $${values.length}`);
    }
    if (req.query.maxPrice) {
      values.push(Number(req.query.maxPrice));
      where.push(`p.price <= $${values.length}`);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const sortMap = {
      newest: 'p.created_at DESC',
      price_asc: '(p.price * (1 - p.discount_percent::numeric / 100)) ASC',
      price_desc: '(p.price * (1 - p.discount_percent::numeric / 100)) DESC',
      rating: 'p.rating DESC',
      name_asc: 'p.name ASC',
      name_desc: 'p.name DESC'
    };
    const orderBy = sortMap[req.query.sort] || sortMap.newest;

    const count = await pool.query(
      `SELECT COUNT(*)::int AS total FROM products p JOIN categories c ON c.id = p.category_id ${whereSql}`,
      values
    );
    const listValues = [...values, limit, offset];
    const result = await pool.query(
      `SELECT p.id, p.name, p.slug, p.short_description AS "shortDescription", p.description,
              p.price::float, p.discount_percent AS "discountPercent", p.stock, p.featured,
              p.rating::float, p.review_count AS "reviewCount", p.image_url AS "imageUrl",
              c.id AS "categoryId", c.name AS "categoryName", c.slug AS "categorySlug"
       FROM products p JOIN categories c ON c.id = p.category_id
       ${whereSql}
       ORDER BY ${orderBy}
       LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      listValues
    );

    const total = count.rows[0].total;
    res.json({ items: result.rows, page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not load products' });
  }
});

router.get('/featured/list', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.id, p.name, p.slug, p.short_description AS "shortDescription", p.price::float,
              p.discount_percent AS "discountPercent", p.stock, p.rating::float,
              p.image_url AS "imageUrl", c.name AS "categoryName"
       FROM products p JOIN categories c ON c.id = p.category_id
       WHERE p.featured = true ORDER BY p.created_at DESC LIMIT 8`
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not load featured products' });
  }
});

router.get('/:slug', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.id, p.name, p.slug, p.short_description AS "shortDescription", p.description,
              p.price::float, p.discount_percent AS "discountPercent", p.stock, p.featured,
              p.rating::float, p.review_count AS "reviewCount", p.image_url AS "imageUrl",
              c.id AS "categoryId", c.name AS "categoryName", c.slug AS "categorySlug"
       FROM products p JOIN categories c ON c.id = p.category_id WHERE p.slug = $1`,
      [req.params.slug]
    );
    if (!result.rowCount) return res.status(404).json({ message: 'Product not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not load product' });
  }
});

module.exports = router;
