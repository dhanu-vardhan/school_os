package com.schoolos.tenancy;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MembershipRepository extends JpaRepository<Membership, UUID> {
    List<Membership> findByUserSubject(String userSubject);
    List<Membership> findByUserSubjectAndActiveTrue(String userSubject);
    Optional<Membership> findFirstByUserSubjectAndSchoolIdAndActiveTrue(String userSubject, UUID schoolId);
}
