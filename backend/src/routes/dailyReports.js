const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate, authorizeProject } = require('../middleware/auth');

const router = express.Router();

// Get daily reports for a project
router.get('/project/:projectId', authenticate, async (req, res, next) => {
  try {
    const { startDate, endDate, status } = req.query;
    
    let query = `
      SELECT dr.*, u.first_name || ' ' || u.last_name as submitted_by_name
      FROM daily_reports dr
      LEFT JOIN users u ON dr.submitted_by = u.id
      WHERE dr.project_id = $1
    `;
    const params = [req.params.projectId];
    let paramIndex = 2;

    if (startDate) {
      query += ` AND dr.report_date >= $${paramIndex++}`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND dr.report_date <= $${paramIndex++}`;
      params.push(endDate);
    }
    if (status) {
      query += ` AND dr.status = $${paramIndex++}`;
      params.push(status);
    }

    query += ' ORDER BY dr.report_date DESC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get single daily report with all details
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const reportResult = await db.query(
      `SELECT dr.*, 
              u.first_name || ' ' || u.last_name as submitted_by_name,
              p.name as project_name, p.number as project_number
       FROM daily_reports dr
       LEFT JOIN users u ON dr.submitted_by = u.id
       LEFT JOIN projects p ON dr.project_id = p.id
       WHERE dr.id = $1`,
      [req.params.id]
    );

    if (reportResult.rows.length === 0) {
      return res.status(404).json({ error: 'Daily report not found' });
    }

    const report = reportResult.rows[0];

    // Get crew counts
    const crewResult = await db.query(
      `SELECT drc.*, cc.code, cc.description as cost_code_description
       FROM daily_report_crew drc
       LEFT JOIN cost_codes cc ON drc.cost_code_id = cc.id
       WHERE drc.daily_report_id = $1`,
      [req.params.id]
    );

    // Get work installed
    const workResult = await db.query(
      `SELECT drw.*, cc.code, cc.description as cost_code_description
       FROM daily_report_work drw
       LEFT JOIN cost_codes cc ON drw.cost_code_id = cc.id
       WHERE drw.daily_report_id = $1`,
      [req.params.id]
    );

    // Get deliveries
    const deliveriesResult = await db.query(
      'SELECT * FROM daily_report_deliveries WHERE daily_report_id = $1',
      [req.params.id]
    );

    // Get linked photos
    const photosResult = await db.query(
      `SELECT p.* FROM photos p
       JOIN photo_links pl ON p.id = pl.photo_id
       WHERE pl.entity_type = 'daily_report' AND pl.entity_id = $1`,
      [req.params.id]
    );

    res.json({
      ...report,
      crew: crewResult.rows,
      work: workResult.rows,
      deliveries: deliveriesResult.rows,
      photos: photosResult.rows
    });
  } catch (error) {
    next(error);
  }
});

// Create daily report
router.post('/', authenticate, [
  body('project_id').isUUID(),
  body('report_date').isDate()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      project_id, report_date, weather, temperature_high, temperature_low,
      work_summary, delays_constraints, safety_incidents, visitor_log
    } = req.body;

    const result = await db.query(
      `INSERT INTO daily_reports 
       (project_id, report_date, weather, temperature_high, temperature_low,
        work_summary, delays_constraints, safety_incidents, visitor_log, submitted_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [project_id, report_date, weather, temperature_high, temperature_low,
       work_summary, delays_constraints, safety_incidents, visitor_log, req.user.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Daily report already exists for this date' });
    }
    next(error);
  }
});

// Update daily report
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const {
      weather, temperature_high, temperature_low,
      work_summary, delays_constraints, safety_incidents, visitor_log, status
    } = req.body;

    const result = await db.query(
      `UPDATE daily_reports SET
       weather = COALESCE($1, weather),
       temperature_high = COALESCE($2, temperature_high),
       temperature_low = COALESCE($3, temperature_low),
       work_summary = COALESCE($4, work_summary),
       delays_constraints = COALESCE($5, delays_constraints),
       safety_incidents = COALESCE($6, safety_incidents),
       visitor_log = COALESCE($7, visitor_log),
       status = COALESCE($8, status)
       WHERE id = $9
       RETURNING *`,
      [weather, temperature_high, temperature_low,
       work_summary, delays_constraints, safety_incidents, visitor_log, status, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Daily report not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Add crew entry
router.post('/:id/crew', authenticate, [
  body('trade').trim().notEmpty(),
  body('headcount').isInt({ min: 1 })
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { trade, headcount, hours_worked, cost_code_id, notes } = req.body;

    const result = await db.query(
      `INSERT INTO daily_report_crew 
       (daily_report_id, trade, headcount, hours_worked, cost_code_id, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.params.id, trade, headcount, hours_worked, cost_code_id, notes]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Add work installed entry
router.post('/:id/work', authenticate, [
  body('description').trim().notEmpty()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { cost_code_id, description, quantity, unit, area_location } = req.body;

    const result = await db.query(
      `INSERT INTO daily_report_work 
       (daily_report_id, cost_code_id, description, quantity, unit, area_location)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.params.id, cost_code_id, description, quantity, unit, area_location]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Add delivery entry
router.post('/:id/deliveries', authenticate, [
  body('description').trim().notEmpty()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { supplier, description, received_complete, issues, packing_slip_photo_id } = req.body;

    const result = await db.query(
      `INSERT INTO daily_report_deliveries 
       (daily_report_id, supplier, description, received_complete, issues, packing_slip_photo_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.params.id, supplier, description, received_complete, issues, packing_slip_photo_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Submit daily report
router.post('/:id/submit', authenticate, async (req, res, next) => {
  try {
    const result = await db.query(
      `UPDATE daily_reports SET status = 'submitted' WHERE id = $1 AND status = 'draft' RETURNING *`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Report not found or already submitted' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Approve daily report
router.post('/:id/approve', authenticate, async (req, res, next) => {
  try {
    const result = await db.query(
      `UPDATE daily_reports 
       SET status = 'approved', approved_by = $1, approved_at = CURRENT_TIMESTAMP 
       WHERE id = $2 AND status = 'submitted' 
       RETURNING *`,
      [req.user.id, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Report not found or not submitted' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
