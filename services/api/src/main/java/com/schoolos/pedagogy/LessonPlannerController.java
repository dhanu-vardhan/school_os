package com.schoolos.pedagogy;

import com.schoolos.security.CurrentUser;
import com.schoolos.security.PolicyService;
import com.schoolos.security.RequirePermission;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** EPIC 21 planner API. All mutating calls enforce the lesson permissions server-side. */
@RestController
@RequestMapping("/api/v1")
public class LessonPlannerController {

    private final LessonPlannerService service;
    private final PolicyService policy;
    private final CurrentUser currentUser;

    public LessonPlannerController(LessonPlannerService service, PolicyService policy, CurrentUser currentUser) {
        this.service = service;
        this.policy = policy;
        this.currentUser = currentUser;
    }

    @GetMapping("/lesson-plans")
    @RequirePermission(PolicyService.LESSON_READ)
    public List<LessonPlan> listPlans(
            @RequestParam(name = "classId", required = false) UUID classId,
            @RequestParam(name = "from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(name = "to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        policy.require(currentUser, PolicyService.LESSON_READ);
        return service.listPlans(classId, from, to);
    }

    @PostMapping("/lesson-plans")
    @RequirePermission(PolicyService.LESSON_WRITE)
    public LessonPlan createPlan(@Valid @RequestBody LessonPlannerService.PlanInput input) {
        policy.require(currentUser, PolicyService.LESSON_WRITE);
        return service.savePlan(null, input);
    }

    @PutMapping("/lesson-plans/{id}")
    @RequirePermission(PolicyService.LESSON_WRITE)
    public LessonPlan updatePlan(@PathVariable UUID id, @Valid @RequestBody LessonPlannerService.PlanInput input) {
        policy.require(currentUser, PolicyService.LESSON_WRITE);
        policy.requireSameSchool(currentUser, service.getPlan(id).getSchoolId());
        return service.savePlan(id, input);
    }

    @PostMapping("/lesson-plans/{id}/copy")
    @RequirePermission(PolicyService.LESSON_WRITE)
    public LessonPlan copyPlan(@PathVariable UUID id,
                               @RequestParam(name = "weeks", defaultValue = "1") int weeks) {
        policy.require(currentUser, PolicyService.LESSON_WRITE);
        return service.copyPlan(id, weeks);
    }

    @DeleteMapping("/lesson-plans/{id}")
    @RequirePermission(PolicyService.LESSON_WRITE)
    public void deletePlan(@PathVariable UUID id) {
        policy.require(currentUser, PolicyService.LESSON_WRITE);
        service.deletePlan(id);
    }

    @GetMapping("/lesson-resources")
    @RequirePermission(PolicyService.LESSON_READ)
    public List<LessonResource> listResources(
            @RequestParam(name = "q", required = false) String q,
            @RequestParam(name = "subject", required = false) String subject,
            @RequestParam(name = "level", required = false) String level,
            @RequestParam(name = "tag", required = false) String tag) {
        policy.require(currentUser, PolicyService.LESSON_READ);
        return service.listResources(q, subject, level, tag);
    }

    @PostMapping("/lesson-resources")
    @RequirePermission(PolicyService.LESSON_WRITE)
    public LessonResource createResource(@Valid @RequestBody LessonPlannerService.ResourceInput input) {
        policy.require(currentUser, PolicyService.LESSON_WRITE);
        return service.createResource(input);
    }

    @GetMapping("/curriculum/chapters")
    @RequirePermission(PolicyService.LESSON_READ)
    public List<CurriculumChapter> listChapters(@RequestParam(name = "classId", required = false) UUID classId) {
        policy.require(currentUser, PolicyService.LESSON_READ);
        return service.listChapters(classId);
    }

    @PostMapping("/curriculum/chapters")
    @RequirePermission(PolicyService.LESSON_WRITE)
    public CurriculumChapter createChapter(@Valid @RequestBody LessonPlannerService.ChapterInput input) {
        policy.require(currentUser, PolicyService.LESSON_WRITE);
        return service.createChapter(input);
    }

    @GetMapping("/curriculum/coverage")
    @RequirePermission(PolicyService.LESSON_READ)
    public List<LessonPlannerService.ChapterCoverageView> coverage(
            @RequestParam(name = "classId", required = false) UUID classId) {
        policy.require(currentUser, PolicyService.LESSON_READ);
        return service.coverage(classId);
    }

    @PostMapping("/curriculum/coverage")
    @RequirePermission(PolicyService.LESSON_WRITE)
    public CurriculumCoverage markTaught(@Valid @RequestBody LessonPlannerService.CoverageInput input) {
        policy.require(currentUser, PolicyService.LESSON_WRITE);
        return service.markTaught(input);
    }
}
