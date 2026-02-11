const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { upload, setUploadType } = require('../middleware/upload');

const router = express.Router();

// Get documents for a project
router.get('/project/:projectId', authenticate, async (req, res, next) => {
  try {
    const { document_type, discipline, current_only } = req.query;
    
    let query = `
      SELECT d.*, u.first_name || ' ' || u.last_name as uploaded_by_name
      FROM documents d
      LEFT JOIN users u ON d.uploaded_by = u.id
      WHERE d.project_id = $1
    `;
    const params = [req.params.projectId];
    let paramIndex = 2;

    if (document_type) {
      query += ` AND d.document_type = $${paramIndex++}`;
      params.push(document_type);
    }
    if (discipline) {
      query += ` AND d.discipline = $${paramIndex++}`;
      params.push(discipline);
    }
    if (current_only === 'true') {
      query += ` AND d.is_current = true`;
    }

    query += ' ORDER BY d.document_type, d.document_number, d.revision DESC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get single document with history
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const docResult = await db.query(
      `SELECT d.*, 
              u.first_name || ' ' || u.last_name as uploaded_by_name,
              p.name as project_name
       FROM documents d
       LEFT JOIN users u ON d.uploaded_by = u.id
       LEFT JOIN projects p ON d.project_id = p.id
       WHERE d.id = $1`,
      [req.params.id]
    );

    if (docResult.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const document = docResult.rows[0];

    // Get revision history
    const historyResult = await db.query(
      `SELECT d.*, u.first_name || ' ' || u.last_name as uploaded_by_name
       FROM documents d
       LEFT JOIN users u ON d.uploaded_by = u.id
       WHERE d.document_number = $1 AND d.project_id = $2
       ORDER BY d.created_at DESC`,
      [document.document_number, document.project_id]
    );

    // Get redlines
    const redlinesResult = await db.query(
      `SELECT dr.*, u.first_name || ' ' || u.last_name as created_by_name
       FROM document_redlines dr
       LEFT JOIN users u ON dr.created_by = u.id
       WHERE dr.document_id = $1
       ORDER BY dr.created_at DESC`,
      [req.params.id]
    );

    res.json({
      ...document,
      revision_history: historyResult.rows,
      redlines: redlinesResult.rows
    });
  } catch (error) {
    next(error);
  }
});

// Upload document
router.post('/', authenticate, setUploadType('documents'), upload.single('file'), async (req, res, next) => {
  try {
    const {
      project_id, document_type, title, document_number,
      revision, description, discipline
    } = req.body;

    let file_path = null;
    let original_filename = null;
    let file_size = null;
    let mime_type = null;

    if (req.file) {
      file_path = `/uploads/documents/${req.file.filename}`;
      original_filename = req.file.originalname;
      file_size = req.file.size;
      mime_type = req.file.mimetype;
    }

    // Check if this is a revision of existing document
    if (document_number) {
      // Mark previous version as not current
      await db.query(
        `UPDATE documents SET is_current = false 
         WHERE project_id = $1 AND document_number = $2 AND is_current = true`,
        [project_id, document_number]
      );
    }

    const result = await db.query(
      `INSERT INTO documents 
       (project_id, document_type, title, document_number, revision,
        description, file_path, original_filename, file_size, mime_type,
        discipline, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [project_id, document_type, title, document_number,
       revision || 'A', description, file_path, original_filename,
       file_size, mime_type, discipline, req.user.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Upload new revision
router.post('/:id/revision', authenticate, setUploadType('documents'), upload.single('file'), async (req, res, next) => {
  try {
    // Get existing document
    const existingResult = await db.query(
      'SELECT * FROM documents WHERE id = $1',
      [req.params.id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const existing = existingResult.rows[0];
    const { revision, description } = req.body;

    if (!revision) {
      return res.status(400).json({ error: 'Revision is required' });
    }

    let file_path = null;
    let original_filename = null;
    let file_size = null;
    let mime_type = null;

    if (req.file) {
      file_path = `/uploads/documents/${req.file.filename}`;
      original_filename = req.file.originalname;
      file_size = req.file.size;
      mime_type = req.file.mimetype;
    }

    // Mark current as not current
    await db.query(
      'UPDATE documents SET is_current = false WHERE id = $1',
      [req.params.id]
    );

    // Create new revision
    const result = await db.query(
      `INSERT INTO documents 
       (project_id, document_type, title, document_number, revision,
        description, file_path, original_filename, file_size, mime_type,
        discipline, uploaded_by, supersedes_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [existing.project_id, existing.document_type, existing.title,
       existing.document_number, revision, description || existing.description,
       file_path, original_filename, file_size, mime_type,
       existing.discipline, req.user.id, existing.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Update document metadata
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const { title, description, discipline } = req.body;

    const result = await db.query(
      `UPDATE documents SET
       title = COALESCE($1, title),
       description = COALESCE($2, description),
       discipline = COALESCE($3, discipline)
       WHERE id = $4
       RETURNING *`,
      [title, description, discipline, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Add redline to document
router.post('/:id/redlines', authenticate, [
  body('redline_data').isObject()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { redline_data, description } = req.body;

    const result = await db.query(
      `INSERT INTO document_redlines (document_id, redline_data, description, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.params.id, JSON.stringify(redline_data), description, req.user.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Update redline status
router.put('/redlines/:redlineId', authenticate, async (req, res, next) => {
  try {
    const { status } = req.body;

    const result = await db.query(
      `UPDATE document_redlines SET status = $1 WHERE id = $2 RETURNING *`,
      [status, req.params.redlineId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Redline not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Get drawings by discipline
router.get('/drawings/project/:projectId', authenticate, async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT discipline, 
              COUNT(*) as count,
              json_agg(json_build_object(
                'id', id,
                'title', title,
                'document_number', document_number,
                'revision', revision,
                'is_current', is_current
              ) ORDER BY document_number) as documents
       FROM documents 
       WHERE project_id = $1 AND document_type = 'drawing' AND is_current = true
       GROUP BY discipline
       ORDER BY discipline`,
      [req.params.projectId]
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get scope sheets for a project
router.get('/scope-sheets/project/:projectId', authenticate, async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT d.*, u.first_name || ' ' || u.last_name as uploaded_by_name
       FROM documents d
       LEFT JOIN users u ON d.uploaded_by = u.id
       WHERE d.project_id = $1 AND d.document_type = 'scope_sheet' AND d.is_current = true
       ORDER BY d.created_at DESC`,
      [req.params.projectId]
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
