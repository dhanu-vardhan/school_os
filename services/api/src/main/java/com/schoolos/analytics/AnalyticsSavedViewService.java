package com.schoolos.analytics;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.schoolos.security.CurrentUser;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/** Per-user saved filter sets. Tenant id comes only from the validated JWT. */
@Service
@Transactional
public class AnalyticsSavedViewService {

    public record SavedViewRequest(
            @NotBlank @Size(max = 128) String name,
            @NotBlank @Size(max = 64) String dashboard,
            Map<String, Object> filters) {}

    public record SavedViewDto(
            UUID id, String name, String dashboard, Map<String, Object> filters, Instant updatedAt) {}

    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {};

    private final AnalyticsSavedViewRepository repository;
    private final CurrentUser currentUser;
    private final ObjectMapper mapper;

    public AnalyticsSavedViewService(AnalyticsSavedViewRepository repository,
                                     CurrentUser currentUser, ObjectMapper mapper) {
        this.repository = repository;
        this.currentUser = currentUser;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public List<SavedViewDto> list() {
        return repository.findBySchoolIdAndOwnerSubOrderByNameAsc(
                        currentUser.schoolId(), currentUser.subject())
                .stream().map(this::dto).toList();
    }

    public SavedViewDto save(SavedViewRequest request) {
        UUID schoolId = currentUser.schoolId();
        String owner = currentUser.subject();
        AnalyticsSavedView entity = repository
                .findBySchoolIdAndOwnerSubAndName(schoolId, owner, request.name())
                .orElseGet(AnalyticsSavedView::new);
        entity.setSchoolId(schoolId);
        entity.setOwnerSub(owner);
        entity.setName(request.name());
        entity.setDashboard(request.dashboard());
        entity.setFilters(write(request.filters()));
        entity.touch();
        return dto(repository.save(entity));
    }

    public void delete(UUID id) {
        AnalyticsSavedView entity = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "unknown saved view"));
        if (!Objects.equals(entity.getSchoolId(), currentUser.schoolId())
                || !Objects.equals(entity.getOwnerSub(), currentUser.subject())) {
            throw new AccessDeniedException("Saved view belongs to another owner");
        }
        repository.delete(entity);
    }

    private String write(Map<String, Object> filters) {
        try {
            return mapper.writeValueAsString(filters == null ? Map.of() : filters);
        } catch (JsonProcessingException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "filters must be JSON-serialisable");
        }
    }

    private SavedViewDto dto(AnalyticsSavedView entity) {
        try {
            Map<String, Object> filters = mapper.readValue(
                    entity.getFilters() == null ? "{}" : entity.getFilters(), MAP_TYPE);
            return new SavedViewDto(entity.getId(), entity.getName(), entity.getDashboard(),
                    filters, entity.getUpdatedAt());
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Stored saved-view filters are not valid JSON");
        }
    }
}
