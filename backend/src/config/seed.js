require('dotenv').config({ path: '../.env' });
const { pool } = require('./database');
const bcrypt = require('bcryptjs');

async function seed() {
  try {
    console.log('🌱 Seeding database...');

    // Create default admin user
    const passwordHash = await bcrypt.hash('admin123', 10);
    
    await pool.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, phone, role)
      VALUES 
        ('admin@officebridge.com', $1, 'Admin', 'User', '555-0100', 'admin'),
        ('pm@officebridge.com', $1, 'Sarah', 'Johnson', '555-0101', 'project_manager'),
        ('super@officebridge.com', $1, 'Mike', 'Williams', '555-0102', 'superintendent'),
        ('foreman@officebridge.com', $1, 'Carlos', 'Garcia', '555-0103', 'foreman'),
        ('engineer@officebridge.com', $1, 'Emily', 'Chen', '555-0104', 'project_engineer'),
        ('accounting@officebridge.com', $1, 'David', 'Brown', '555-0105', 'accounting'),
        ('logistics@officebridge.com', $1, 'Lisa', 'Martinez', '555-0106', 'logistics'),
        ('doccontrol@officebridge.com', $1, 'James', 'Wilson', '555-0107', 'document_controller'),
        ('dispatch@officebridge.com', $1, 'Amanda', 'Taylor', '555-0108', 'service_dispatcher')
      ON CONFLICT (email) DO NOTHING
    `, [passwordHash]);

    // Create sample cost codes
    await pool.query(`
      INSERT INTO cost_codes (code, description, category)
      VALUES 
        ('01-100', 'Mobilization', 'General'),
        ('01-200', 'Project Management', 'General'),
        ('01-300', 'Site Supervision', 'General'),
        ('15-100', 'Rough-In Plumbing', 'Plumbing'),
        ('15-200', 'Underground Plumbing', 'Plumbing'),
        ('15-300', 'Plumbing Fixtures', 'Plumbing'),
        ('15-400', 'Trim Plumbing', 'Plumbing'),
        ('15-500', 'Testing & Startup', 'Plumbing'),
        ('23-100', 'Rough-In HVAC', 'HVAC'),
        ('23-200', 'Ductwork Installation', 'HVAC'),
        ('23-300', 'Equipment Setting', 'HVAC'),
        ('23-400', 'Piping', 'HVAC'),
        ('23-500', 'Controls', 'HVAC'),
        ('23-600', 'Startup & Balancing', 'HVAC'),
        ('26-100', 'Rough-In Electrical', 'Electrical'),
        ('26-200', 'Wire Pull', 'Electrical'),
        ('26-300', 'Panel & Equipment', 'Electrical'),
        ('26-400', 'Trim Electrical', 'Electrical'),
        ('26-500', 'Testing & Energization', 'Electrical')
      ON CONFLICT DO NOTHING
    `);

    // Create sample quality checklist templates
    await pool.query(`
      INSERT INTO quality_checklists (name, stage, trade, items, is_template)
      VALUES 
        ('HVAC Rough-In Checklist', 'rough_in', 'HVAC', 
          '[
            {"item": "Ductwork properly supported", "required": true},
            {"item": "Proper clearances maintained", "required": true},
            {"item": "Access panels installed", "required": true},
            {"item": "Insulation complete", "required": true},
            {"item": "Fire/smoke dampers installed", "required": true},
            {"item": "Condensate drains installed", "required": true},
            {"item": "Refrigerant piping brazed and leak tested", "required": true}
          ]'::jsonb, true),
        ('Plumbing Rough-In Checklist', 'rough_in', 'Plumbing',
          '[
            {"item": "Proper pipe sizing", "required": true},
            {"item": "Adequate slope on waste lines", "required": true},
            {"item": "Test caps installed", "required": true},
            {"item": "Cleanouts accessible", "required": true},
            {"item": "Proper hangers and supports", "required": true},
            {"item": "Pressure test completed", "required": true},
            {"item": "Insulation on hot water lines", "required": true}
          ]'::jsonb, true)
      ON CONFLICT DO NOTHING
    `);

    console.log('✅ Seeding completed successfully');
    console.log('');
    console.log('Default login credentials:');
    console.log('  Email: admin@officebridge.com');
    console.log('  Password: admin123');
    console.log('');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
}

seed();
