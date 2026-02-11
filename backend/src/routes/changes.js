const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// ==================== POTENTIAL CHANGES ====================

// Get potential changes for a project
router.get('/potential/project/:projectId', authenticate, async (req, res, next) => {
  try {
    const { status } = req.query;
    
    let query = `
      SELECT pc.*, u.first_name || ' ' || u.last_name as submitted_by_name
      FROM potential_changes pc
      LEFT JOIN users u ON pc.submitted_by = u.id
      WHERE pc.project_id = $1
    `;
    const params = [req.params.projectId];

    if (status) {
      query += ` AND pc.status = $2`;
      params.push(status);
    }

    query += ' ORDER BY pc.created_at DESC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get single potential change
router.get('/potential/:id', authenticate, async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT pc.*, 
              u.first_name || ' ' || u.last_name as submitted_by_name,
              p.name as project_name
       FROM potential_changes pc
       LEFT JOIN users u ON pc.submitted_by = u.id
       LEFT JOIN projects p ON pc.project_id = p.id
       WHERE pc.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Potential change not found' });
    }

    // Get linked photos
    const photosResult = await db.query(
      `SELECT p.* FROM photos p
       JOIN photo_links pl ON p.id = pl.photo_id
       WHERE pl.entity_type = 'change' AND pl.entity_id = $1`,
      [req.params.id]
    );

    res.json({
      ...result.rows[0],
      photos: photosResult.rows
    });
  } catch (error) {
    next(error);
  }
});

// Create potential change (field submission)
router.post('/potential', authenticate, [
  body('project_id').isUUID(),
  body('title').trim().notEmpty(),
  body('what_changed').trim().notEmpty()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      project_id, title, what_changed, why_changed,
      location_description, drawing_reference,
      time_impact_estimate, material_impact_estimate
    } = req.body;

    // Get next number for project
    const countResult = await db.query(
      'SELECT COUNT(*) FROM potential_changes WHERE project_id = $1',
      [project_id]
    );
    const number = `PC-${String(parseInt(countResult.rows[0].count) + 1).padStart(3, '0')}`;

    const result = await db.query(
      `INSERT INTO potential_changes 
       (project_id, number, title, what_changed, why_changed,
        location_description, drawing_reference,
        time_impact_estimate, material_impact_estimate, submitted_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [project_id, number, title, what_changed, why_changed,
       location_description, drawing_reference,
       time_impact_estimate, material_impact_estimate, req.user.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Update potential change status
router.put('/potential/:id', authenticate, async (req, res, next) => {
  try {
    const {
      title, what_changed, why_changed,
      location_description, drawing_reference,
      time_impact_estimate, material_impact_estimate, status
    } = req.body;

    const result = await db.query(
      `UPDATE potential_changes SET
       title = COALESCE($1, title),
       what_changed = COALESCE($2, what_changed),
       why_changed = COALESCE($3, why_changed),
       location_description = COALESCE($4, location_description),
       drawing_reference = COALESCE($5, drawing_reference),
       time_impact_estimate = COALESCE($6, time_impact_estimate),
       material_impact_estimate = COALESCE($7, material_impact_estimate),
       status = COALESCE($8, status)
       WHERE id = $9
       RETURNING *`,
      [title, what_changed, why_changed,
       location_description, drawing_reference,
       time_impact_estimate, material_impact_estimate, status, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Potential change not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// ==================== CHANGE ORDERS ====================

// Get change orders for a project
router.get('/orders/project/:projectId', authenticate, async (req, res, next) => {
  try {
    const { status } = req.query;
    
    let query = `
      SELECT co.*, u.first_name || ' ' || u.last_name as created_by_name
      FROM change_orders co
      LEFT JOIN users u ON co.created_by = u.id
      WHERE co.project_id = $1
    `;
    const params = [req.params.projectId];

    if (status) {
      query += ` AND co.status = $2`;
      params.push(status);
    }

    query += ' ORDER BY co.created_at DESC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get single change order
router.get('/orders/:id', authenticate, async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT co.*, 
              u.first_name || ' ' || u.last_name as created_by_name,
              p.name as project_name,
              pc.title as potential_change_title
       FROM change_orders co
       LEFT JOIN users u ON co.created_by = u.id
       LEFT JOIN projects p ON co.project_id = p.id
       LEFT JOIN potential_changes pc ON co.potential_change_id = pc.id
       WHERE co.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Change order not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Create change order (from potential change or standalone)
router.post('/orders', authenticate, authorize('admin', 'project_manager', 'project_engineer'), [
  body('project_id').isUUID(),
  body('title').trim().notEmpty()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      project_id, potential_change_id, title, description,
      cost_amount, schedule_impact_days, submitted_date
    } = req.body;

    // Get next number for project
    const countResult = await db.query(
      'SELECT COUNT(*) FROM change_orders WHERE project_id = $1',
      [project_id]
    );
    const number = `CO-${String(parseInt(countResult.rows[0].count) + 1).padStart(3, '0')}`;

    const result = await db.query(
      `INSERT INTO change_orders 
       (project_id, potential_change_id, number, title, description,
        cost_amount, schedule_impact_days, submitted_date, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [project_id, potential_change_id, number, title, description,
       cost_amount, schedule_impact_days, submitted_date, req.user.id]
    );

    // Update potential change status if linked
    if (potential_change_id) {
      await db.query(
        `UPDATE potential_changes SET status = 'priced' WHERE id = $1`,
        [potential_change_id]
      );
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Update change order
router.put('/orders/:id', authenticate, async (req, res, next) => {
  try {
    const {
      title, description, cost_amount, schedule_impact_days,
      submitted_date, status, approved_date, approved_amount
    } = req.body;

    const result = await db.query(
      `UPDATE change_orders SET
       title = COALESCE($1, title),
       description = COALESCE($2, description),
       cost_amount = COALESCE($3, cost_amount),
       schedule_impact_days = COALESCE($4, schedule_impact_days),
       submitted_date = COALESCE($5, submitted_date),
       status = COALESCE($6, status),
       approved_date = COALESCE($7, approved_date),
       approved_amount = COALESCE($8, approved_amount)
       WHERE id = $9
       RETURNING *`,
      [title, description, cost_amount, schedule_impact_days,
       submitted_date, status, approved_date, approved_amount, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Change order not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Submit change order to GC
router.post('/orders/:id/submit', authenticate, async (req, res, next) => {
  try {
    const result = await db.query(
      `UPDATE change_orders 
       SET status = 'submitted', submitted_date = COALESCE(submitted_date, CURRENT_DATE)
       WHERE id = $1 AND status = 'pending' 
       RETURNING *`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Change order not found or already submitted' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Approve change order
router.post('/orders/:id/approve', authenticate, authorize('admin', 'project_manager'), [
  body('approved_amount').isDecimal()
], async (req, res, next) => {
  try {
    const { approved_amount } = req.body;

    const result = await db.query(
      `UPDATE change_orders 
       SET status = 'approved', approved_date = CURRENT_DATE, approved_amount = $1
       WHERE id = $2 AND status = 'submitted' 
       RETURNING *`,
      [approved_amount, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Change order not found or not submitted' });
    }

    // Update linked potential change
    if (result.rows[0].potential_change_id) {
      await db.query(
        `UPDATE potential_changes SET status = 'approved' WHERE id = $1`,
        [result.rows[0].potential_change_id]
      );
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
