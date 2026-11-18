package com.schoolos.family;

import com.schoolos.common.TenantContext;
import com.schoolos.common.Uuids;
import com.schoolos.people.Student;
import com.schoolos.people.StudentRepository;
import com.schoolos.security.CurrentUser;
import com.schoolos.security.PolicyService;
import com.schoolos.security.StepUpRequiredException;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Date;
import java.sql.Time;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;

@Service
public class FamilyService {

    private final JdbcTemplate jdbc;
    private final CurrentUser currentUser;
    private final PolicyService policy;
    private final StudentRepository students;

    public FamilyService(JdbcTemplate jdbc, CurrentUser currentUser, PolicyService policy, StudentRepository students) {
        this.jdbc = jdbc;
        this.currentUser = currentUser;
        this.policy = policy;
        this.students = students;
    }

    /* ------------------------------------------------------------------ access */

    public void requireFamilyRead() {
        policy.require(currentUser, PolicyService.FAMILY_READ);
    }

    public void requireFamilyWrite() {
        policy.require(currentUser, PolicyService.FAMILY_WRITE);
    }

    public void requireFamilyPay() {
        policy.require(currentUser, PolicyService.FAMILY_PAY); // sensitive => step-up required
        if (!currentUser.stepUpActive()) throw new StepUpRequiredException();
    }

    @Transactional(readOnly = true)
    public Set<UUID> accessibleChildIds() {
        LocalDate today = LocalDate.now();
        List<UUID> ids = jdbc.queryForList("""
                SELECT student_id FROM guardian_child
                 WHERE guardian_subject = ?
                   AND lower(status) = 'active'
                   AND valid_from <= ?
                   AND (valid_to IS NULL OR valid_to >= ?)
                """, UUID.class, currentUser.subject(), Date.valueOf(today), Date.valueOf(today));
        return Set.copyOf(new LinkedHashSet<>(ids));
    }

    private void requireChildAccess(UUID childId) {
        if (childId == null || !accessibleChildIds().contains(childId)) {
            throw new AccessDeniedException("Enfant hors de votre périmètre");
        }
    }

    private Set<UUID> scope(UUID requestedChildId) {
        if (requestedChildId != null) {
            requireChildAccess(requestedChildId);
            return Set.of(requestedChildId);
        }
        return accessibleChildIds();
    }

    /* ------------------------------------------------------------------ overview / dashboard */

    @Transactional(readOnly = true)
    public Map<String, Object> overview() {
        requireFamilyRead();
        String sub = currentUser.subject();
        Set<UUID> childIds = accessibleChildIds();
        List<Map<String, Object>> children = childViews(childIds);
        List<Map<String, Object>> links = linksForSub(sub);
        Map<String, Object> policyMap = policyMap();
        boolean restricted = restrictionsForScope(childIds).stream()
                .anyMatch(r -> "demo".equals("never")); // computed per child in view
        return Map.of(
                "guardian", Map.of("sub", sub, "name", guardianName(), "email", "", "secureMessagesOnly", true),
                "children", children,
                "links", links,
                "policy", policyMap,
                "invitations", invitationsForScope(childIds),
                "restrictedDataHidden", false
        );
    }

