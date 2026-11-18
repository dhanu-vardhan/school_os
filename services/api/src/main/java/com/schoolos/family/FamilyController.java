package com.schoolos.family;

import com.schoolos.security.PolicyService;
import com.schoolos.security.RequirePermission;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/family")
@RequirePermission(PolicyService.FAMILY_READ)
public class FamilyController {

    private final FamilyService service;

    public FamilyController(FamilyService service) {
        this.service = service;
    }

    @GetMapping("/overview")
    public Map<String, Object> overview() { return service.overview(); }

    @GetMapping("/dashboard")
    public Map<String, Object> dashboard() { return service.dashboard(); }

    @GetMapping("/children")
    public List<Map<String, Object>> children() { return service.children(); }

    @GetMapping("/children/{id}")
    public Map<String, Object> child(@PathVariable String id) { return service.child(id); }

    @PostMapping("/children/{id}/contact-request")
    @RequirePermission(PolicyService.FAMILY_WRITE)
    public Map<String, Object> contactRequest(@PathVariable String id, @RequestBody(required = false) Map<String, Object> body) {
        service.child(id); // scope check
        return Map.of("submitted", true, "requestId", "ccr-" + id, "approvalQueue", "accueil",
                "message", "Modification transmise à l’établissement pour validation.");
    }

    @GetMapping("/attendance")
    public Map<String, Object> attendance(@RequestParam(required = false) String childId) {
        return service.attendance(parseUuid(childId));
    }

    @PostMapping("/absences")
    @RequirePermission(PolicyService.FAMILY_WRITE)
    public Map<String, Object> declareAbsence(@RequestBody Map<String, Object> body) {
        return service.declareAbsence(body);
    }

    @GetMapping("/timetable")
    public List<Map<String, Object>> timetable(@RequestParam(required = false) String childId) {
        return service.timetable(parseUuid(childId));
    }

    @GetMapping("/calendar")
    public List<Map<String, Object>> calendar() { return service.calendarEvents(); }

    @PostMapping("/calendar/ics")
    @RequirePermission(PolicyService.FAMILY_WRITE)
    public Map<String, Object> createIcs(@RequestBody(required = false) Map<String, Object> body) {
        String childId = body == null ? null : String.valueOf(body.get("childId"));
        return service.createIcsFeed(childId);
    }

    @GetMapping("/calendar/ics")
    public Map<String, Object> getIcs(@RequestParam(required = false) String childId) {
        return service.getIcsFeed(parseUuid(childId));
    }

    @DeleteMapping("/calendar/ics/{token}")
    @RequirePermission(PolicyService.FAMILY_WRITE)
    public Map<String, Object> revokeIcs(@PathVariable String token) { return service.revokeIcsFeed(token); }

    @GetMapping("/homework")
    public List<Map<String, Object>> homework(@RequestParam(required = false) String childId) {
        return service.homework(parseUuid(childId));
    }

    @PostMapping("/homework/{id}/read")
    @RequirePermission(PolicyService.FAMILY_WRITE)
    public Map<String, Object> markHomeworkRead(@PathVariable String id) { return service.markHomeworkRead(id); }

    @GetMapping("/grades")
    public Map<String, Object> grades(@RequestParam(required = false) String childId) {
        return service.grades(parseUuid(childId));
    }

    @PostMapping("/bulletins/{id}/acknowledge")
    @RequirePermission(PolicyService.FAMILY_WRITE)
    public Map<String, Object> acknowledgeBulletin(@PathVariable String id) { return service.acknowledgeBulletin(id); }

    @GetMapping("/messages")
    public List<Map<String, Object>> messages() { return service.threads(); }

    @PostMapping("/messages")
    @RequirePermission(PolicyService.FAMILY_WRITE)
    public Map<String, Object> sendMessage(@RequestBody Map<String, Object> body) { return service.sendMessage(body); }

    @PostMapping("/messages/{id}/reply")
    @RequirePermission(PolicyService.FAMILY_WRITE)
    public Map<String, Object> reply(@PathVariable String id, @RequestBody Map<String, Object> body) {
        return service.replyThread(id, String.valueOf(body.get("body")));
    }

