package com.schoolos.people;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface GuardianChildRepository extends JpaRepository<GuardianChild, UUID> {
    List<GuardianChild> findByGuardianSubject(String guardianSubject);
    boolean existsByGuardianSubjectAndStudentId(String guardianSubject, UUID studentId);
}
