package com.schoolos.analytics;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Static guard for the Part 8 Flyway contract. It needs no database: the migration is read
 * from the classpath and checked against the non-negotiable RLS/index rules in AGENTS.md.
 */
class AnalyticsPart8MigrationContractTest {

    private final String sql = migration();
    /** SQL string literals inside the DO block escape quotes by doubling them. */
    private final String normalized = sql.replace("''", "'");

    private static String migration() {
        try (InputStream in = AnalyticsPart8MigrationContractTest.class
                .getClassLoader().getResourceAsStream("db/migration/V6__analytics.sql")) {
            assertThat(in).as("V6__analytics.sql must be on the test classpath").isNotNull();
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }

    private static List<String> createdTables(String sql) {
        Matcher matcher = Pattern.compile("CREATE\\s+TABLE\\s+(analytics_[a-z_]+)\\s*\\(",
                Pattern.CASE_INSENSITIVE).matcher(sql);
        List<String> tables = new ArrayList<>();
        while (matcher.find()) tables.add(matcher.group(1));
        return tables;
    }

    @Test
    void aggregatesAreOrdinaryTablesNotMaterialisedViews() {
        assertThat(createdTables(sql)).isNotEmpty();
        assertThat(sql.toUpperCase()).doesNotContain("MATERIALIZED VIEW");
    }

    @Test
    void everyNewTenantTableIsForcedRls() {
        Matcher block = Pattern.compile("FOR\\s+t\\s+IN\\s+SELECT\\s+unnest\\(ARRAY\\[(.*?)\\]\\)\\s+LOOP(.*?)END\\s*LOOP",
                Pattern.CASE_INSENSITIVE | Pattern.DOTALL).matcher(sql);
        assertThat(block.find()).as("migration must contain the RLS DO block").isTrue();
        String rlsTables = block.group(1).replace("''", "'");
        String rlsBody = block.group(2).replace("''", "'").toUpperCase();
        assertThat(rlsBody).contains("ENABLE ROW LEVEL SECURITY");
        assertThat(rlsBody).contains("FORCE ROW LEVEL SECURITY");
        assertThat(rlsBody).contains("CURRENT_SETTING('APP.CURRENT_SCHOOL', TRUE)");
        for (String table : createdTables(sql)) {
            assertThat(rlsTables).as(table + " must be covered by forced RLS").contains(table);
        }
    }

    @Test
    void aggregateIndexCoversSchoolPeriodMetric() {
        assertThat(sql.toLowerCase()).contains("(school_id, period, metric_id)");
    }

    @Test
    void aggregateRowsCarryFreshnessAndFormulaVersion() {
        Matcher table = Pattern.compile("CREATE\\s+TABLE\\s+analytics_aggregate_daily\\s*\\((.*?)\\);",
                Pattern.CASE_INSENSITIVE | Pattern.DOTALL).matcher(sql);
        assertThat(table.find()).isTrue();
        String columns = table.group(1).toLowerCase();
        assertThat(columns).contains("school_id", "metric_id", "period", "n int", "value numeric",
                "ci_lower", "ci_upper", "suppressed", "computed_at", "source_available",
                "formula_version", "version bigint");
    }

    @Test
    void studentLevelAuditColumnsExist() {
        Matcher table = Pattern.compile("CREATE\\s+TABLE\\s+analytics_audit_event\\s*\\((.*?)\\);",
                Pattern.CASE_INSENSITIVE | Pattern.DOTALL).matcher(sql);
        assertThat(table.find()).isTrue();
        assertThat(table.group(1).toLowerCase())
                .contains("actor_sub", "student_id", "metric_id", "purpose", "occurred_at");
    }

    @Test
    void noSessionLevelSetAndNoMaterialisedViews() {
        assertThat(normalized.toUpperCase()).doesNotContain("SET APP.CURRENT_SCHOOL");
        assertThat(normalized.toUpperCase()).doesNotContain("MATERIALIZED VIEW");
        assertThat(normalized.toLowerCase()).contains("current_setting('app.current_school', true)");
    }
}
