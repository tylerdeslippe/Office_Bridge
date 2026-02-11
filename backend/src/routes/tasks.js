const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Get tasks assigned to current user
router.get('/my-tasks', authenticate, async (req, res, next) => {
  try {
    const { status, priority } = req.query;
    
    let query = `
      SELECT t.*, 
             p.name as project_name, p.number as project_number,
             ab.first_name || ' ' || ab.last_name as assigned_by_name
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN users ab ON t.assigned_by = ab.id
      WHERE t.assigned_to = $1
    `;
    const params = [req.user.id];
    let paramIndex = 2;

    if (status) {
      query += ` AND t.status = $${paramIndex++}`;
      params.push(status);
    }
    if (priority) {
      query += ` AND t.priority = $${paramIndex++}`;
      params.push(priority);
    }

    query += ' ORDER BY t.due_date ASC NULLS LAST, t.priority DESC, t.created_at DESC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get tasks assigned by current user
router.get('/assigned-by-me', authenticate, async (req, res, next) => {
  try {
    const { status } = req.query;
    
    let query = `
      SELECT t.*, 
             p.name as project_name,
             at.first_name || ' ' || at.last_name as assigned_to_name
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN users at ON t.assigned_to = at.id
      WHERE t.assigned_by = $1
    `;
    const params = [req.user.id];

    if (status) {
      query += ` AND t.status = $2`;
      params.push(status);
    }

    query += ' ORDER BY t.created_at DESC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get tasks for a project
router.get('/project/:projectId', authenticate, async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT t.*, 
              at.first_name || ' ' || at.last_name as assigned_to_name,
              ab.first_name || ' ' || ab.last_name as assigned_by_name
       FROM tasks t
       LEFT JOIN users at ON t.assigned_to = at.id
       LEFT JOIN users ab ON t.assigned_by = ab.id
       WHERE t.project_id = $1
       ORDER BY t.status, t.due_date ASC NULLS LAST`,
      [req.params.projectId]
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get single task
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT t.*, 
              p.name as project_name,
              at.first_name || ' ' || at.last_name as assigned_to_name,
              ab.first_name || ' ' || ab.last_name as assigned_by_name
       FROM tasks t
       LEFT JOIN projects p ON t.project_id = p.id
       LEFT JOIN users at ON t.assigned_to = at.id
       LEFT JOIN users ab ON t.assigned_by = ab.id
       WHERE t.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Create task (assign to someone)
router.post('/', authenticate, [
  body('title').trim().notEmpty(),
  body('assigned_to').isUUID()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if user can assign tasks (managers and above)
    const canAssign = ['admin', 'project_manager', 'superintendent', 'project_engineer'].includes(req.user.role);
    if (!canAssign) {
      return res.status(403).json({ error: 'You do not have permission to assign tasks' });
    }

    const {
      project_id, title, description, assigned_to,
      due_date, priority, category, related_entity_type, related_entity_id
    } = req.body;

    const result = await db.query(
      `INSERT INTO tasks 
       (project_id, title, description, assigned_to, assigned_by,
        due_date, priority, category, related_entity_type, related_entity_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [project_id, title, description, assigned_to, req.user.id,
       due_date, priority || 'medium', category, related_entity_type, related_entity_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Update task
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const {
      title, description, due_date, priority, status, category
    } = req.body;

    const result = await db.query(
      `UPDATE tasks SET
       title = COALESCE($1, title),
       description = COALESCE($2, description),
       due_date = COALESCE($3, due_date),
       priority = COALESCE($4, priority),
       status = COALESCE($5, status),
       category = COALESCE($6, category)
       WHERE id = $7
       RETURNING *`,
      [title, description, due_date, priority, status, category, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Acknowledge task
router.post('/:id/acknowledge', authenticate, async (req, res, next) => {
  try {
    // Verify user is the assignee
    const taskResult = await db.query(
      'SELECT assigned_to FROM tasks WHERE id = $1',
      [req.params.id]
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (taskResult.rows[0].assigned_to !== req.user.id) {
      return res.status(403).json({ error: 'Only the assignee can acknowledge this task' });
    }

    const result = await db.query(
      `UPDATE tasks 
       SET status = 'acknowledged', acknowledged_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND status = 'pending'
       RETURNING *`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Task not found or already acknowledged' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Start working on task
router.post('/:id/start', authenticate, async (req, res, next) => {
  try {
    const result = await db.query(
      `UPDATE tasks 
       SET status = 'in_progress'
       WHERE id = $1 AND assigned_to = $2 AND status IN ('pending', 'acknowledged')
       RETURNING *`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Task not found or cannot be started' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Complete task
router.post('/:id/complete', authenticate, async (req, res, next) => {
  try {
    const result = await db.query(
      `UPDATE tasks 
       SET status = 'completed', completed_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND assigned_to = $2 AND status IN ('acknowledged', 'in_progress')
       RETURNING *`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Task not found or cannot be completed' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Cancel task (only by assigner or admin)
router.post('/:id/cancel', authenticate, async (req, res, next) => {
  try {
    const taskResult = await db.query(
      'SELECT assigned_by FROM tasks WHERE id = $1',
      [req.params.id]
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (taskResult.rows[0].assigned_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the assigner or admin can cancel this task' });
    }

    const result = await db.query(
      `UPDATE tasks SET status = 'cancelled' WHERE id = $1 RETURNING *`,
      [req.params.id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Get task statistics for a user
router.get('/stats/:userId', authenticate, async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT 
         status,
         COUNT(*) as count
       FROM tasks
       WHERE assigned_to = $1
       GROUP BY status`,
      [req.params.userId]
    );

    const stats = {
      pending: 0,
      acknowledged: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0
    };

    result.rows.forEach(row => {
      stats[row.status] = parseInt(row.count);
    });

    res.json(stats);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