    @PostMapping("/messages/{id}/read")
    @RequirePermission(PolicyService.FAMILY_WRITE)
    public Map<String, Object> readThread(@PathVariable String id) { return service.markThreadRead(id); }

    @PostMapping("/messages/{id}/abuse")
    @RequirePermission(PolicyService.FAMILY_WRITE)
    public Map<String, Object> reportThread(@PathVariable String id) { return service.reportThread(id); }

    @GetMapping("/announcements")
    public List<Map<String, Object>> announcements() { return service.announcements(); }

    @PostMapping("/announcements/{id}/read")
    @RequirePermission(PolicyService.FAMILY_WRITE)
    public Map<String, Object> readAnnouncement(@PathVariable String id) { return service.markAnnouncementRead(id); }

    @GetMapping("/forms")
    public List<Map<String, Object>> forms(@RequestParam(required = false) String childId) {
        return service.forms(parseUuid(childId));
    }

    @PostMapping("/forms/{id}/sign")
    @RequirePermission(PolicyService.FAMILY_WRITE)
    public Map<String, Object> signForm(@PathVariable String id, @RequestBody(required = false) Map<String, Object> body) {
        return service.signForm(id, body);
    }

    @PostMapping("/forms/{id}/withdraw")
    @RequirePermission(PolicyService.FAMILY_WRITE)
    public Map<String, Object> withdrawForm(@PathVariable String id) { return service.withdrawForm(id); }

    @GetMapping("/collectors")
    public List<Map<String, Object>> collectors(@RequestParam(required = false) String childId) {
        return service.collectors(parseUuid(childId));
    }

    @PostMapping("/collectors")
    @RequirePermission(PolicyService.FAMILY_WRITE)
    public Map<String, Object> addCollector(@RequestBody Map<String, Object> body) { return service.addCollector(body); }

    @PatchMapping("/collectors/{id}")
    @RequirePermission(PolicyService.FAMILY_WRITE)
    public Map<String, Object> updateCollector(@PathVariable String id, @RequestBody Map<String, Object> body) {
        return service.updateCollector(id, body);
    }

    @DeleteMapping("/collectors/{id}")
    @RequirePermission(PolicyService.FAMILY_WRITE)
    public Map<String, Object> removeCollector(@PathVariable String id) { return service.removeCollector(id); }

    @GetMapping("/appointments")
    public List<Map<String, Object>> appointments(@RequestParam(required = false) String childId) {
        return service.appointments(parseUuid(childId));
    }

    @PostMapping("/appointments/{id}/book")
    @RequirePermission(PolicyService.FAMILY_WRITE)
    public Map<String, Object> bookAppointment(@PathVariable String id) { return service.bookAppointment(id); }

    @PostMapping("/appointments/{id}/cancel")
    @RequirePermission(PolicyService.FAMILY_WRITE)
    public Map<String, Object> cancelAppointment(@PathVariable String id) { return service.cancelAppointment(id); }

    @GetMapping("/activities")
    public Map<String, Object> activities(@RequestParam(required = false) String childId) {
        return service.activities(parseUuid(childId));
    }

    @PostMapping("/activities/enrol")
    @RequirePermission(PolicyService.FAMILY_WRITE)
    public Map<String, Object> enrol(@RequestBody Map<String, Object> body) { return service.enrolActivity(body); }

    @PostMapping("/activities/enrolments/{id}/cancel")
    @RequirePermission(PolicyService.FAMILY_WRITE)
    public Map<String, Object> cancelActivity(@PathVariable String id) { return service.cancelActivity(id); }

    @GetMapping("/canteen")
    public Map<String, Object> canteen(@RequestParam(required = false) String childId) {
        return service.canteen(parseUuid(childId));
    }

    @PostMapping("/canteen/reserve")
    @RequirePermission(PolicyService.FAMILY_WRITE)
    public Map<String, Object> reserveCanteen(@RequestBody Map<String, Object> body) { return service.reserveCanteen(body); }

