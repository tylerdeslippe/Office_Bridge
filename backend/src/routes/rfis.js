const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate, authorizeProject } = require('../middleware/auth');

const router = express.Router();

// Get RFIs for a project
router.get('/project/:projectId', authenticate, async (req, res, next) => {
  try {
    const { status } = req.query;
    
    let query = `
      SELECT r.*, u.first_name || ' ' || u.last_name as submitted_by_name
      FROM rfis r
      LEFT JOIN users u ON r.submitted_by = u.id
      WHERE r.project_id = $1
    `;
    const params = [req.params.projectId];

    if (status) {
      query += ` AND r.status = $2`;
      params.push(status);
    }

    query += ' ORDER BY r.number DESC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get single RFI
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const rfiResult = await db.query(
      `SELECT r.*, 
              u.first_name || ' ' || u.last_name as submitted_by_name,
              p.name as project_name, p.number as project_number
       FROM rfis r
       LEFT JOIN users u ON r.submitted_by = u.id
       LEFT JOIN projects p ON r.project_id = p.id
       WHERE r.id = $1`,
      [req.params.id]
    );

    if (rfiResult.rows.length === 0) {
      return res.status(404).json({ error: 'RFI not found' });
    }

    // Get linked photos
    const photosResult = await db.query(
      `SELECT p.* FROM photos p
       JOIN photo_links pl ON p.id = pl.photo_id
       WHERE pl.entity_type = 'rfi' AND pl.entity_id = $1`,
      [req.params.id]
    );

    res.json({
      ...rfiResult.rows[0],
      photos: photosResult.rows
    });
  } catch (error) {
    next(error);
  }
});

// Create RFI
router.post('/', authenticate, [
  body('project_id').isUUID(),
  body('subject').trim().notEmpty(),
  body('question').trim().notEmpty()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      project_id, subject, question, location_description,
      drawing_reference, needed_to_proceed, date_required
    } = req.body;

    // Get next RFI number for project
    const countResult = await db.query(
      'SELECT COUNT(*) FROM rfis WHERE project_id = $1',
      [project_id]
    );
    const number = String(parseInt(countResult.rows[0].count) + 1).padStart(3, '0');

    const result = await db.query(
      `INSERT INTO rfis 
       (project_id, number, subject, question, location_description,
        drawing_reference, needed_to_proceed, date_required, submitted_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [project_id, number, subject, question, location_description,
       drawing_reference, needed_to_proceed, date_required, req.user.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Update RFI
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const {
      subject, question, location_description,
      drawing_reference, needed_to_proceed, date_required, status,
      answer, answered_by, answered_date
    } = req.body;

    const result = await db.query(
      `UPDATE rfis SET
       subject = COALESCE($1, subject),
       question = COALESCE($2, question),
       location_description = COALESCE($3, location_description),
       drawing_reference = COALESCE($4, drawing_reference),
       needed_to_proceed = COALESCE($5, needed_to_proceed),
       date_required = COALESCE($6, date_required),
       status = COALESCE($7, status),
       answer = COALESCE($8, answer),
       answered_by = COALESCE($9, answered_by),
       answered_date = COALESCE($10, answered_date)
       WHERE id = $11
       RETURNING *`,
      [subject, question, location_description,
       drawing_reference, needed_to_proceed, date_required, status,
       answer, answered_by, answered_date, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'RFI not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Send RFI to GC
router.post('/:id/send-to-gc', authenticate, async (req, res, next) => {
  try {
    const result = await db.query(
      `UPDATE rfis SET status = 'sent_to_gc' WHERE id = $1 AND status IN ('draft', 'open') RETURNING *`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'RFI not found or cannot be sent' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Answer RFI
router.post('/:id/answer', authenticate, [
  body('answer').trim().notEmpty(),
  body('answered_by').trim().notEmpty()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { answer, answered_by } = req.body;

    const result = await db.query(
      `UPDATE rfis SET 
       answer = $1, 
       answered_by = $2, 
       answered_date = CURRENT_DATE,
       status = 'answered'
       WHERE id = $3 
       RETURNING *`,
      [answer, answered_by, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'RFI not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Close RFI
router.post('/:id/close', authenticate, async (req, res, next) => {
  try {
    const result = await db.query(
      `UPDATE rfis SET status = 'closed' WHERE id = $1 AND status = 'answered' RETURNING *`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'RFI not found or not answered' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
