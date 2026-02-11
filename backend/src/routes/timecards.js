const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Get timecards for current user
router.get('/my-timecards', authenticate, async (req, res, next) => {
  try {
    const { startDate, endDate, status } = req.query;
    
    let query = `
      SELECT t.*, p.name as project_name, p.number as project_number
      FROM timecards t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.user_id = $1
    `;
    const params = [req.user.id];
    let paramIndex = 2;

    if (startDate) {
      query += ` AND t.work_date >= $${paramIndex++}`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND t.work_date <= $${paramIndex++}`;
      params.push(endDate);
    }
    if (status) {
      query += ` AND t.status = $${paramIndex++}`;
      params.push(status);
    }

    query += ' ORDER BY t.work_date DESC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get timecards for a project (for managers)
router.get('/project/:projectId', authenticate, async (req, res, next) => {
  try {
    const { startDate, endDate, status } = req.query;
    
    let query = `
      SELECT t.*, 
             u.first_name || ' ' || u.last_name as user_name
      FROM timecards t
      LEFT JOIN users u ON t.user_id = u.id
      WHERE t.project_id = $1
    `;
    const params = [req.params.projectId];
    let paramIndex = 2;

    if (startDate) {
      query += ` AND t.work_date >= $${paramIndex++}`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND t.work_date <= $${paramIndex++}`;
      params.push(endDate);
    }
    if (status) {
      query += ` AND t.status = $${paramIndex++}`;
      params.push(status);
    }

    query += ' ORDER BY t.work_date DESC, u.last_name';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get single timecard with entries
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const timecardResult = await db.query(
      `SELECT t.*, 
              p.name as project_name, p.number as project_number,
              u.first_name || ' ' || u.last_name as user_name
       FROM timecards t
       LEFT JOIN projects p ON t.project_id = p.id
       LEFT JOIN users u ON t.user_id = u.id
       WHERE t.id = $1`,
      [req.params.id]
    );

    if (timecardResult.rows.length === 0) {
      return res.status(404).json({ error: 'Timecard not found' });
    }

    // Get timecard entries
    const entriesResult = await db.query(
      `SELECT te.*, cc.code, cc.description as cost_code_description
       FROM timecard_entries te
       LEFT JOIN cost_codes cc ON te.cost_code_id = cc.id
       WHERE te.timecard_id = $1`,
      [req.params.id]
    );

    res.json({
      ...timecardResult.rows[0],
      entries: entriesResult.rows,
      total_hours: entriesResult.rows.reduce((sum, e) => sum + parseFloat(e.hours), 0),
      total_overtime: entriesResult.rows.reduce((sum, e) => sum + parseFloat(e.overtime_hours || 0), 0)
    });
  } catch (error) {
    next(error);
  }
});

// Create timecard
router.post('/', authenticate, [
  body('project_id').isUUID(),
  body('work_date').isDate(),
  body('user_id').optional().isUUID()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { project_id, work_date, user_id, notes } = req.body;
    
    // Use provided user_id or current user
    const targetUserId = user_id || req.user.id;

    // Check for existing timecard
    const existingResult = await db.query(
      'SELECT id FROM timecards WHERE project_id = $1 AND user_id = $2 AND work_date = $3',
      [project_id, targetUserId, work_date]
    );

    if (existingResult.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Timecard already exists for this date',
        existing_id: existingResult.rows[0].id
      });
    }

    const result = await db.query(
      `INSERT INTO timecards (project_id, user_id, work_date, submitted_by, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [project_id, targetUserId, work_date, req.user.id, notes]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Add time entry to timecard
router.post('/:id/entries', authenticate, [
  body('cost_code_id').isUUID(),
  body('hours').isFloat({ min: 0.25, max: 24 })
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Verify timecard is still editable
    const timecardResult = await db.query(
      'SELECT status FROM timecards WHERE id = $1',
      [req.params.id]
    );

    if (timecardResult.rows.length === 0) {
      return res.status(404).json({ error: 'Timecard not found' });
    }

    if (timecardResult.rows[0].status !== 'pending') {
      return res.status(400).json({ error: 'Timecard is already submitted' });
    }

    const { cost_code_id, hours, overtime_hours, description, area_location } = req.body;

    const result = await db.query(
      `INSERT INTO timecard_entries 
       (timecard_id, cost_code_id, hours, overtime_hours, description, area_location)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.params.id, cost_code_id, hours, overtime_hours || 0, description, area_location]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Update time entry
