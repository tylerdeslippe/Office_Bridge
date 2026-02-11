const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate, authorize, authorizeProject } = require('../middleware/auth');

const router = express.Router();

// Get all projects (filtered by user access)
router.get('/', authenticate, async (req, res, next) => {
  try {
    let query;
    let params = [];

    if (req.user.role === 'admin') {
      query = `SELECT * FROM projects ORDER BY created_at DESC`;
    } else {
      query = `
        SELECT p.* FROM projects p
        JOIN project_team pt ON p.id = pt.project_id
        WHERE pt.user_id = $1
        ORDER BY p.created_at DESC
      `;
      params = [req.user.id];
    }

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get project by ID
router.get('/:id', authenticate, authorizeProject, async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM projects WHERE id = $1', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Get team members
    const teamResult = await db.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.role, pt.role_on_project
       FROM users u
       JOIN project_team pt ON u.id = pt.user_id
       WHERE pt.project_id = $1`,
      [req.params.id]
    );

    res.json({
      ...result.rows[0],
      team: teamResult.rows
    });
  } catch (error) {
    next(error);
  }
});

// Create project
router.post('/', authenticate, authorize('admin', 'project_manager'), [
  body('name').trim().notEmpty(),
  body('number').trim().notEmpty()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      name, number, description, client_name, address, city, state, zip,
      project_type, start_date, end_date, contract_value
    } = req.body;

    const result = await db.query(
      `INSERT INTO projects 
       (name, number, description, client_name, address, city, state, zip,
        project_type, start_date, end_date, contract_value, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [name, number, description, client_name, address, city, state, zip,
       project_type, start_date, end_date, contract_value, req.user.id]
    );

    // Add creator to project team
    await db.query(
      `INSERT INTO project_team (project_id, user_id, role_on_project)
       VALUES ($1, $2, $3)`,
      [result.rows[0].id, req.user.id, req.user.role]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Project number already exists' });
    }
    next(error);
  }
});

// Update project
router.put('/:id', authenticate, authorize('admin', 'project_manager'), authorizeProject, [
  body('name').optional().trim().notEmpty(),
  body('status').optional().isIn(['active', 'on_hold', 'completed', 'cancelled'])
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      name, description, client_name, address, city, state, zip,
      project_type, status, start_date, end_date, contract_value
    } = req.body;

    const result = await db.query(
      `UPDATE projects SET
       name = COALESCE($1, name),
       description = COALESCE($2, description),
       client_name = COALESCE($3, client_name),
       address = COALESCE($4, address),
       city = COALESCE($5, city),
       state = COALESCE($6, state),
       zip = COALESCE($7, zip),
       project_type = COALESCE($8, project_type),
       status = COALESCE($9, status),
       start_date = COALESCE($10, start_date),
       end_date = COALESCE($11, end_date),
       contract_value = COALESCE($12, contract_value)
       WHERE id = $13
       RETURNING *`,
      [name, description, client_name, address, city, state, zip,
       project_type, status, start_date, end_date, contract_value, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Add team member to project
router.post('/:id/team', authenticate, authorize('admin', 'project_manager'), authorizeProject, [
  body('user_id').isUUID(),
  body('role_on_project').optional().trim()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { user_id, role_on_project } = req.body;

    const result = await db.query(
      `INSERT INTO project_team (project_id, user_id, role_on_project)
       VALUES ($1, $2, $3)
       ON CONFLICT (project_id, user_id) DO UPDATE SET role_on_project = $3
       RETURNING *`,
      [req.params.id, user_id, role_on_project]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Remove team member from project
router.delete('/:id/team/:userId', authenticate, authorize('admin', 'project_manager'), authorizeProject, async (req, res, next) => {
  try {
    await db.query(
      'DELETE FROM project_team WHERE project_id = $1 AND user_id = $2',
      [req.params.id, req.params.userId]
    );
    res.json({ message: 'Team member removed' });
  } catch (error) {
    next(error);
  }
});

// Get project cost codes
router.get('/:id/cost-codes', authenticate, authorizeProject, async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT * FROM cost_codes WHERE is_active = true ORDER BY code'
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
