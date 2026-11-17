package com.schoolos.security;

import com.schoolos.common.TenantContext;
import com.schoolos.tenancy.Membership;
import com.schoolos.tenancy.MembershipRepository;
import com.schoolos.tenancy.SchoolRole;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * The JWT is signed, but the tenant+role pair is only trusted when an active membership row
 * matches the subject. This is what stops a stale or mis-issued claim from reaching RLS with
 * another school's id.
 */
@Service
public class MembershipResolver {

    private final MembershipRepository memberships;

    public MembershipResolver(MembershipRepository memberships) {
        this.memberships = memberships;
    }

    public Membership requireActiveMembership(Jwt jwt) {
        UUID schoolId;
        try {
            Object claim = jwt.getClaim("school_id");
            if (claim == null) throw new IllegalArgumentException("missing school_id");
            schoolId = UUID.fromString(claim.toString());
        } catch (RuntimeException e) {
            throw new AccessDeniedException("Invalid or missing school_id claim");
        }
        // RLS needs the tenant bound before the membership query; the value comes from the
        // validated token, and the query itself proves the subject belongs to that school.
        TenantContext.set(schoolId);
        Membership membership = memberships
                .findFirstByUserSubjectAndSchoolIdAndActiveTrue(jwt.getSubject(), schoolId)
                .orElseThrow(() -> new AccessDeniedException("No active membership for this school"));

        SchoolRole claimed = null;
        for (String role : jwt.getClaimAsStringList("roles") == null ? java.util.List.<String>of() : jwt.getClaimAsStringList("roles")) {
            SchoolRole parsed = SchoolRole.fromClaim(role);
            if (parsed != null && parsed == membership.getRole()) {
                claimed = parsed;
                break;
            }
        }
        if (claimed == null) {
            throw new AccessDeniedException("Token role does not match the membership role");
        }
        return membership;
    }
}
