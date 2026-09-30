GRANT SELECT (id, platform_role) ON users TO resourcehive_platform_report;
CREATE POLICY users_platform_report ON users TO resourcehive_platform_report
USING (true);