    @Transactional(readOnly = true)
    public Map<String, Object> dashboard() {
        requireFamilyRead();
        String sub = currentUser.subject();
        Set<UUID> childIds = accessibleChildIds();
        List<Map<String, Object>> children = childViews(childIds);
        LocalDate today = LocalDate.now();
        int dow = (today.getDayOfWeek().getValue() + 6) % 7; // 0=Mon
        List<Map<String, Object>> todayEntries = new ArrayList<>();
        for (UUID id : childIds) {
            List<Map<String, Object>> entries = timetableEntries(id).stream()
                    .filter(e -> Objects.equals(asInt(e.get("day")), dow))
                    .toList();
            List<Map<String, Object>> changes = entries.stream().filter(e -> e.get("change") != null).toList();
            todayEntries.add(Map.of("childId", id.toString(), "entries", entries, "changes", changes));
        }
        List<Map<String, Object>> homeworkDue = new ArrayList<>();
        for (Map<String, Object> hw : homeworkForScope(childIds)) {
            Object readAt = hw.get("readAt");
            String due = str(hw.get("dueAt"));
            if (readAt == null && due != null && due.compareTo(today.toString()) >= 0) {
                homeworkDue.add(Map.of("childId", str(hw.get("childId")), "item", hw));
            }
        }
        List<Map<String, Object>> newGrades = new ArrayList<>();
        String weekAgo = today.minusDays(7).toString();
        for (Map<String, Object> g : gradesForScope(childIds)) {
            String pub = str(g.get("publishedAt"));
            if (pub != null && pub.compareTo(weekAgo) >= 0) {
                newGrades.add(Map.of("childId", str(g.get("childId")), "grade", g));
            }
        }
        List<Map<String, Object>> pendingForms = new ArrayList<>();
        for (Map<String, Object> f : formsForScope(childIds)) {
            String status = str(f.get("status"));
            if (!"signed".equals(status) && !"withdrawn".equals(status)) {
                pendingForms.add(Map.of("assignment", f, "childId", str(f.get("childId"))));
            }
        }
        List<Map<String, Object>> invoices = invoicesForSub(sub);
        int balance = invoices.stream().filter(i -> !"paid".equals(str(i.get("status"))))
                .mapToInt(i -> asInt(i.get("amountCents"))).sum();
        List<Map<String, Object>> events = calendarEvents().stream().limit(4).toList();
        long pendingCollectors = collectorsForScope(childIds).stream().filter(c -> "pending".equals(str(c.get("status")))).count();
        return new LinkedHashMap<>(Map.ofEntries(
                Map.entry("children", children),
                Map.entry("greetingName", guardianName()),
                Map.entry("today", todayEntries),
                Map.entry("homeworkDue", homeworkDue),
                Map.entry("newGrades", newGrades),
                Map.entry("unreadMessages", 0),
                Map.entry("pendingForms", pendingForms),
                Map.entry("balanceCents", balance),
                Map.entry("currency", "EUR"),
                Map.entry("upcomingEvents", events),
                Map.entry("pendingCollectors", pendingCollectors),
                Map.entry("restrictions", restrictionsForScope(childIds)),
                Map.entry("requestCount", 0)
        ));
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> children() {
        requireFamilyRead();
        return childViews(accessibleChildIds());
    }

    @Transactional(readOnly = true)
    public Map<String, Object> child(String id) {
        requireFamilyRead();
        UUID childId = parseId(id);
        requireChildAccess(childId);
        return childView(childId);
    }

    private List<Map<String, Object>> childViews(Set<UUID> ids) {
        List<Map<String, Object>> out = new ArrayList<>();
        for (UUID id : ids) out.add(childView(id));
        return out;
    }

    private Map<String, Object> childView(UUID childId) {
        Student s = students.findById(childId).orElseThrow(() -> new AccessDeniedException("Enfant hors de votre périmètre"));
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", s.getId().toString());
        m.put("firstName", s.getFirstName());
        m.put("lastName", s.getLastName());
        m.put("schoolId", TenantContext.get() == null ? "" : TenantContext.get().toString());
        m.put("className", "Classe");
        m.put("level", "");
        m.put("birthDate", s.getBirthDate() == null ? null : s.getBirthDate().toString());
        m.put("teachers", List.of());
        m.put("schoolLifeContact", Map.of("name", "Vie scolaire", "role", "school_life", "email", ""));
        m.put("restrictions", restrictionsForChild(childId));
        m.put("mayCollectChild", true);
        m.put("photoConsentGranted", false);
        return m;
    }

    /* ------------------------------------------------------------------ attendance */

    @Transactional(readOnly = true)
    public Map<String, Object> attendance(UUID childId) {
        requireFamilyRead();
        Set<UUID> ids = scope(childId);
        List<Map<String, Object>> days = new ArrayList<>();
        for (UUID id : ids) {
            days.addAll(jdbc.queryForList("""
                    SELECT day AS "date", child_id AS "childId", status, justification,
                           reason_label AS "reasonLabel"
                      FROM family_attendance_day WHERE child_id = ? ORDER BY day DESC
                    """, id));
        }
        List<Map<String, Object>> declarations = absenceDeclarations(ids);
        List<Map<String, Object>> counters = ids.stream().map(id -> Map.<String, Object>of(
                "childId", id.toString(), "justified", 0, "unjustified", 0, "late", 0,
                "threshold", 4, "thresholdLabel", "Seuil d’alerte défini par l’établissement (informatif)", "overThreshold", false)).toList();
        return Map.of("days", days, "declarations", declarations, "counters", counters);
    }

    @Transactional
    public Map<String, Object> declareAbsence(Map<String, Object> body) {
        requireFamilyWrite();
        UUID childId = parseId(str(body.get("childId")));
        requireChildAccess(childId);
        String from = str(body.get("fromDate"));
        String to = str(body.get("toDate"));
        if (from == null || to == null) throw new IllegalArgumentException("Dates obligatoires");
        if (from.compareTo(to) > 0) throw new IllegalArgumentException("La date de fin précède la date de début");
        String reasonText = str(body.get("reasonText"));
        if (reasonText != null && reasonText.length() > 500) throw new IllegalArgumentException("Texte limité à 500 caractères");
        UUID id = Uuids.newId();
        jdbc.update("""
                INSERT INTO family_absence_declaration
                    (id, school_id, child_id, created_by_sub, created_by_name, from_date, to_date,
                     period, reason_code, reason_label, reason_text, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted')
                """, id, TenantContext.get(), childId, currentUser.subject(), guardianName(),
                Date.valueOf(from), Date.valueOf(to),
                str(body.getOrDefault("period", "full_day")),
                str(body.get("reasonCode")), str(body.getOrDefault("reasonLabel", body.get("reasonCode"))),
                reasonText);
        audit("ABSENCE_DECLARED", id.toString());
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", id.toString());
        result.put("childId", childId.toString());
        result.put("createdBySub", currentUser.subject());
        result.put("createdByName", guardianName());
        result.put("fromDate", from);
        result.put("toDate", to);
        result.put("period", str(body.getOrDefault("period", "full_day")));
        result.put("reasonCode", str(body.get("reasonCode")));
        result.put("reasonLabel", str(body.getOrDefault("reasonLabel", "")));
        result.put("reasonText", reasonText);
        result.put("createdAt", Instant.now().toString());
        result.put("status", "pending");
        result.put("guardianId", currentUser.subject());
        return result;
    }

    private List<Map<String, Object>> absenceDeclarations(Set<UUID> ids) {
        List<Map<String, Object>> out = new ArrayList<>();
        for (UUID id : ids) {
            out.addAll(jdbc.queryForList("""
                    SELECT id, child_id AS "childId", created_by_sub AS "createdBySub",
                           created_by_name AS "createdByName", from_date AS "fromDate", to_date AS "toDate",
                           period, reason_code AS "reasonCode", reason_label AS "reasonLabel",
                           reason_text AS "reasonText", status, created_at AS "createdAt"
                      FROM family_absence_declaration WHERE child_id = ? ORDER BY from_date DESC
                    """, id));
        }
        return out;
    }

    /* ------------------------------------------------------------------ timetable */

    @Transactional(readOnly = true)
    public List<Map<String, Object>> timetable(UUID childId) {
        requireFamilyRead();
        List<Map<String, Object>> out = new ArrayList<>();
        for (UUID id : scope(childId)) out.addAll(timetableEntries(id));
        return out;
    }

    private List<Map<String, Object>> timetableEntries(UUID childId) {
        return jdbc.query("""
                SELECT id, child_id, day_of_week, start_time, end_time, subject, room, teacher_name, change_kind, change_note
                  FROM family_timetable_entry WHERE child_id = ? ORDER BY day_of_week, start_time
                """, (rs, n) -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", rs.getString("id"));
            m.put("childId", rs.getString("child_id"));
            m.put("day", rs.getInt("day_of_week"));
            m.put("start", fmtTime(rs.getTime("start_time")));
            m.put("end", fmtTime(rs.getTime("end_time")));
            m.put("subject", rs.getString("subject"));
            m.put("teacher", rs.getString("teacher_name"));
            m.put("room", rs.getString("room"));
            String kind = rs.getString("change_kind");
            if (kind != null) m.put("change", Map.of("kind", kind, "note", Objects.toString(rs.getString("change_note"), "")));
            return m;
        }, childId);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> calendarEvents() {
        return jdbc.queryForList("""
                SELECT id, title, starts_on AS "start", ends_on AS "end", kind
                  FROM family_calendar_event ORDER BY starts_on
                """);
    }

    /* ------------------------------------------------------------------ homework */

    @Transactional(readOnly = true)
    public List<Map<String, Object>> homework(UUID childId) {
        requireFamilyRead();
        return homeworkForScope(scope(childId));
    }

    private List<Map<String, Object>> homeworkForScope(Set<UUID> ids) {
        List<Map<String, Object>> out = new ArrayList<>();
        String sub = currentUser.subject();
        for (UUID id : ids) {
            out.addAll(jdbc.query("""
                    SELECT h.id, h.child_id, h.subject, h.title, h.instructions, h.teacher_name,
                           h.assigned_at, h.due_at, h.attachment_name, r.read_at
                      FROM family_homework_item h
                      LEFT JOIN family_homework_read r ON r.homework_id = h.id AND r.guardian_subject = ?
                     WHERE h.child_id = ? ORDER BY h.due_at
                    """, (rs, n) -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", rs.getString("id"));
                m.put("childId", rs.getString("child_id"));
                m.put("subject", rs.getString("subject"));
                m.put("title", rs.getString("title"));
                m.put("description", Objects.toString(rs.getString("instructions"), ""));
                m.put("teacher", rs.getString("teacher_name"));
                m.put("assignedAt", fmtDate(rs.getDate("assigned_at")));
                m.put("dueAt", fmtDate(rs.getDate("due_at")));
                String att = rs.getString("attachment_name");
                m.put("attachments", att == null ? List.of() : List.of(Map.of("id", "att", "name", att, "kind", "pdf")));
                Timestamp readAt = rs.getTimestamp("read_at");
                if (readAt != null) m.put("readAt", readAt.toInstant().toString());
                return m;
            }, sub, id));
        }
        return out;
    }

    @Transactional
    public Map<String, Object> markHomeworkRead(String id) {
        requireFamilyWrite();
        UUID hwId = parseId(id);
        UUID childId = childIdForHomework(hwId);
        requireChildAccess(childId);
        jdbc.update("""
                INSERT INTO family_homework_read (id, school_id, homework_id, guardian_subject)
                VALUES (?, ?, ?, ?) ON CONFLICT (school_id, homework_id, guardian_subject) DO NOTHING
                """, Uuids.newId(), TenantContext.get(), hwId, currentUser.subject());
        return jdbc.queryForMap("SELECT id, child_id AS \"childId\" FROM family_homework_item WHERE id = ?", hwId);
    }

    private UUID childIdForHomework(UUID id) {
        try { return jdbc.queryForObject("SELECT child_id FROM family_homework_item WHERE id = ?", UUID.class, id); }
        catch (EmptyResultDataAccessException e) { throw new NoSuchElementException("Devoir introuvable"); }
    }

    /* ------------------------------------------------------------------ grades */

    @Transactional(readOnly = true)
    public Map<String, Object> grades(UUID childId) {
        requireFamilyRead();
        Set<UUID> ids = scope(childId);
        List<Map<String, Object>> grades = gradesForScope(ids);
        List<Map<String, Object>> bulletins = bulletinsForScope(ids);
        return Map.of("grades", grades, "bulletins", bulletins, "averages", List.of(), "overall", 0, "rankingEnabled", false);
    }

    private List<Map<String, Object>> gradesForScope(Set<UUID> ids) {
        List<Map<String, Object>> out = new ArrayList<>();
        for (UUID id : ids) {
            out.addAll(jdbc.queryForList("""
                    SELECT id, child_id AS "childId", subject, title AS "evaluation", assessed_at AS "date",
                           score, out_of AS "outOf", coefficient, class_average AS "classAverage",
                           comment AS "teacherComment", published_at AS "publishedAt"
                      FROM family_assessment WHERE child_id = ? AND published_at IS NOT NULL ORDER BY assessed_at DESC
                    """, id));
        }
        return out;
    }

