package com.schoolos.pedagogy;

import com.schoolos.common.TenantContext;
import com.schoolos.common.Uuids;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

/** Teaching & learning slice: plans, library resources and curriculum coverage. */
@Service
public class LessonPlannerService {

    private final LessonPlanRepository plans;
    private final LessonResourceRepository resources;
    private final LessonPlanResourceRepository planResources;
    private final CurriculumChapterRepository chapters;
    private final CurriculumCoverageRepository coverage;

    public LessonPlannerService(LessonPlanRepository plans,
                                LessonResourceRepository resources,
                                LessonPlanResourceRepository planResources,
                                CurriculumChapterRepository chapters,
                                CurriculumCoverageRepository coverage) {
        this.plans = plans;
        this.resources = resources;
        this.planResources = planResources;
        this.chapters = chapters;
        this.coverage = coverage;
    }

    public record PlanInput(@NotBlank String title, String subject, String level, UUID classId,
                            LocalDate plannedDate, Integer dayOfWeek,
                            Integer startMinute, Integer endMinute, String room,
                            String objectives, String steps, String differentiationNotes,
                            String status, List<UUID> resourceIds) {}

    public record ResourceInput(@NotBlank String title, String kind, String subject, String level,
                                List<String> tags, String url, String fileKey, String status) {}

    public record ChapterInput(UUID classId, String subject, @NotBlank String title,
                               String programmeRef, Integer position) {}

    public record CoverageInput(@NotNull UUID chapterId, UUID lessonPlanId,
                                @NotNull LocalDate taughtOn, String term) {}

    public record ChapterCoverageView(UUID id, UUID classId, String subject, String title,
                                      String programmeRef, int position, boolean taught,
                                      LocalDate lastTaughtOn, UUID lessonPlanId) {}

    @Transactional(readOnly = true)
    public List<LessonPlan> listPlans(UUID classId, LocalDate from, LocalDate to) {
        List<LessonPlan> result;
        if (classId != null && from != null && to != null) {
            result = plans.findByClassIdAndPlannedDateBetweenOrderByPlannedDateAscStartMinuteAsc(classId, from, to);
        } else if (classId != null) {
            result = plans.findByClassIdOrderByPlannedDateAscStartMinuteAsc(classId);
        } else {
            result = new ArrayList<>(plans.findAll());
            result.sort(Comparator.comparing(LessonPlan::getPlannedDate,
                    Comparator.nullsLast(Comparator.naturalOrder()))
                    .thenComparingInt(p -> p.getStartMinute()));
        }
        return result;
    }

    @Transactional(readOnly = true)
    public LessonPlan getPlan(UUID id) {
        return plans.findById(id).orElseThrow(() -> notFound("lesson plan"));
    }

    @Transactional
    public LessonPlan savePlan(UUID id, PlanInput input) {
        LessonPlan plan = id == null ? new LessonPlan() : getPlan(id);
        apply(plan, input);
        plan.setSchoolId(TenantContext.get());
        plan.touch();
        LessonPlan saved = plans.save(plan);
        replaceResources(saved, input.resourceIds());
        return saved;
    }

    @Transactional
    public LessonPlan copyPlan(UUID id, int weeks) {
        LessonPlan source = getPlan(id);
        LessonPlan copy = new LessonPlan();
        apply(copy, new PlanInput(source.getTitle(), source.getSubject(), source.getLevel(),
                source.getClassId(), source.getPlannedDate() == null ? null : source.getPlannedDate().plusWeeks(weeks),
                source.getDayOfWeek(), source.getStartMinute(), source.getEndMinute(), source.getRoom(),
                source.getObjectives(), source.getSteps(), source.getDifferentiationNotes(),
                "draft", List.of()));
        copy.setSourcePlanId(source.getId());
        copy.setSchoolId(TenantContext.get());
        copy.touch();
        LessonPlan saved = plans.save(copy);
        replaceResources(saved, currentResourceIds(source.getId()));
        return saved;
    }

    @Transactional
    public void deletePlan(UUID id) {
        plans.delete(getPlan(id));
    }

    @Transactional(readOnly = true)
    public List<LessonResource> listResources(String query, String subject, String level, String tag) {
        List<LessonResource> all = resources.findAllByOrderByTitleAsc();
        String q = normalize(query);
        String s = normalize(subject);
        String l = normalize(level);
        String t = normalize(tag);
        List<LessonResource> out = new ArrayList<>();
        for (LessonResource r : all) {
            if (q != null && !(contains(r.getTitle(), q) || contains(r.getSubject(), q))) continue;
            if (s != null && !s.equals(normalize(r.getSubject()))) continue;
            if (l != null && !l.equals(normalize(r.getLevel()))) continue;
            if (t != null && tags(r).stream().noneMatch(x -> x.equalsIgnoreCase(t))) continue;
            out.add(r);
        }
        return out;
    }

    @Transactional
    public LessonResource createResource(ResourceInput input) {
        LessonResource resource = new LessonResource();
        apply(resource, input);
        resource.setSchoolId(TenantContext.get());
        resource.touch();
        return resources.save(resource);
    }

    @Transactional(readOnly = true)
    public List<CurriculumChapter> listChapters(UUID classId) {
        return classId != null
                ? chapters.findByClassIdOrderByPositionAsc(classId)
                : chapters.findAllByOrderBySubjectAscPositionAsc();
    }

