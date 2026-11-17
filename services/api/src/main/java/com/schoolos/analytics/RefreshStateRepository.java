package com.schoolos.analytics;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RefreshStateRepository extends JpaRepository<RefreshState, UUID> {

    Optional<RefreshState> findByFactName(String factName);

    List<RefreshState> findAllByOrderByFactNameAsc();
}
