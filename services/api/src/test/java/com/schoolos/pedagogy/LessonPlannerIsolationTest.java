package com.schoolos.pedagogy;

import com.schoolos.common.TenantContext;
import com.schoolos.tenancy.School;
import com.schoolos.tenancy.SchoolService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** Cross-tenant isolation for EPIC 21 aggregates. */
@SpringBootTest
@ActiveProfiles("test")
class LessonPlannerIsolationTest {

    @Autowired SchoolService schoolService;
    @Autowired LessonPlannerService service;

    private LessonPlannerService.PlanInput input(String title) {
        return new LessonPlannerService.PlanInput(title, "Mathématiques", "CP", null,
                LocalDate.of(2026, 11, 20), 5, 480, 525, "Salle 08",
                "Compter jusqu'à 20", "1. Rappel\n2. Atelier", "Temps supplémentaire pour deux élèves",
                "published", List.of());
    }

    @Test
    void plansResourcesAndChaptersAreIsolatedBetweenSchools() {
        School a = schoolService.create("School A");
        School b = schoolService.create("School B");

        TenantContext.set(a.getId());
        LessonPlan planA = service.savePlan(null, input("Plan A"));
        LessonResource resourceA = service.createResource(new LessonPlannerService.ResourceInput(
                "Fiche A", "exercise", "Mathématiques", "CP", List.of("atelier"), null, null, "published"));
        CurriculumChapter chapterA = service.createChapter(new LessonPlannerService.ChapterInput(
                null, "Mathématiques", "Chapitre A", "PROG-1", 1));

        TenantContext.set(b.getId());
        LessonPlan planB = service.savePlan(null, input("Plan B"));
        LessonResource resourceB = service.createResource(new LessonPlannerService.ResourceInput(
                "Fiche B", "exercise", "Mathématiques", "CP", List.of("atelier"), null, null, "published"));

        TenantContext.set(a.getId());
        assertThat(service.listPlans(null, null, null)).extracting(LessonPlan::getTitle).containsExactly("Plan A");
        assertThat(service.listResources(null, null, null, null))
                .extracting(LessonResource::getTitle).containsExactly("Fiche A");
        assertThat(service.coverage(null)).extracting(LessonPlannerService.ChapterCoverageView::title)
                .containsExactly("Chapitre A");
        assertThat(planA.getId()).isNotEqualByComparingTo(planB.getId());
        assertThat(resourceA.getId()).isNotEqualByComparingTo(resourceB.getId());
        assertThat(chapterA.getSchoolId()).isEqualTo(a.getId());

        TenantContext.set(b.getId());
        assertThat(service.listPlans(null, null, null)).extracting(LessonPlan::getTitle).containsExactly("Plan B");
        assertThat(service.listResources(null, null, null, null))
                .extracting(LessonResource::getTitle).containsExactly("Fiche B");
    }

    @Test
    void copyingShiftsTheDateAndKeepsContent() {
        TenantContext.set(schoolService.create("School C").getId());
        LessonPlan source = service.savePlan(null, input("Source"));
        LessonPlan copy = service.copyPlan(source.getId(), 1);
        assertThat(copy.getPlannedDate()).isEqualTo(LocalDate.of(2026, 11, 27));
        assertThat(copy.getStatus()).isEqualTo("draft");
        assertThat(copy.getSourcePlanId()).isEqualTo(source.getId());
        assertThat(copy.getObjectives()).isEqualTo(source.getObjectives());
    }
}
