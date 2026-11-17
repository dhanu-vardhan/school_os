package com.schoolos.analytics;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Saved views are tenant-scoped by RLS and owner-scoped by the service. */
public interface AnalyticsSavedViewRepository extends JpaRepository<AnalyticsSavedView, UUID> {

    List<AnalyticsSavedView> findBySchoolIdAndOwnerSubOrderByNameAsc(UUID schoolId, String ownerSub);

    Optional<AnalyticsSavedView> findBySchoolIdAndOwnerSubAndName(UUID schoolId, String ownerSub, String name);
}