    @DeleteMapping("/canteen/reservations/{id}")
    @RequirePermission(PolicyService.FAMILY_WRITE)
    public Map<String, Object> cancelCanteen(@PathVariable String id) { return service.cancelCanteen(id); }

    @GetMapping("/billing")
    public Map<String, Object> billing() { return service.billing(); }

    @PostMapping("/billing/invoices/{id}/pay")
    @RequirePermission(PolicyService.FAMILY_PAY)
    public Map<String, Object> pay(@PathVariable String id, @RequestBody(required = false) Map<String, Object> body) {
        String method = body == null ? "card" : String.valueOf(body.getOrDefault("method", "card"));
        return service.payInvoice(id, method);
    }

    @PostMapping("/billing/mandate")
    @RequirePermission(PolicyService.FAMILY_WRITE)
    public Map<String, Object> mandate() { return service.requestMandate(); }

    @GetMapping("/documents")
    public List<Map<String, Object>> documents(@RequestParam(required = false) String childId) {
        return service.documents(parseUuid(childId));
    }

    @PostMapping("/documents/request")
    @RequirePermission(PolicyService.FAMILY_WRITE)
    public Map<String, Object> requestDocument(@RequestBody Map<String, Object> body) { return service.requestDocument(body); }

    @GetMapping("/documents/downloads")
    public List<Map<String, Object>> downloads() { return service.documentDownloads(); }

    @PostMapping("/documents/{id}/download")
    @RequirePermission(PolicyService.FAMILY_WRITE)
    public Map<String, Object> download(@PathVariable String id) { return service.downloadDocument(id); }

    @GetMapping("/preferences")
    public Map<String, Object> preferences() { return service.preferences(); }

    @PutMapping("/preferences")
    @RequirePermission(PolicyService.FAMILY_WRITE)
    public Map<String, Object> savePreferences(@RequestBody(required = false) Map<String, Object> body) {
        return service.savePreferences(body);
    }

    @GetMapping("/devices")
    public List<Map<String, Object>> devices() { return service.devices(); }

    @PostMapping("/devices/{id}/revoke")
    @RequirePermission(PolicyService.FAMILY_WRITE)
    public Map<String, Object> revokeDevice(@PathVariable String id) { return service.revokeDevice(id); }

    @GetMapping("/data-requests")
    public List<Map<String, Object>> dataRequests() { return service.dataRequests(); }

    @PostMapping("/data-requests")
    @RequirePermission(PolicyService.FAMILY_WRITE)
    public Map<String, Object> createDataRequest(@RequestBody Map<String, Object> body) { return service.createDataRequest(body); }

    @GetMapping("/consents")
    public List<Map<String, Object>> consents() { return service.consents(); }

    @PostMapping("/consents/{id}/withdraw")
    @RequirePermission(PolicyService.FAMILY_WRITE)
    public Map<String, Object> withdrawConsent(@PathVariable String id) { return service.withdrawConsent(id); }

    @PostMapping("/concerns")
    @RequirePermission(PolicyService.FAMILY_WRITE)
    public Map<String, Object> concern(@RequestBody Map<String, Object> body) { return service.submitConcern(body); }

    @GetMapping("/policy")
    public Map<String, Object> policy() { return service.policy(); }

    @GetMapping("/invitations")
    public List<Map<String, Object>> invitations() { return service.invitations(); }

    @GetMapping("/guardian-contact")
    public Object guardianContact(@RequestParam String childId) { return service.otherGuardianContact(UUID.fromString(childId)); }

    @ExceptionHandler(NoSuchElementException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public Map<String, Object> notFound(NoSuchElementException e) {
        return Map.of("error", "not_found", "message", e.getMessage() == null ? "Introuvable" : e.getMessage());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, Object> badRequest(IllegalArgumentException e) {
        return Map.of("error", "invalid", "message", e.getMessage());
    }

    @ExceptionHandler(IllegalStateException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public Map<String, Object> conflict(IllegalStateException e) {
        return Map.of("error", "conflict", "message", e.getMessage());
    }

    private static UUID parseUuid(String value) {
        if (value == null || value.isBlank()) return null;
        try { return UUID.fromString(value); } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid id");
        }
    }
}
