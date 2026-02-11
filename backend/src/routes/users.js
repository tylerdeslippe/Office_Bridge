const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Get all users (admin/PM only)
router.get('/', authenticate, authorize('admin', 'project_manager'), async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT id, email, first_name, last_name, phone, role, is_active, created_at
       FROM users ORDER BY last_name, first_name`
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get user by ID
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT id, email, first_name, last_name, phone, role, is_active, created_at
       FROM users WHERE id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Update user
router.put('/:id', authenticate, [
  body('first_name').optional().trim().notEmpty(),
  body('last_name').optional().trim().notEmpty(),
  body('phone').optional().trim(),
  body('role').optional().isIn([
    'admin', 'project_manager', 'superintendent', 'foreman', 
    'project_engineer', 'accounting', 'logistics', 
    'document_controller', 'service_dispatcher'
  ])
], async (req, res, next) => {
  try {
    // Users can update themselves, admins can update anyone
    if (req.user.id !== req.params.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { first_name, last_name, phone, role } = req.body;
    
    // Only admins can change roles
    const updateRole = req.user.role === 'admin' ? role : undefined;

    const result = await db.query(
      `UPDATE users 
       SET first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           phone = COALESCE($3, phone),
           role = COALESCE($4, role)
       WHERE id = $5
       RETURNING id, email, first_name, last_name, phone, role, is_active`,
      [first_name, last_name, phone, updateRole, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Deactivate user (admin only)
router.post('/:id/deactivate', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const result = await db.query(
      'UPDATE users SET is_active = false WHERE id = $1 RETURNING id, email, is_active',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deactivated', user: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Get users by role
router.get('/role/:role', authenticate, async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT id, email, first_name, last_name, phone, role
       FROM users WHERE role = $1 AND is_active = true
       ORDER BY last_name, first_name`,
      [req.params.role]
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