router.put('/entries/:entryId', authenticate, async (req, res, next) => {
  try {
    const { cost_code_id, hours, overtime_hours, description, area_location } = req.body;

    // Verify timecard is still editable
    const entryResult = await db.query(
      `SELECT t.status FROM timecard_entries te
       JOIN timecards t ON te.timecard_id = t.id
       WHERE te.id = $1`,
      [req.params.entryId]
    );

    if (entryResult.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    if (entryResult.rows[0].status !== 'pending') {
      return res.status(400).json({ error: 'Timecard is already submitted' });
    }

    const result = await db.query(
      `UPDATE timecard_entries SET
       cost_code_id = COALESCE($1, cost_code_id),
       hours = COALESCE($2, hours),
       overtime_hours = COALESCE($3, overtime_hours),
       description = COALESCE($4, description),
       area_location = COALESCE($5, area_location)
       WHERE id = $6
       RETURNING *`,
      [cost_code_id, hours, overtime_hours, description, area_location, req.params.entryId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Delete time entry
router.delete('/entries/:entryId', authenticate, async (req, res, next) => {
  try {
    // Verify timecard is still editable
    const entryResult = await db.query(
      `SELECT t.status FROM timecard_entries te
       JOIN timecards t ON te.timecard_id = t.id
       WHERE te.id = $1`,
      [req.params.entryId]
    );

    if (entryResult.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    if (entryResult.rows[0].status !== 'pending') {
      return res.status(400).json({ error: 'Timecard is already submitted' });
    }

    await db.query('DELETE FROM timecard_entries WHERE id = $1', [req.params.entryId]);
    res.json({ message: 'Entry deleted' });
  } catch (error) {
    next(error);
  }
});

// Submit timecard
router.post('/:id/submit', authenticate, async (req, res, next) => {
  try {
    // Verify timecard has at least one entry with a cost code (no misc)
    const entriesResult = await db.query(
      'SELECT COUNT(*) FROM timecard_entries WHERE timecard_id = $1 AND cost_code_id IS NOT NULL',
      [req.params.id]
    );

    if (parseInt(entriesResult.rows[0].count) === 0) {
      return res.status(400).json({ error: 'Timecard must have at least one entry with a cost code' });
    }

    const result = await db.query(
      `UPDATE timecards SET status = 'submitted' WHERE id = $1 AND status = 'pending' RETURNING *`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Timecard not found or already submitted' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Approve timecard
router.post('/:id/approve', authenticate, authorize('admin', 'project_manager', 'superintendent'), async (req, res, next) => {
  try {
    const result = await db.query(
      `UPDATE timecards 
       SET status = 'approved', approved_by = $1, approved_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND status = 'submitted'
       RETURNING *`,
      [req.user.id, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Timecard not found or not submitted' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Reject timecard
router.post('/:id/reject', authenticate, authorize('admin', 'project_manager', 'superintendent'), async (req, res, next) => {
  try {
    const { notes } = req.body;

    const result = await db.query(
      `UPDATE timecards 
       SET status = 'rejected', notes = COALESCE($1, notes)
       WHERE id = $2 AND status = 'submitted'
       RETURNING *`,
      [notes, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Timecard not found or not submitted' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Get labor summary by cost code for a project
router.get('/summary/project/:projectId', authenticate, async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    let query = `
      SELECT 
        cc.code,
        cc.description,
        cc.category,
        SUM(te.hours) as total_hours,
        SUM(te.overtime_hours) as total_overtime,
        COUNT(DISTINCT t.user_id) as worker_count
      FROM timecard_entries te
      JOIN timecards t ON te.timecard_id = t.id
      JOIN cost_codes cc ON te.cost_code_id = cc.id
      WHERE t.project_id = $1 AND t.status = 'approved'
    `;
    const params = [req.params.projectId];
    let paramIndex = 2;

    if (startDate) {
      query += ` AND t.work_date >= $${paramIndex++}`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND t.work_date <= $${paramIndex++}`;
      params.push(endDate);
    }

    query += ' GROUP BY cc.code, cc.description, cc.category ORDER BY cc.code';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
