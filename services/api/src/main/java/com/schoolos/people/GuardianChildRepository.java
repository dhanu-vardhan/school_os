package com.schoolos.people;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface GuardianChildRepository extends JpaRepository<GuardianChild, UUID> {
    List<GuardianChild> findByGuardianSubject(String guardianSubject);

    boolean existsByGuardianSubjectAndStudentId(String guardianSubject, UUID studentId);

    @Query("""
            select gc from GuardianChild gc
             where gc.guardianSubject = :sub and gc.studentId = :studentId
               and lower(gc.status) = 'active'
               and gc.validFrom <= :today
               and (gc.validTo is null or gc.validTo >= :today)
            """)
    boolean existsActiveLink(@Param("sub") String guardianSubject,
                             @Param("studentId") UUID studentId,
                             @Param("today") LocalDate today);

    @Query("""
            select gc from GuardianChild gc
             where gc.guardianSubject = :sub
               and lower(gc.status) = 'active'
               and gc.validFrom <= :today
               and (gc.validTo is null or gc.validTo >= :today)
            """)
    List<GuardianChild> findActiveByGuardianSubject(@Param("sub") String guardianSubject,
                                                    @Param("today") LocalDate today);
}