    private List<Map<String, Object>> bulletinsForScope(Set<UUID> ids) {
        List<Map<String, Object>> out = new ArrayList<>();
        String sub = currentUser.subject();
        for (UUID id : ids) {
            out.addAll(jdbc.query("""
                    SELECT b.id, b.child_id, b.term, b.published_at, a.id AS ack_id
                      FROM family_bulletin b
                      LEFT JOIN family_bulletin_ack a ON a.bulletin_id = b.id AND a.guardian_subject = ?
                     WHERE b.child_id = ? AND b.published_at IS NOT NULL ORDER BY b.published_at DESC
                    """, (rs, n) -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", rs.getString("id"));
                m.put("childId", rs.getString("child_id"));
                m.put("period", rs.getString("term"));
                m.put("publishedAt", fmtInstant(rs.getTimestamp("published_at")));
                m.put("fileName", "bulletin.pdf");
                m.put("documentHash", "sha256:unknown");
                if (rs.getString("ack_id") != null) {
                    m.put("acknowledgedAt", Instant.now().toString());
                    m.put("acknowledgedBy", guardianName());
                }
                return m;
            }, sub, id));
        }
        return out;
    }

    @Transactional
    public Map<String, Object> acknowledgeBulletin(String id) {
        requireFamilyWrite();
        UUID bid = parseId(id);
        UUID childId = childIdForBulletin(bid);
        requireChildAccess(childId);
        jdbc.update("""
                INSERT INTO family_bulletin_ack (id, school_id, bulletin_id, guardian_subject)
                VALUES (?, ?, ?, ?) ON CONFLICT (school_id, bulletin_id, guardian_subject) DO NOTHING
                """, Uuids.newId(), TenantContext.get(), bid, currentUser.subject());
        audit("BULLETIN_ACKNOWLEDGED", id);
        return Map.of("id", id, "acknowledgedAt", Instant.now().toString(), "acknowledgedBy", guardianName());
    }

    private UUID childIdForBulletin(UUID id) {
        try { return jdbc.queryForObject("SELECT child_id FROM family_bulletin WHERE id = ?", UUID.class, id); }
        catch (EmptyResultDataAccessException e) { throw new NoSuchElementException("Bulletin introuvable"); }
    }

    /* ------------------------------------------------------------------ messages */

    @Transactional(readOnly = true)
    public List<Map<String, Object>> threads() {
        requireFamilyRead();
        Set<UUID> ids = accessibleChildIds();
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT id, child_id AS "childId", subject, recipient_role AS "recipientRole",
                       participant_name AS "participantName", status, updated_at AS "updatedAt"
                  FROM family_thread ORDER BY updated_at DESC
                """);
        List<Map<String, Object>> out = new ArrayList<>();
        for (Map<String, Object> t : rows) {
            String cid = str(t.get("childId"));
            if (cid != null && !ids.contains(UUID.fromString(cid))) continue;
            UUID tid = UUID.fromString(str(t.get("id")));
            Map<String, Object> m = new LinkedHashMap<>(t);
            m.put("participants", List.of(Map.of("name", guardianName(), "role", "guardian"),
                    Map.of("name", Objects.toString(t.get("participantName"), "Établissement"), "role", Objects.toString(t.get("recipientRole"), "teacher"))));
            m.put("messages", messages(tid));
            m.put("unread", 0);
            m.put("retentionNotice", "Messages conservés 3 ans conformément à la politique de l’établissement.");
            out.add(m);
        }
        return out;
    }

    private List<Map<String, Object>> messages(UUID threadId) {
        return jdbc.query("""
                SELECT id, thread_id, from_name, from_role, body, sent_at, read_at, attachment_name
                  FROM family_message WHERE thread_id = ? ORDER BY sent_at
                """, (rs, n) -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", rs.getString("id"));
            m.put("threadId", rs.getString("thread_id"));
            m.put("fromName", rs.getString("from_name"));
            m.put("fromRole", rs.getString("from_role"));
            m.put("body", rs.getString("body"));
            m.put("at", fmtInstant(rs.getTimestamp("sent_at")));
            Timestamp read = rs.getTimestamp("read_at");
            if (read != null) m.put("readAt", read.toInstant().toString());
            String att = rs.getString("attachment_name");
            m.put("attachments", att == null ? List.of() : List.of(Map.of("id", "att", "name", att, "kind", "pdf", "scanStatus", "pending")));
            return m;
        }, threadId);
    }

    @Transactional
    public Map<String, Object> sendMessage(Map<String, Object> body) {
        requireFamilyWrite();
        String recipientRole = str(body.get("recipientRole"));
        if (!FamilyPolicy.isAllowedMessageRecipient(recipientRole)) {
            throw new AccessDeniedException("Les messages entre responsables légaux ne sont pas relayés par l’établissement");
        }
        String text = Objects.toString(body.get("body"), "").trim();
        if (text.isEmpty()) throw new IllegalArgumentException("Message vide");
        if (text.length() > 4000) throw new IllegalArgumentException("Message trop long");
        String cid = str(body.get("childId"));
        UUID childId = cid == null ? null : parseId(cid);
        if (childId != null) requireChildAccess(childId);
        UUID threadId = Uuids.newId();
        jdbc.update("""
                INSERT INTO family_thread (id, school_id, child_id, subject, recipient_role, participant_name)
                VALUES (?, ?, ?, ?, ?, ?)
                """, threadId, TenantContext.get(), childId, Objects.toString(body.get("subject"), "Demande à l’établissement"),
                recipientRole, recipientRole.equals("direction") ? "Direction" : "Vie scolaire");
        insertMessage(threadId, text, "guardian");
        audit("MESSAGE_SENT", threadId.toString());
        return Map.of("id", threadId.toString(), "subject", Objects.toString(body.get("subject"), ""),
                "participants", List.of(), "messages", List.of(), "unread", 0,
                "retentionNotice", "Messages conservés 3 ans conformément à la politique de l’établissement.");
    }

    @Transactional
    public Map<String, Object> replyThread(String id, String body) {
        requireFamilyWrite();
        UUID tid = parseId(id);
        String text = Objects.toString(body, "").trim();
        if (text.isEmpty()) throw new IllegalArgumentException("Message vide");
        insertMessage(tid, text, "guardian");
        audit("MESSAGE_SENT", tid.toString());
        return Map.of("id", tid.toString());
    }

    @Transactional
    public Map<String, Object> markThreadRead(String id) {
        requireFamilyWrite();
        jdbc.update("UPDATE family_message SET read_at = now() WHERE thread_id = ? AND read_at IS NULL AND from_sub <> ?",
                parseId(id), currentUser.subject());
        return Map.of("read", true);
    }

    @Transactional
    public Map<String, Object> reportThread(String id) {
        requireFamilyWrite();
        jdbc.update("INSERT INTO family_thread_report (id, school_id, thread_id, reported_by_sub) VALUES (?, ?, ?, ?)",
                Uuids.newId(), TenantContext.get(), parseId(id), currentUser.subject());
        audit("MESSAGE_ABUSE_REPORTED", id);
        return Map.of("reported", true);
    }

    private void insertMessage(UUID threadId, String body, String role) {
        jdbc.update("""
                INSERT INTO family_message (id, school_id, thread_id, from_sub, from_name, from_role, body)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """, Uuids.newId(), TenantContext.get(), threadId, currentUser.subject(), guardianName(), role, body);
        jdbc.update("UPDATE family_thread SET updated_at = now() WHERE id = ?", threadId);
    }

    /* ------------------------------------------------------------------ announcements */

    @Transactional(readOnly = true)
    public List<Map<String, Object>> announcements() {
        requireFamilyRead();
        Set<UUID> ids = accessibleChildIds();
        String sub = currentUser.subject();
        return jdbc.query("""
                SELECT a.id, a.title, a.body, a.author, a.audience, a.published_at, a.requires_receipt, a.category,
                       r.id AS read_id
                  FROM family_announcement a
                  LEFT JOIN family_announcement_read r ON r.announcement_id = a.id AND r.guardian_subject = ?
                 WHERE NOT EXISTS (SELECT 1 FROM family_announcement_child c WHERE c.announcement_id = a.id)
                    OR EXISTS (SELECT 1 FROM family_announcement_child c
                                WHERE c.announcement_id = a.id AND c.child_id = ANY(?))
                 ORDER BY a.published_at DESC
                """, (rs, n) -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", rs.getString("id"));
            m.put("title", rs.getString("title"));
            m.put("body", rs.getString("body"));
            m.put("author", rs.getString("author"));
            m.put("audience", rs.getString("audience"));
            m.put("publishedAt", fmtInstant(rs.getTimestamp("published_at")));
            m.put("requiresReceipt", rs.getBoolean("requires_receipt"));
            m.put("category", rs.getString("category"));
            if (rs.getString("read_id") != null) m.put("readAt", Instant.now().toString());
            return m;
        }, sub, ids.toArray(new UUID[0]));
    }

    @Transactional
    public Map<String, Object> markAnnouncementRead(String id) {
        requireFamilyRead();
        jdbc.update("""
                INSERT INTO family_announcement_read (id, school_id, announcement_id, guardian_subject)
                VALUES (?, ?, ?, ?) ON CONFLICT (school_id, announcement_id, guardian_subject) DO NOTHING
                """, Uuids.newId(), TenantContext.get(), parseId(id), currentUser.subject());
        return Map.of("id", id, "readAt", Instant.now().toString());
    }

    /* ------------------------------------------------------------------ forms */

    @Transactional(readOnly = true)
    public List<Map<String, Object>> forms(UUID childId) {
        requireFamilyRead();
        return formsForScope(scope(childId));
    }

    private List<Map<String, Object>> formsForScope(Set<UUID> ids) {
        List<Map<String, Object>> out = new ArrayList<>();
        for (UUID id : ids) {
            List<Map<String, Object>> forms = jdbc.queryForList("""
                    SELECT id, child_id AS "childId", template_id AS "templateId", title, description,
                           form_type AS "formType", signatory_rule AS "signatoryRule", status,
                           due_at AS "dueAt", issued_at AS "issuedAt", withdrawable,
                           legal_notice AS "legalNotice", attachment_name AS "attachmentName", routes_to AS "routesTo"
                      FROM family_form_assignment WHERE child_id = ? ORDER BY due_at
                    """, id);
            for (Map<String, Object> f : forms) {
                UUID fid = UUID.fromString(str(f.get("id")));
                f.put("signatures", signatures(fid));
                f.put("requiredSignerSubs", requiredSigners(fid));
            }
            out.addAll(forms);
        }
        return out;
    }

    private List<Map<String, Object>> signatures(UUID formId) {
        return jdbc.queryForList("""
                SELECT id, signer_sub AS "signerSub", signer_name AS "signerName", signed_at AS "signedAt",
                       document_hash AS "documentHash", ip_hash AS "ipHash", device, method, proof_label AS "proofLabel"
                  FROM family_form_signature WHERE form_id = ? ORDER BY signed_at
                """, formId);
    }

    private List<String> requiredSigners(UUID formId) {
        return jdbc.queryForList("SELECT signer_sub FROM family_form_required_signer WHERE form_id = ? ORDER BY signer_sub",
                String.class, formId);
    }

    @Transactional
    public Map<String, Object> signForm(String id, Map<String, Object> body) {
        requireFamilyWrite();
        UUID formId = parseId(id);
        Map<String, Object> form = formRow(formId);
        UUID childId = parseId(str(form.get("childId")));
        requireChildAccess(childId);
        String sub = currentUser.subject();
        // Simplified but enforced: only allowed signers can sign, and one_guardian completes after one eligible signature.
        List<String> required = requiredSigners(formId);
        List<String> signed = jdbc.queryForList("SELECT signer_sub FROM family_form_signature WHERE form_id = ?", String.class, formId);
        String rule = str(form.get("signatoryRule"));
        boolean oneGuardian = "one_guardian".equals(rule);
        boolean already = signed.contains(sub);
        boolean eligible = oneGuardian ? required.contains(sub) || required.isEmpty() : required.contains(sub);
        if ("withdrawn".equals(form.get("status")) || "signed".equals(form.get("status")) || already || !eligible) {
            throw new AccessDeniedException("Signature impossible");
        }
        String device = Objects.toString(body == null ? null : body.get("device"), "Navigateur web");
        String method = "mfa".equals(body == null ? null : body.get("method")) ? "mfa" : "password";
        jdbc.update("""
                INSERT INTO family_form_signature
                    (id, school_id, form_id, signer_sub, signer_name, document_hash, ip_hash, device, method, proof_label)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (school_id, form_id, signer_sub) DO NOTHING
                """, Uuids.newId(), TenantContext.get(), formId, sub, guardianName(),
                "sha256:" + formId + ":" + sub, "hmac:redacted", device, method,
                "mfa".equals(method) ? "Signature avancée — MFA vérifié" : "Signature simple — identité de session");
        boolean complete = oneGuardian || required.stream().allMatch(s -> s.equals(sub) || signed.contains(s));
        jdbc.update("UPDATE family_form_assignment SET status = ?, updated_at = now() WHERE id = ?",
                complete ? "signed" : "partially_signed", formId);
        audit("FORM_SIGNED", id);
        return Map.of("assignment", formRow(formId), "state", Map.of("allowed", false, "reason", "ok"));
    }

    @Transactional
    public Map<String, Object> withdrawForm(String id) {
        requireFamilyWrite();
        UUID formId = parseId(id);
        Map<String, Object> form = formRow(formId);
        requireChildAccess(parseId(str(form.get("childId"))));
        if (!Boolean.TRUE.equals(form.get("withdrawable"))) throw new AccessDeniedException("Ce document ne peut pas être retiré");
        jdbc.update("UPDATE family_form_assignment SET status = 'withdrawn', updated_at = now() WHERE id = ?", formId);
        jdbc.update("DELETE FROM family_form_signature WHERE form_id = ? AND signer_sub = ?", formId, currentUser.subject());
        audit("FORM_WITHDRAWN", id);
        return formRow(formId);
    }

    private Map<String, Object> formRow(UUID id) {
        try {
            Map<String, Object> f = jdbc.queryForMap("""
                    SELECT id, child_id AS "childId", template_id AS "templateId", title, description,
                           form_type AS "formType", signatory_rule AS "signatoryRule", status,
                           due_at AS "dueAt", issued_at AS "issuedAt", withdrawable,
                           legal_notice AS "legalNotice", attachment_name AS "attachmentName", routes_to AS "routesTo"
                      FROM family_form_assignment WHERE id = ?
                    """, id);
            f.put("signatures", signatures(id));
            f.put("requiredSignerSubs", requiredSigners(id));
            return f;
        } catch (EmptyResultDataAccessException e) { throw new NoSuchElementException("Formulaire introuvable"); }
    }

    /* ------------------------------------------------------------------ collectors / appointments / activities / canteen */

    @Transactional(readOnly = true)
    public List<Map<String, Object>> collectors(UUID childId) {
        requireFamilyRead();
        return collectorsForScope(scope(childId));
    }

    private List<Map<String, Object>> collectorsForScope(Set<UUID> ids) {
        List<Map<String, Object>> out = new ArrayList<>();
        for (UUID id : ids) {
            out.addAll(jdbc.queryForList("""
                    SELECT id, child_id AS "childId", name, relationship, phone, id_check_required AS "idCheckRequired",
                           valid_from AS "validFrom", valid_to AS "validTo", status, created_by_sub AS "createdBySub",
                           created_by_name AS "createdByName", approved_by AS "approvedBy", approved_at AS "approvedAt", note
                      FROM family_authorized_collector WHERE child_id = ? ORDER BY created_at DESC
                    """, id));
        }
        return out;
    }

    @Transactional
    public Map<String, Object> addCollector(Map<String, Object> body) {
        requireFamilyWrite();
        UUID childId = parseId(str(body.get("childId")));
        requireChildAccess(childId);
        if (str(body.get("name")) == null || str(body.get("relationship")) == null || str(body.get("phone")) == null) {
            throw new IllegalArgumentException("Nom, lien et téléphone obligatoires");
        }
        UUID id = Uuids.newId();
        String validFrom = str(body.get("validFrom"));
        jdbc.update("""
                INSERT INTO family_authorized_collector
                    (id, school_id, child_id, name, relationship, phone, id_check_required,
                     valid_from, valid_to, status, created_by_sub, created_by_name, note)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
                """, id, TenantContext.get(), childId, body.get("name"), body.get("relationship"), body.get("phone"),
                Boolean.TRUE.equals(body.get("idCheckRequired")),
                Date.valueOf(validFrom == null ? LocalDate.now().toString() : validFrom),
                body.get("validTo") == null ? null : Date.valueOf(str(body.get("validTo"))),
                currentUser.subject(), guardianName(), body.get("note"));
        audit("COLLECTOR_ADDED", id.toString());
        return jdbc.queryForMap("SELECT id, child_id AS \"childId\", name, relationship, phone, status FROM family_authorized_collector WHERE id = ?", id);
    }

    @Transactional
    public Map<String, Object> updateCollector(String id, Map<String, Object> body) {
        requireFamilyWrite();
        UUID cid = parseId(id);
        UUID childId = jdbc.queryForObject("SELECT child_id FROM family_authorized_collector WHERE id = ?", UUID.class, cid);
        requireChildAccess(childId);
        if (body.get("name") != null) jdbc.update("UPDATE family_authorized_collector SET name = ?, status = 'pending', updated_at = now() WHERE id = ?", body.get("name"), cid);
        if (body.get("phone") != null) jdbc.update("UPDATE family_authorized_collector SET phone = ?, status = 'pending', updated_at = now() WHERE id = ?", body.get("phone"), cid);
        audit("COLLECTOR_UPDATED", id);
        return jdbc.queryForMap("SELECT id, child_id AS \"childId\", name, relationship, phone, status FROM family_authorized_collector WHERE id = ?", cid);
    }

    @Transactional
    public Map<String, Object> removeCollector(String id) {
        requireFamilyWrite();
        UUID cid = parseId(id);
        UUID childId = jdbc.queryForObject("SELECT child_id FROM family_authorized_collector WHERE id = ?", UUID.class, cid);
        requireChildAccess(childId);
        jdbc.update("DELETE FROM family_authorized_collector WHERE id = ?", cid);
        audit("COLLECTOR_REMOVED", id);
        return Map.of("deleted", true);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> appointments(UUID childId) {
        requireFamilyRead();
        List<Map<String, Object>> out = new ArrayList<>();
        for (UUID id : scope(childId)) {
            out.addAll(jdbc.queryForList("""
                    SELECT id, child_id AS "childId", teacher_name AS "teacherName", teacher_role AS "teacherRole",
                           slot_date AS "date", start_time AS "start", end_time AS "end", mode, location, topic,
                           joint_meeting AS "jointMeeting", booked_by_sub AS "bookedBy", booked_by_name AS "bookedByName", status
                      FROM family_appointment_slot WHERE child_id = ? ORDER BY slot_date, start_time
                    """, id));
        }
        return out;
    }

    @Transactional
    public Map<String, Object> bookAppointment(String id) {
        requireFamilyWrite();
        UUID aid = parseId(id);
        Map<String, Object> slot = jdbc.queryForMap("SELECT id, child_id, status FROM family_appointment_slot WHERE id = ?", aid);
        requireChildAccess((UUID) slot.get("child_id"));
        int updated = jdbc.update("""
                UPDATE family_appointment_slot SET booked_by_sub = ?, booked_by_name = ?, status = 'booked', updated_at = now()
                 WHERE id = ? AND status = 'open'
                """, currentUser.subject(), guardianName(), aid);
        if (updated == 0) throw new IllegalStateException("Ce créneau est déjà réservé");
        audit("APPOINTMENT_BOOKED", id);
        return jdbc.queryForMap("SELECT id, child_id AS \"childId\", booked_by_sub AS \"bookedBy\", booked_by_name AS \"bookedByName\", status FROM family_appointment_slot WHERE id = ?", aid);
    }

    @Transactional
    public Map<String, Object> cancelAppointment(String id) {
        requireFamilyWrite();
        UUID aid = parseId(id);
        jdbc.update("UPDATE family_appointment_slot SET booked_by_sub = NULL, booked_by_name = NULL, status = 'open', updated_at = now() WHERE id = ? AND booked_by_sub = ?",
                aid, currentUser.subject());
        audit("APPOINTMENT_CANCELLED", id);
        return jdbc.queryForMap("SELECT id, child_id AS \"childId\", status FROM family_appointment_slot WHERE id = ?", aid);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> activities(UUID childId) {
        requireFamilyRead();
        Set<UUID> ids = scope(childId);
        List<Map<String, Object>> enrolments = new ArrayList<>();
        for (UUID id : ids) {
            enrolments.addAll(jdbc.queryForList("""
                    SELECT id, child_id AS "childId", offering_id AS "offeringId", activity_name AS "activityName",
                           status, waitlist_position AS "waitlistPosition", enrolled_at AS "enrolledAt",
                           fee_cents AS "feeCents", currency, consent_required AS "consentRequired", consent_granted AS "consentGranted"
                      FROM family_activity_enrolment WHERE child_id = ? ORDER BY enrolled_at DESC
                    """, id));
        }
        return Map.of("offerings", List.of(), "activities", List.of(), "enrolments", enrolments);
    }

    @Transactional
    public Map<String, Object> enrolActivity(Map<String, Object> body) {
        requireFamilyWrite();
        UUID childId = parseId(str(body.get("childId")));
        requireChildAccess(childId);
        UUID id = Uuids.newId();
        jdbc.update("""
                INSERT INTO family_activity_enrolment
                    (id, school_id, child_id, offering_id, activity_name, status, enrolled_at, fee_cents, consent_required, consent_granted)
                VALUES (?, ?, ?, ?, ?, 'requested', CURRENT_DATE, 0, true, ?)
                """, id, TenantContext.get(), childId,
                body.get("offeringId") == null ? null : UUID.fromString(str(body.get("offeringId"))),
                Objects.toString(body.get("activityName"), "Activité"), Boolean.TRUE.equals(body.get("consent")));
        audit("ACTIVITY_ENROLLED", id.toString());
        return jdbc.queryForMap("SELECT id, child_id AS \"childId\", activity_name AS \"activityName\", status FROM family_activity_enrolment WHERE id = ?", id);
    }

    @Transactional
    public Map<String, Object> cancelActivity(String id) {
        requireFamilyWrite();
        UUID eid = parseId(id);
        UUID childId = jdbc.queryForObject("SELECT child_id FROM family_activity_enrolment WHERE id = ?", UUID.class, eid);
        requireChildAccess(childId);
        jdbc.update("UPDATE family_activity_enrolment SET status = 'cancelled', updated_at = now() WHERE id = ?", eid);
        audit("ACTIVITY_CANCELLED", id);
        return jdbc.queryForMap("SELECT id, status FROM family_activity_enrolment WHERE id = ?", eid);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> canteen(UUID childId) {
        requireFamilyRead();
        Set<UUID> ids = scope(childId);
        List<Map<String, Object>> menus = jdbc.queryForList("""
                SELECT id, meal_date AS "date", main, vegetarian, allergens FROM family_canteen_menu ORDER BY meal_date
                """);
        List<Map<String, Object>> reservations = new ArrayList<>();
        for (UUID id : ids) {
            reservations.addAll(jdbc.queryForList("""
                    SELECT id, child_id AS "childId", meal_date AS "date", status, created_at AS "createdAt"
                      FROM family_canteen_reservation WHERE child_id = ? ORDER BY meal_date
                    """, id));
        }
        return Map.of("mode", "school", "menus", menus, "reservations", reservations);
    }

    @Transactional
    public Map<String, Object> reserveCanteen(Map<String, Object> body) {
        requireFamilyWrite();
        UUID childId = parseId(str(body.get("childId")));
        requireChildAccess(childId);
        LocalDate date = LocalDate.parse(str(body.get("date")));
        if (!FamilyPolicy.canteenOrderOpen(date, LocalDateTime.now(), 10)) throw new IllegalStateException("Réservation fermée");
        UUID id = Uuids.newId();
        jdbc.update("""
                INSERT INTO family_canteen_reservation (id, school_id, child_id, meal_date, status, created_by_sub)
                VALUES (?, ?, ?, ?, 'reserved', ?)
                ON CONFLICT (school_id, child_id, meal_date) DO UPDATE SET status = 'reserved', cancelled_at = NULL, updated_at = now()
                """, id, TenantContext.get(), childId, Date.valueOf(date), currentUser.subject());
        audit("CANTEEN_RESERVED", id.toString());
        return jdbc.queryForMap("SELECT id, child_id AS \"childId\", meal_date AS \"date\", status FROM family_canteen_reservation WHERE child_id = ? AND meal_date = ?", childId, Date.valueOf(date));
    }

    @Transactional
    public Map<String, Object> cancelCanteen(String id) {
        requireFamilyWrite();
        UUID rid = parseId(id);
        UUID childId = jdbc.queryForObject("SELECT child_id FROM family_canteen_reservation WHERE id = ?", UUID.class, rid);
        requireChildAccess(childId);
        jdbc.update("UPDATE family_canteen_reservation SET status = 'cancelled', cancelled_at = now(), updated_at = now() WHERE id = ?", rid);
        audit("CANTEEN_CANCELLED", id);
        return jdbc.queryForMap("SELECT id, child_id AS \"childId\", status FROM family_canteen_reservation WHERE id = ?", rid);
    }

    /* ------------------------------------------------------------------ billing */

    @Transactional(readOnly = true)
    public Map<String, Object> billing() {
        requireFamilyRead();
        List<Map<String, Object>> invoices = invoicesForSub(currentUser.subject());
        int balance = invoices.stream().filter(i -> !"paid".equals(str(i.get("status")))).mapToInt(i -> asInt(i.get("amountCents"))).sum();
        String nextDue = invoices.stream().filter(i -> !"paid".equals(str(i.get("status")))).map(i -> str(i.get("dueDate"))).filter(Objects::nonNull).sorted().findFirst().orElse(null);
        return Map.of("balanceCents", balance, "currency", "EUR",
                "dueCount", (int) invoices.stream().filter(i -> !"paid".equals(str(i.get("status")))).count(),
                "nextDueDate", nextDue == null ? "" : nextDue,
                "invoices", invoices,
                "payerVisibility", "Facturation — chaque payeur ne voit que ses factures");
    }

    private List<Map<String, Object>> invoicesForSub(String sub) {
        return jdbc.queryForList("""
                SELECT i.id, i.child_id AS "studentId", i.label, i.amount_cents AS "amountCents", i.currency,
                       i.due_date AS "dueDate", i.status
                  FROM family_invoice i
                  JOIN family_invoice_payer p ON p.invoice_id = i.id AND p.payer_sub = ?
                 ORDER BY i.due_date
                """, sub);
    }

    @Transactional
    public Map<String, Object> payInvoice(String id, String method) {
        requireFamilyPay();
        UUID iid = parseId(id);
        Integer payerCount = jdbc.queryForObject("SELECT count(*) FROM family_invoice_payer WHERE invoice_id = ? AND payer_sub = ?",
                Integer.class, iid, currentUser.subject());
        if (payerCount == null || payerCount == 0) throw new AccessDeniedException("Facture hors de votre périmètre");
        Map<String, Object> invoice = jdbc.queryForMap("SELECT id, amount_cents, currency, status FROM family_invoice WHERE id = ?", iid);
        if ("paid".equals(invoice.get("status"))) throw new IllegalStateException("Facture déjà réglée");
        UUID receiptId = Uuids.newId();
        String reference = "psp_" + receiptId.toString().replace("-", "").substring(0, 12);
        String name = "recu-" + iid + ".pdf";
        jdbc.update("UPDATE family_invoice SET status = 'paid', updated_at = now() WHERE id = ?", iid);
        jdbc.update("""
                INSERT INTO family_payment_receipt
                    (id, school_id, invoice_id, payer_sub, amount_cents, currency, method, psp_reference, receipt_name, step_up_used)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, true)
                """, receiptId, TenantContext.get(), iid, currentUser.subject(),
                asInt(invoice.get("amount_cents")), Objects.toString(invoice.get("currency"), "EUR"),
                "sepa".equals(method) ? "sepa" : "card", reference, name);
        audit("INVOICE_PAID", id);
        return Map.of("id", receiptId.toString(), "invoiceId", iid.toString(),
                "amountCents", asInt(invoice.get("amount_cents")), "currency", Objects.toString(invoice.get("currency"), "EUR"),
                "paidAt", Instant.now().toString(), "method", "sepa".equals(method) ? "sepa" : "card",
                "pspReference", reference, "receiptName", name, "stepUpUsed", true);
    }

    @Transactional
    public Map<String, Object> requestMandate() {
        requireFamilyWrite();
        UUID id = Uuids.newId();
        jdbc.update("""
                INSERT INTO family_mandate (id, school_id, payer_sub, iban_masked, status, signed_at)
                VALUES (?, ?, ?, 'FR76 •••• •••• 4210', 'pending', now())
                ON CONFLICT (school_id, payer_sub) DO UPDATE SET updated_at = now()
                """, id, TenantContext.get(), currentUser.subject());
        audit("SEPA_MANDATE_REQUESTED", "mandate");
        List<Map<String, Object>> rows = jdbc.queryForList("SELECT id, iban_masked AS \"ibanMasked\", status, signed_at AS \"signedAt\" FROM family_mandate WHERE payer_sub = ?", currentUser.subject());
        return rows.isEmpty() ? Map.of("id", id.toString(), "ibanMasked", "FR76 •••• •••• 4210", "status", "pending", "signedAt", Instant.now().toString()) : rows.get(0);
    }

    /* ------------------------------------------------------------------ documents / preferences / misc */

    @Transactional(readOnly = true)
    public List<Map<String, Object>> documents(UUID childId) {
        requireFamilyRead();
        List<Map<String, Object>> out = new ArrayList<>();
        for (UUID id : scope(childId)) {
            out.addAll(jdbc.queryForList("""
                    SELECT id, child_id AS "childId", type, title, status, available_at AS "availableAt",
                           expires_at AS "expiresAt", watermark, requires_approval AS "requiresApproval", requested_at AS "requestedAt"
                      FROM family_document WHERE child_id = ? ORDER BY created_at DESC
                    """, id));
        }
        return out;
    }

    @Transactional
    public Map<String, Object> requestDocument(Map<String, Object> body) {
        requireFamilyWrite();
        UUID childId = parseId(str(body.get("childId")));
        requireChildAccess(childId);
        UUID id = Uuids.newId();
        jdbc.update("""
                INSERT INTO family_document (id, school_id, child_id, type, title, status, requires_approval, requested_at, requested_by_sub)
                VALUES (?, ?, ?, ?, ?, 'requested', true, now(), ?)
                """, id, TenantContext.get(), childId, Objects.toString(body.get("type"), "certificat_scolarite"),
                Objects.toString(body.get("title"), "Document"), currentUser.subject());
        audit("DOCUMENT_REQUESTED", id.toString());
        return jdbc.queryForMap("SELECT id, child_id AS \"childId\", type, title, status, requires_approval AS \"requiresApproval\", requested_at AS \"requestedAt\" FROM family_document WHERE id = ?", id);
    }

    @Transactional
    public Map<String, Object> downloadDocument(String id) {
        requireFamilyRead();
        UUID did = parseId(id);
        Map<String, Object> doc = jdbc.queryForMap("SELECT id, child_id, title, status FROM family_document WHERE id = ?", did);
        UUID childId = (UUID) doc.get("child_id");
        requireChildAccess(childId);
        if (!"available".equals(doc.get("status"))) throw new IllegalStateException("Document non disponible");
        String watermark = guardianName() + " · " + LocalDate.now();
        jdbc.update("""
                INSERT INTO family_document_download (id, school_id, document_id, guardian_subject, watermark, token_hash)
                VALUES (?, ?, ?, ?, ?, ?)
                """, Uuids.newId(), TenantContext.get(), did, currentUser.subject(), watermark, "tok-" + Uuids.newId());
        audit("DOCUMENT_DOWNLOADED", id);
        Map<String, Object> download = Map.of("id", Uuids.newId().toString(), "documentId", id, "documentTitle", Objects.toString(doc.get("title")),
                "childId", childId.toString(), "downloadedAt", Instant.now().toString(), "watermark", watermark, "ipHash", "hmac:redacted");
        return Map.of("download", download, "url", "/v1/family/documents/" + id + "/file?token=mock");
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> documentDownloads() {
        requireFamilyRead();
        return jdbc.queryForList("""
                SELECT d.id, d.document_id AS "documentId", f.title AS "documentTitle", f.child_id AS "childId",
                       d.downloaded_at AS "downloadedAt", d.watermark, d.ip_hash AS "ipHash"
                  FROM family_document_download d JOIN family_document f ON f.id = d.document_id
                 WHERE d.guardian_subject = ? ORDER BY d.downloaded_at DESC
                """, currentUser.subject());
    }

    @Transactional(readOnly = true)
    public Map<String, Object> preferences() {
        requireFamilyRead();
        return jdbc.queryForList("SELECT in_app AS \"inApp\", email, push, digest_only AS \"digestOnly\", language FROM family_notification_preference WHERE guardian_subject = ?", currentUser.subject())
                .stream().findFirst().orElse(Map.of("inApp", true, "email", true, "push", false, "digestOnly", false, "language", "fr", "pushContentFree", true,
                        "items", List.of(), "digest", "off", "quietHours", Map.of("start", "18:00", "end", "08:00", "enabled", true),
                        "accessibility", Map.of("textSize", "normal", "highContrast", false, "reducedMotion", false)));
    }

    @Transactional
    public Map<String, Object> savePreferences(Map<String, Object> body) {
        requireFamilyWrite();
        jdbc.update("""
                INSERT INTO family_notification_preference (id, school_id, guardian_subject, in_app, email, push, digest_only, language)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (school_id, guardian_subject) DO UPDATE SET in_app = EXCLUDED.in_app, email = EXCLUDED.email,
                    push = EXCLUDED.push, digest_only = EXCLUDED.digest_only, language = EXCLUDED.language, updated_at = now()
                """, Uuids.newId(), TenantContext.get(), currentUser.subject(),
                body == null || Boolean.TRUE.equals(body.getOrDefault("inApp", true)),
                body == null || Boolean.TRUE.equals(body.getOrDefault("email", true)),
                body != null && Boolean.TRUE.equals(body.get("push")),
                body != null && Boolean.TRUE.equals(body.get("digestOnly")),
                body == null ? "fr" : Objects.toString(body.getOrDefault("language", "fr")));
        audit("PREFERENCES_UPDATED", "notification-preferences");
        return body == null ? preferences() : body;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> devices() {
        requireFamilyRead();
        return jdbc.queryForList("SELECT id, device, last_seen_at AS \"lastSeen\", revoked_at AS \"revokedAt\" FROM family_device_session WHERE guardian_subject = ? AND revoked_at IS NULL ORDER BY last_seen_at DESC", currentUser.subject());
    }

    @Transactional
    public Map<String, Object> revokeDevice(String id) {
        requireFamilyWrite();
        jdbc.update("UPDATE family_device_session SET revoked_at = now() WHERE id = ? AND guardian_subject = ?", parseId(id), currentUser.subject());
        audit("DEVICE_REVOKED", id);
        return Map.of("revoked", true);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> dataRequests() {
        requireFamilyRead();
        return jdbc.queryForList("SELECT id, child_id AS \"childId\", type, subject, requested_at AS \"requestedAt\", due_at AS \"dueAt\", status FROM family_data_request WHERE guardian_subject = ? ORDER BY requested_at DESC", currentUser.subject());
    }

    @Transactional
    public Map<String, Object> createDataRequest(Map<String, Object> body) {
        requireFamilyWrite();
        UUID childId = parseId(str(body.get("childId")));
        requireChildAccess(childId);
        UUID id = Uuids.newId();
        jdbc.update("""
                INSERT INTO family_data_request (id, school_id, guardian_subject, child_id, type, subject, due_at)
                VALUES (?, ?, ?, ?, ?, ?, now() + interval '30 days')
                """, id, TenantContext.get(), currentUser.subject(), childId,
                Objects.toString(body.get("type"), "access"), Objects.toString(body.get("subject"), ""));
        audit("DATA_REQUEST_CREATED", id.toString());
        return jdbc.queryForMap("SELECT id, child_id AS \"childId\", type, subject, requested_at AS \"requestedAt\", due_at AS \"dueAt\", status FROM family_data_request WHERE id = ?", id);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> consents() {
        requireFamilyRead();
        return consentsForScope(accessibleChildIds());
    }

    private List<Map<String, Object>> consentsForScope(Set<UUID> ids) {
        List<Map<String, Object>> out = new ArrayList<>();
        for (UUID id : ids) out.addAll(jdbc.queryForList("""
                SELECT id, child_id AS "childId", purpose, label, legal_basis AS "legalBasis", granted,
                       version_label AS "version", granted_at AS "grantedAt", withdrawn_at AS "withdrawnAt", proof_hash AS "proofHash", text
                  FROM family_consent WHERE child_id = ? ORDER BY label
                """, id));
        return out;
    }

    @Transactional
    public Map<String, Object> withdrawConsent(String id) {
        requireFamilyWrite();
        UUID cid = parseId(id);
        Map<String, Object> c = jdbc.queryForMap("SELECT child_id, legal_basis FROM family_consent WHERE id = ?", cid);
        requireChildAccess((UUID) c.get("child_id"));
        if (!"consent".equals(c.get("legal_basis"))) throw new IllegalStateException("Ce traitement ne repose pas sur le consentement");
        jdbc.update("UPDATE family_consent SET granted = false, withdrawn_at = now(), updated_at = now() WHERE id = ?", cid);
        audit("CONSENT_WITHDRAWN", id);
        return jdbc.queryForMap("SELECT id, child_id AS \"childId\", purpose, label, legal_basis AS \"legalBasis\", granted, withdrawn_at AS \"withdrawnAt\" FROM family_consent WHERE id = ?", cid);
    }

    @Transactional
    public Map<String, Object> submitConcern(Map<String, Object> body) {
        requireFamilyWrite();
        UUID childId = body.get("childId") == null ? null : parseId(str(body.get("childId")));
        if (childId != null) requireChildAccess(childId);
        String message = Objects.toString(body.get("message"), "").trim();
        if (message.length() < 10) throw new IllegalArgumentException("Décrivez brièvement la situation");
        UUID id = Uuids.newId();
        jdbc.update("INSERT INTO family_concern (id, school_id, child_id, guardian_subject, message) VALUES (?, ?, ?, ?, ?)",
                id, TenantContext.get(), childId, currentUser.subject(), message);
        audit("CONCERN_REPORTED", id.toString());
        return Map.of("id", id.toString(), "reference", "FAM-" + id.toString().substring(0, 8).toUpperCase(),
                "submittedAt", Instant.now().toString(), "routedTo", List.of("direction", "safeguarding"),
                "message", "Votre signalement a été transmis à la direction et au référent protection de l’enfance.");
    }

    @Transactional(readOnly = true)
    public Map<String, Object> policy() {
        requireFamilyRead();
        return policyMap();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> invitations() {
        requireFamilyRead();
        return invitationsForScope(accessibleChildIds());
    }

    private List<Map<String, Object>> invitationsForScope(Set<UUID> ids) {
        List<Map<String, Object>> out = new ArrayList<>();
        for (UUID id : ids) {
            out.addAll(jdbc.query("""
                    SELECT i.id, i.child_id, s.first_name || ' ' || s.last_name AS child_name,
                           i.invited_name, i.invited_email, i.status, i.attempts, i.max_attempts, i.expires_at, i.created_at
                      FROM guardian_invitation i JOIN student s ON s.id = i.child_id WHERE i.child_id = ? ORDER BY i.created_at DESC
                    """, (rs, n) -> {
                String status = rs.getString("status");
                Instant expires = rs.getTimestamp("expires_at").toInstant();
                boolean expired = Instant.now().isAfter(expires);
                String effective = expired && "pending".equals(status) ? "expired" : status;
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", rs.getString("id"));
                m.put("childId", rs.getString("child_id"));
                m.put("childName", rs.getString("child_name"));
                m.put("invitedName", rs.getString("invited_name"));
                m.put("invitedEmail", rs.getString("invited_email"));
                m.put("status", effective);
                m.put("attempts", rs.getInt("attempts"));
                m.put("maxAttempts", rs.getInt("max_attempts"));
                m.put("expiresAt", expires.toString());
                m.put("createdAt", fmtInstant(rs.getTimestamp("created_at")));
                m.put("state", Map.of("usable", "pending".equals(effective), "reason", effective));
                return m;
            }, id));
        }
        return out;
    }

    @Transactional(readOnly = true)
    public Object otherGuardianContact(UUID childId) {
        requireFamilyRead();
        requireChildAccess(childId);
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT guardian_subject, guardian_name, guardian_email FROM guardian_child
                 WHERE student_id = ? AND guardian_subject <> ? AND lower(status) = 'active'
                """, childId, currentUser.subject());
        if (rows.isEmpty()) return null;
        Map<String, Object> r = rows.get(0);
        return Map.of("name", Objects.toString(r.get("guardian_name"), ""), "email", Objects.toString(r.get("guardian_email"), ""),
                "phone", "", "masked", false);
    }

    /* ------------------------------------------------------------------ ICS */

    @Transactional
    public Map<String, Object> createIcsFeed(String childIdStr) {
        requireFamilyRead();
        UUID childId = parseId(childIdStr);
        requireChildAccess(childId);
        String token = "ics-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        UUID id = Uuids.newId();
        jdbc.update("""
                INSERT INTO family_ics_token (id, school_id, guardian_subject, child_id, token_hash, expires_at)
                VALUES (?, ?, ?, ?, ?, now() + interval '7 days')
                """, id, TenantContext.get(), currentUser.subject(), childId, token);
        audit("ICS_FEED_CREATED", token);
        return Map.of("token", token, "childId", childId.toString(), "url", "/v1/family/calendar/ics?token=" + token,
                "createdAt", Instant.now().toString(), "genericTitles", true);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getIcsFeed(UUID childId) {
        requireFamilyRead();
        UUID cid = childId != null ? childId : accessibleChildIds().stream().findFirst().orElse(null);
        if (cid == null) throw new NoSuchElementException("Aucun abonnement");
        requireChildAccess(cid);
        return jdbc.queryForList("""
                SELECT token_hash AS "token", child_id AS "childId", created_at AS "createdAt", revoked_at
                  FROM family_ics_token WHERE guardian_subject = ? AND child_id = ? AND revoked_at IS NULL
                  ORDER BY created_at DESC LIMIT 1
                """, currentUser.subject(), cid).stream().findFirst()
                .map(r -> { Map<String, Object> m = new LinkedHashMap<>(r); m.put("url", "/v1/family/calendar/ics?token=" + r.get("token")); m.put("genericTitles", true); m.remove("revoked_at"); return m; })
                .orElseThrow(() -> new NoSuchElementException("Aucun abonnement"));
    }

    @Transactional
    public Map<String, Object> revokeIcsFeed(String token) {
        requireFamilyRead();
        jdbc.update("UPDATE family_ics_token SET revoked_at = now() WHERE token_hash = ? AND guardian_subject = ? AND revoked_at IS NULL",
                token, currentUser.subject());
        audit("ICS_FEED_REVOKED", token);
        return Map.of("revoked", true);
    }

    /* ------------------------------------------------------------------ helpers */

    private String guardianName() {
        // Prefer name from active link; fallback to subject.
        try {
            List<String> names = jdbc.queryForList("SELECT guardian_name FROM guardian_child WHERE guardian_subject = ? LIMIT 1", String.class, currentUser.subject());
            if (!names.isEmpty() && names.get(0) != null) return names.get(0);
        } catch (Exception ignored) {}
        return currentUser.subject();
    }

    private List<Map<String, Object>> linksForSub(String sub) {
        return jdbc.queryForList("""
                SELECT id, guardian_subject AS "guardianSub", guardian_name AS "guardianName", guardian_email AS "guardianEmail",
                       student_id AS "childId", relationship, holds_parental_authority AS "holdsParentalAuthority",
                       right_to_information AS "rightToInformation", is_financial_payer AS "isFinancialPayer",
                       is_emergency_contact AS "isEmergencyContact", may_collect_child AS "mayCollectChild",
                       status, valid_from AS "validFrom", valid_to AS "validTo"
                  FROM guardian_child WHERE guardian_subject = ? ORDER BY created_at
                """, sub);
    }

    private List<Map<String, Object>> restrictionsForScope(Set<UUID> childIds) {
        List<Map<String, Object>> out = new ArrayList<>();
        for (UUID id : childIds) out.addAll(restrictionsForChild(id));
        return out;
    }

    private List<Map<String, Object>> restrictionsForChild(UUID childId) {
        return jdbc.queryForList("""
                SELECT id, child_id AS "childId", guardian_subject AS "guardianSub", type, scope,
                       court_document_ref AS "courtDocumentRef", court_document_name AS "courtDocumentName",
                       set_by AS "setBy", effective_from AS "effectiveFrom", effective_to AS "effectiveTo",
                       active, note
                  FROM guardian_restriction WHERE child_id = ? AND guardian_subject = ? AND active = true
                """, childId, currentUser.subject());
    }

    private Map<String, Object> policyMap() {
        return Map.ofEntries(
                Map.entry("agePolicy", "require_student_consent"),
                Map.entry("canteenMode", "school"),
                Map.entry("gradeRankingEnabled", false),
                Map.entry("bothGuardiansMeetingDefault", true),
                Map.entry("officeHours", Map.of("start", "08:00", "end", "17:00", "timezone", "Europe/Paris", "autoReply", "")),
                Map.entry("quietHours", Map.of("start", "18:00", "end", "08:00", "digestOnly", true)),
                Map.entry("mandatoryNoticeChannels", List.of("in_app", "email")),
                Map.entry("signatoryRules", FamilyPolicy.DEFAULT_SIGNATORY_RULES),
                Map.entry("absenceReasons", List.of(
                        Map.of("code", "illness", "label", "Maladie"),
                        Map.of("code", "medical", "label", "Rendez-vous médical"),
                        Map.of("code", "family", "label", "Raison familiale"),
                        Map.of("code", "transport", "label", "Problème de transport"),
                        Map.of("code", "other", "label", "Autre motif"))),
                Map.entry("absenceThresholds", Map.of("unjustified", 4, "late", 3, "label", "Seuil d’alerte défini par l’établissement (informatif)")),
                Map.entry("signatureNotice", "TODO(legal-review)")
        );
    }

    private void audit(String action, String target) {
        try {
            jdbc.update("""
                    INSERT INTO family_audit_event (id, school_id, actor_sub, event_type, target_type, target_id)
                    VALUES (?, ?, ?, ?, 'family', ?)
                    """, Uuids.newId(), TenantContext.get(), currentUser.subject(), action, target);
        } catch (Exception ignored) {
            // audit must not break primary flow in early rollout, but best-effort logged
        }
    }

    private static UUID parseId(String id) {
        if (id == null) throw new IllegalArgumentException("Identifiant manquant");
        return UUID.fromString(id);
    }

    private static String str(Object v) { return v == null ? null : String.valueOf(v); }
    private static int asInt(Object v) { return v == null ? 0 : (v instanceof Number n ? n.intValue() : Integer.parseInt(String.valueOf(v))); }
    private static String fmtDate(Date d) { return d == null ? null : d.toLocalDate().toString(); }
    private static String fmtTime(Time t) { return t == null ? null : t.toLocalTime().toString().substring(0, 5); }
    private static String fmtInstant(Timestamp t) { return t == null ? null : t.toInstant().toString(); }
}
