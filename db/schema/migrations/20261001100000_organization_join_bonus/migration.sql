CREATE FUNCTION award_organization_join_bonus()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
    organization_root_id UUID;
    organization_bonus INTEGER;
    organization_name TEXT;
BEGIN
    IF NEW.status <> 'APPROVED' THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF OLD.status = 'APPROVED' THEN
            RETURN NEW;
        END IF;
    END IF;

    SELECT organization.root_organization_id,
           organization.join_bonus_points,
           organization.name
    INTO organization_root_id, organization_bonus, organization_name
    FROM public.organizations AS organization
    WHERE organization.id = NEW.organization_id
      AND organization.status = 'ACTIVE';

    IF NOT FOUND OR organization_bonus <= 0 THEN
        RETURN NEW;
    END IF;

    INSERT INTO public.point_transactions (
        user_id,
        root_organization_id,
        amount,
        transaction_type,
        source_organization_id,
        description
    )
    VALUES (
        NEW.user_id,
        organization_root_id,
        organization_bonus,
        'JOIN_BONUS',
        NEW.organization_id,
        'Join bonus for ' || organization_name
    )
    ON CONFLICT (user_id, source_organization_id)
        WHERE transaction_type = 'JOIN_BONUS'
        DO NOTHING;

    RETURN NEW;
END;
$$;

CREATE TRIGGER organization_memberships_award_join_bonus
    AFTER INSERT OR UPDATE OF status
    ON organization_memberships
    FOR EACH ROW
    EXECUTE FUNCTION award_organization_join_bonus();

REVOKE ALL ON FUNCTION award_organization_join_bonus() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION award_organization_join_bonus()
    TO resourcehive_tenant, resourcehive_auth;
