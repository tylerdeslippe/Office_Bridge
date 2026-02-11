const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate, authorizeProject } = require('../middleware/auth');
const { upload, setUploadType } = require('../middleware/upload');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

const router = express.Router();

// Get photos for a project
router.get('/project/:projectId', authenticate, async (req, res, next) => {
  try {
    const { category, startDate, endDate, area } = req.query;
    
    let query = `
      SELECT p.*, u.first_name || ' ' || u.last_name as taken_by_name
      FROM photos p
      LEFT JOIN users u ON p.taken_by = u.id
      WHERE p.project_id = $1
    `;
    const params = [req.params.projectId];
    let paramIndex = 2;

    if (category) {
      query += ` AND p.category = $${paramIndex++}`;
      params.push(category);
    }
    if (startDate) {
      query += ` AND p.taken_date >= $${paramIndex++}`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND p.taken_date <= $${paramIndex++}`;
      params.push(endDate);
    }
    if (area) {
      query += ` AND p.area_location ILIKE $${paramIndex++}`;
      params.push(`%${area}%`);
    }

    query += ' ORDER BY p.taken_date DESC, p.created_at DESC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get single photo with annotations
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const photoResult = await db.query(
      `SELECT p.*, u.first_name || ' ' || u.last_name as taken_by_name
       FROM photos p
       LEFT JOIN users u ON p.taken_by = u.id
       WHERE p.id = $1`,
      [req.params.id]
    );

    if (photoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    const annotationsResult = await db.query(
      `SELECT pa.*, u.first_name || ' ' || u.last_name as created_by_name
       FROM photo_annotations pa
       LEFT JOIN users u ON pa.created_by = u.id
       WHERE pa.photo_id = $1
       ORDER BY pa.created_at DESC`,
      [req.params.id]
    );

    res.json({
      ...photoResult.rows[0],
      annotations: annotationsResult.rows
    });
  } catch (error) {
    next(error);
  }
});

// Upload photo
router.post('/', authenticate, setUploadType('photos'), upload.single('photo'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { project_id, caption, category, area_location, taken_date, latitude, longitude } = req.body;

    // Generate thumbnail
    const thumbnailFilename = `thumb_${req.file.filename}`;
    const thumbnailPath = path.join(path.dirname(req.file.path), thumbnailFilename);
    
    await sharp(req.file.path)
      .resize(300, 300, { fit: 'cover' })
      .toFile(thumbnailPath);

    const result = await db.query(
      `INSERT INTO photos 
       (project_id, file_path, thumbnail_path, original_filename, file_size, mime_type,
        caption, category, area_location, taken_date, taken_by, latitude, longitude)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        project_id,
        `/uploads/photos/${req.file.filename}`,
        `/uploads/photos/${thumbnailFilename}`,
        req.file.originalname,
        req.file.size,
        req.file.mimetype,
        caption,
        category || 'other',
        area_location,
        taken_date || new Date().toISOString().split('T')[0],
        req.user.id,
        latitude,
        longitude
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Upload multiple photos
router.post('/batch', authenticate, setUploadType('photos'), upload.array('photos', 20), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const { project_id, category, area_location, taken_date } = req.body;
    const uploadedPhotos = [];

    for (const file of req.files) {
      // Generate thumbnail
      const thumbnailFilename = `thumb_${file.filename}`;
      const thumbnailPath = path.join(path.dirname(file.path), thumbnailFilename);
      
      await sharp(file.path)
        .resize(300, 300, { fit: 'cover' })
        .toFile(thumbnailPath);

      const result = await db.query(
        `INSERT INTO photos 
         (project_id, file_path, thumbnail_path, original_filename, file_size, mime_type,
          category, area_location, taken_date, taken_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          project_id,
          `/uploads/photos/${file.filename}`,
          `/uploads/photos/${thumbnailFilename}`,
          file.originalname,
          file.size,
          file.mimetype,
          category || 'other',
          area_location,
          taken_date || new Date().toISOString().split('T')[0],
          req.user.id
        ]
      );

      uploadedPhotos.push(result.rows[0]);
    }

    res.status(201).json(uploadedPhotos);
  } catch (error) {
    next(error);
  }
});

// Update photo metadata
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const { caption, category, area_location, taken_date } = req.body;

    const result = await db.query(
      `UPDATE photos SET
       caption = COALESCE($1, caption),
       category = COALESCE($2, category),
       area_location = COALESCE($3, area_location),
       taken_date = COALESCE($4, taken_date)
       WHERE id = $5
       RETURNING *`,
      [caption, category, area_location, taken_date, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Add annotation to photo
router.post('/:id/annotations', authenticate, [
  body('annotation_data').isObject()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { annotation_data } = req.body;

    const result = await db.query(
      `INSERT INTO photo_annotations (photo_id, annotation_data, created_by)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [req.params.id, JSON.stringify(annotation_data), req.user.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Link photo to entity
router.post('/:id/link', authenticate, [
  body('entity_type').isIn(['daily_report', 'rfi', 'change', 'punch_item', 'delivery']),
  body('entity_id').isUUID()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { entity_type, entity_id } = req.body;

    const result = await db.query(
      `INSERT INTO photo_links (photo_id, entity_type, entity_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [req.params.id, entity_type, entity_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Delete photo
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const photoResult = await db.query(
      'SELECT file_path, thumbnail_path FROM photos WHERE id = $1',
      [req.params.id]
    );

    if (photoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    const photo = photoResult.rows[0];

    // Delete from database
    await db.query('DELETE FROM photos WHERE id = $1', [req.params.id]);

    // Delete files
    try {
      await fs.unlink(path.join(__dirname, '../../..', photo.file_path));
      await fs.unlink(path.join(__dirname, '../../..', photo.thumbnail_path));
    } catch (e) {
      console.warn('Could not delete photo files:', e.message);
    }

    res.json({ message: 'Photo deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
