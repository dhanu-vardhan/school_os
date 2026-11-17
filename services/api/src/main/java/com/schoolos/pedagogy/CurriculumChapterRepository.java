package com.schoolos.pedagogy;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CurriculumChapterRepository extends JpaRepository<CurriculumChapter, UUID> {
    List<CurriculumChapter> findByClassIdOrderByPositionAsc(UUID classId);
    List<CurriculumChapter> findAllByOrderBySubjectAscPositionAsc();
}
