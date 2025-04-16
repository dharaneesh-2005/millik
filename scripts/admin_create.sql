-- Make columns nullable to fix constraints
ALTER TABLE users ALTER COLUMN username DROP NOT NULL;
ALTER TABLE users ALTER COLUMN password DROP NOT NULL;

-- Check if admin exists with this username
DO $$
DECLARE
    admin_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO admin_count FROM users WHERE username = 'admin_millikit';
    
    IF admin_count = 0 THEN
        -- Create admin user
        INSERT INTO users (username, password, email, name, role) 
        VALUES ('admin_millikit', 'the_millikit', 'admin@millikit.com', 'Admin', 'admin');
        RAISE NOTICE 'Admin user created successfully';
    ELSE
        RAISE NOTICE 'Admin user already exists';
    END IF;
END $$;

-- Verify admin user
SELECT * FROM users WHERE username = 'admin_millikit'; 