    @Transactional
    public CurriculumChapter createChapter(ChapterInput input) {
        CurriculumChapter chapter = new CurriculumChapter();
        chapter.setClassId(input.classId());
        chapter.setSubject(input.subject());
        chapter.setTitle(input.title());
        chapter.setProgrammeRef(input.programmeRef());
        chapter.setPosition(input.position() == null ? 0 : input.position());
        chapter.setSchoolId(TenantContext.get());
        chapter.touch();
        return chapters.save(chapter);
    }

    @Transactional(readOnly = true)
    public List<ChapterCoverageView> coverage(UUID classId) {
        List<CurriculumChapter> list = listChapters(classId);
        List<UUID> ids = list.stream().map(CurriculumChapter::getId).toList();
        List<CurriculumCoverage> records = ids.isEmpty() ? List.of() : coverage.findByChapterIdIn(ids);
        List<ChapterCoverageView> views = new ArrayList<>();
        for (CurriculumChapter chapter : list) {
            List<CurriculumCoverage> forChapter = records.stream()
                    .filter(c -> c.getChapterId().equals(chapter.getId()))
                    .sorted(Comparator.comparing(CurriculumCoverage::getTaughtOn))
                    .toList();
            LocalDate last = forChapter.isEmpty() ? null : forChapter.get(forChapter.size() - 1).getTaughtOn();
            UUID planId = forChapter.isEmpty() ? null : forChapter.get(forChapter.size() - 1).getLessonPlanId();
            views.add(new ChapterCoverageView(chapter.getId(), chapter.getClassId(), chapter.getSubject(),
                    chapter.getTitle(), chapter.getProgrammeRef(), chapter.getPosition(),
                    !forChapter.isEmpty(), last, planId));
        }
        return views;
    }

    /** Idempotent: re-marking the same chapter/plan pair updates the date instead of duplicating. */
    @Transactional
    public CurriculumCoverage markTaught(CoverageInput input) {
        CurriculumChapter chapter = chapters.findById(input.chapterId())
                .orElseThrow(() -> notFound("curriculum chapter"));
        UUID planId = input.lessonPlanId();
        if (planId != null) {
            plans.findById(planId).orElseThrow(() -> notFound("lesson plan"));
        }
        CurriculumCoverage record = coverage.findByChapterIdAndLessonPlanId(chapter.getId(), planId)
                .orElseGet(CurriculumCoverage::new);
        record.setChapterId(chapter.getId());
        record.setLessonPlanId(planId);
        record.setTaughtOn(input.taughtOn());
        record.setTerm(input.term());
        record.setSchoolId(TenantContext.get());
        record.touch();
        return coverage.save(record);
    }

    private void apply(LessonPlan plan, PlanInput in) {
        plan.setTitle(in.title());
        plan.setSubject(in.subject());
        plan.setLevel(in.level());
        plan.setClassId(in.classId());
        plan.setPlannedDate(in.plannedDate());
        plan.setDayOfWeek(in.dayOfWeek());
        plan.setStartMinute(in.startMinute() == null ? plan.getStartMinute() : in.startMinute());
        plan.setEndMinute(in.endMinute() == null ? plan.getEndMinute() : in.endMinute());
        plan.setRoom(in.room());
        plan.setObjectives(in.objectives());
        plan.setSteps(in.steps());
        plan.setDifferentiationNotes(in.differentiationNotes());
        plan.setStatus(in.status() == null ? "draft" : in.status());
    }

    private void apply(LessonResource resource, ResourceInput in) {
        resource.setTitle(in.title());
        resource.setKind(in.kind() == null ? "document" : in.kind());
        resource.setSubject(in.subject());
        resource.setLevel(in.level());
        resource.setTags(in.tags() == null ? "" : String.join(",", in.tags()));
        resource.setUrl(in.url());
        resource.setFileKey(in.fileKey());
        resource.setStatus(in.status() == null ? "published" : in.status());
    }

    private void replaceResources(LessonPlan plan, List<UUID> resourceIds) {
        planResources.deleteByPlanId(plan.getId());
        if (resourceIds == null || resourceIds.isEmpty()) return;
        List<LessonResource> found = resources.findAllById(resourceIds);
        int position = 0;
        for (LessonResource resource : found) {
            LessonPlanResource link = new LessonPlanResource();
            link.setId(Uuids.newId());
            link.setSchoolId(TenantContext.get());
            link.setPlanId(plan.getId());
            link.setResourceId(resource.getId());
            link.setPosition(position++);
            link.touch();
            planResources.save(link);
        }
    }

    private List<UUID> currentResourceIds(UUID planId) {
        return planResources.findByPlanIdOrderByPositionAsc(planId).stream()
                .map(LessonPlanResource::getResourceId)
                .toList();
    }

    private static List<String> tags(LessonResource resource) {
        if (resource.getTags() == null || resource.getTags().isBlank()) return List.of();
        List<String> out = new ArrayList<>();
        for (String part : resource.getTags().split(",")) {
            String trimmed = part.trim();
            if (!trimmed.isEmpty()) out.add(trimmed);
        }
        return out;
    }

    private static String normalize(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed.toLowerCase();
    }

    private static boolean contains(String field, String needle) {
        return field != null && field.toLowerCase().contains(needle);
    }

    private static ResponseStatusException notFound(String what) {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, what + " not found");
    }
}
