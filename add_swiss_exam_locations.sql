-- Migration: Add Swiss Exam Locations
-- This script adds all major Swiss exam locations for driving tests
-- Date: 2025-01-27

-- Insert major Swiss exam locations
INSERT INTO locations (name, address, location_type, is_active, created_at) VALUES
-- Zürich Canton
('Strassenverkehrsamt Zürich', 'Walcheplatz 2, 8001 Zürich', 'exam', true, NOW()),
('Strassenverkehrsamt Winterthur', 'Technikumstrasse 2, 8400 Winterthur', 'exam', true, NOW()),
('Strassenverkehrsamt Uster', 'Bahnhofstrasse 1, 8610 Uster', 'exam', true, NOW()),
('Strassenverkehrsamt Bülach', 'Bahnhofstrasse 15, 8180 Bülach', 'exam', true, NOW()),

-- Bern Canton
('Strassenverkehrsamt Bern', 'Papiermühlestrasse 35, 3000 Bern', 'exam', true, NOW()),
('Strassenverkehrsamt Biel', 'Bahnhofstrasse 1, 2500 Biel', 'exam', true, NOW()),
('Strassenverkehrsamt Thun', 'Bahnhofstrasse 1, 3600 Thun', 'exam', true, NOW()),
('Strassenverkehrsamt Burgdorf', 'Bahnhofstrasse 1, 3400 Burgdorf', 'exam', true, NOW()),

-- Basel-Stadt
('Strassenverkehrsamt Basel', 'Rheinstrasse 29, 4058 Basel', 'exam', true, NOW()),

-- Basel-Landschaft
('Strassenverkehrsamt Liestal', 'Bahnhofstrasse 1, 4410 Liestal', 'exam', true, NOW()),

-- Aargau
('Strassenverkehrsamt Aarau', 'Bahnhofstrasse 1, 5000 Aarau', 'exam', true, NOW()),
('Strassenverkehrsamt Baden', 'Bahnhofstrasse 1, 5400 Baden', 'exam', true, NOW()),
('Strassenverkehrsamt Brugg', 'Bahnhofstrasse 1, 5200 Brugg', 'exam', true, NOW()),

-- St. Gallen
('Strassenverkehrsamt St. Gallen', 'Bahnhofstrasse 1, 9000 St. Gallen', 'exam', true, NOW()),
('Strassenverkehrsamt Rapperswil', 'Bahnhofstrasse 1, 8640 Rapperswil', 'exam', true, NOW()),

-- Luzern
('Strassenverkehrsamt Luzern', 'Bahnhofstrasse 1, 6000 Luzern', 'exam', true, NOW()),
('Strassenverkehrsamt Sursee', 'Bahnhofstrasse 1, 6210 Sursee', 'exam', true, NOW()),

-- Thurgau
('Strassenverkehrsamt Frauenfeld', 'Bahnhofstrasse 1, 8500 Frauenfeld', 'exam', true, NOW()),

-- Solothurn
('Strassenverkehrsamt Solothurn', 'Bahnhofstrasse 1, 4500 Solothurn', 'exam', true, NOW()),

-- Schwyz
('Strassenverkehrsamt Schwyz', 'Bahnhofstrasse 1, 6430 Schwyz', 'exam', true, NOW()),

-- Zug
('Strassenverkehrsamt Zug', 'Bahnhofstrasse 1, 6300 Zug', 'exam', true, NOW()),

-- Schaffhausen
('Strassenverkehrsamt Schaffhausen', 'Bahnhofstrasse 1, 8200 Schaffhausen', 'exam', true, NOW()),

-- Appenzell Ausserrhoden
('Strassenverkehrsamt Herisau', 'Bahnhofstrasse 1, 9100 Herisau', 'exam', true, NOW()),

-- Appenzell Innerrhoden
('Strassenverkehrsamt Appenzell', 'Bahnhofstrasse 1, 9050 Appenzell', 'exam', true, NOW()),

-- Glarus
('Strassenverkehrsamt Glarus', 'Bahnhofstrasse 1, 8750 Glarus', 'exam', true, NOW()),

-- Graubünden
('Strassenverkehrsamt Chur', 'Bahnhofstrasse 1, 7000 Chur', 'exam', true, NOW()),
('Strassenverkehrsamt Davos', 'Bahnhofstrasse 1, 7270 Davos', 'exam', true, NOW()),

-- Tessin
('Strassenverkehrsamt Bellinzona', 'Via San Gottardo 1, 6500 Bellinzona', 'exam', true, NOW()),
('Strassenverkehrsamt Lugano', 'Via San Gottardo 1, 6900 Lugano', 'exam', true, NOW()),
('Strassenverkehrsamt Locarno', 'Via San Gottardo 1, 6600 Locarno', 'exam', true, NOW()),

-- Waadt
('Strassenverkehrsamt Lausanne', 'Avenue de la Gare 1, 1000 Lausanne', 'exam', true, NOW()),
('Strassenverkehrsamt Yverdon', 'Avenue de la Gare 1, 1400 Yverdon', 'exam', true, NOW()),
('Strassenverkehrsamt Nyon', 'Avenue de la Gare 1, 1260 Nyon', 'exam', true, NOW()),

-- Wallis
('Strassenverkehrsamt Sion', 'Avenue de la Gare 1, 1950 Sion', 'exam', true, NOW()),
('Strassenverkehrsamt Sierre', 'Avenue de la Gare 1, 3960 Sierre', 'exam', true, NOW()),

-- Neuenburg
('Strassenverkehrsamt Neuenburg', 'Avenue de la Gare 1, 2000 Neuenburg', 'exam', true, NOW()),

-- Jura
('Strassenverkehrsamt Delémont', 'Avenue de la Gare 1, 2800 Delémont', 'exam', true, NOW()),

-- Genf
('Strassenverkehrsamt Genf', 'Avenue de la Gare 1, 1200 Genf', 'exam', true, NOW()),

-- Freiburg
('Strassenverkehrsamt Freiburg', 'Avenue de la Gare 1, 1700 Freiburg', 'exam', true, NOW());

-- Create index for better search performance
CREATE INDEX IF NOT EXISTS idx_locations_exam_search ON locations(name, address) WHERE location_type = 'exam' AND is_active = true;

-- Add comment
COMMENT ON TABLE locations IS 'All locations including exam centers and regular locations';
COMMENT ON COLUMN locations.location_type IS 'Type of location: exam, regular, etc.';
COMMENT ON COLUMN locations.staff_id IS 'If null, this is a global location. If set, this is a staff-specific preference.';