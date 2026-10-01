DROP TRIGGER organization_email_domains_normalize_and_validate
    ON organization_email_domains;
DROP FUNCTION normalize_and_validate_root_email_domain();

CREATE FUNCTION normalize_organization_email_domain()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.domain := LOWER(BTRIM(NEW.domain));
    RETURN NEW;
END;
$$;

CREATE TRIGGER organization_email_domains_normalize_and_validate
    BEFORE INSERT OR UPDATE OF organization_id, domain
    ON organization_email_domains
    FOR EACH ROW
    EXECUTE FUNCTION normalize_organization_email_domain();
