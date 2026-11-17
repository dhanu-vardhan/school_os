package com.schoolos.demo;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

import javax.sql.DataSource;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Server-side demo seed. The browser never owns this data: it is inserted by the API
 * under the demo profile and read back through the BFF proxy like any other request.
 * Subject ids match the BFF demo allow-list (`demo-<key>`), so membership and guardian
 * scope are proven by the same rows the token is checked against.
 */
@Component
@Profile("demo")
@Order(Ordered.LOWEST_PRECEDENCE)
public class DemoSeedRunner implements ApplicationRunner {

    public static final UUID SCHOOL_A = UUID.fromString("11111111-1111-4111-8111-111111111111");
    public static final UUID SCHOOL_B = UUID.fromString("22222222-2222-4222-8222-222222222222");

    private record Member(String subject, String role) {}

    private static final List<Member> SCHOOL_A_MEMBERS = List.of(
            new Member("demo-super-admin", "PLATFORM_ADMIN"),
            new Member("demo-group-admin", "GROUP_ADMIN"),
            new Member("demo-director", "DIRECTOR"),
            new Member("demo-admin", "ADMIN"),
            new Member("demo-deputy", "DEPUTY"),
            new Member("demo-teacher", "TEACHER"),
            new Member("demo-parent", "GUARDIAN"),
            new Member("demo-parent-2", "GUARDIAN"),
            new Member("demo-student-college", "STUDENT"),
            new Member("demo-student-lycee", "STUDENT"),
            new Member("demo-safeguarding", "SAFEGUARDING"),
            new Member("demo-nurse", "NURSE"),
            new Member("demo-finance", "FINANCE"),
            new Member("demo-hr", "HR"),
            new Member("demo-it-admin", "IT_ADMIN"),
            new Member("demo-librarian", "LIBRARIAN"),
            new Member("demo-reception", "RECEPTION"),
            new Member("demo-auditor", "AUDITOR"),
            new Member("demo-assistant", "ASSISTANT"),
            new Member("demo-admissions", "ADMISSIONS"),
            new Member("demo-instructor", "INSTRUCTOR"),
            new Member("demo-provider", "PROVIDER"),
            new Member("demo-operator", "OPERATOR")
    );

    private static final List<Member> SCHOOL_B_MEMBERS = List.of(
            new Member("demo-group-admin", "GROUP_ADMIN"),
            new Member("demo-teacher-parttime", "TEACHER"),
            new Member("demo-parent", "GUARDIAN"),
            new Member("demo-accountant", "ACCOUNTANT")
    );

    private static final String[] FIRST_A = {
            "Léa", "Tom", "Inès", "Noah", "Jade", "Lucas", "Emma", "Hugo", "Chloé", "Louis",
            "Manon", "Gabriel", "Alice", "Raphaël", "Nina", "Adam", "Zoé", "Milo", "Lina", "Ezra",
            "Mia", "Sami", "Camille", "Nathan", "Juliette", "Arthur", "Louise", "Jules", "Rose",
            "Théo", "Ambre", "Ethan"
    };
    private static final String[] LAST_A = {
            "Martin", "Durand", "Petit", "Bernard", "Roux", "Moreau", "Girard", "Leroy", "Cohen",
            "Diallo", "Perrin", "Fontaine", "Chevalier", "François", "Rivière", "Haddad", "Lambert",
            "Bonnet", "Garnier", "Faure", "Rousseau", "Vincent", "Muller", "Lefebvre", "Mercier",
            "Blanc", "Guerin", "Boyer", "Henry", "Andre", "Masson", "Renaud"
    };
    private static final String[] FIRST_B = {"Nina", "Adam", "Zoé", "Milo", "Lina", "Ezra", "Mia", "Sami"};
    private static final String[] LAST_B = {"Rivière", "Haddad", "Lambert", "Bonnet", "Garnier", "Faure", "Rousseau", "Vincent"};

    private static final org.slf4j.Logger LOG = org.slf4j.LoggerFactory.getLogger(DemoSeedRunner.class);

    private final JdbcTemplate jdbc;
    private final TransactionTemplate tx;

    public DemoSeedRunner(@Qualifier("rawDataSource") DataSource rawDataSource) {
        this.jdbc = new JdbcTemplate(rawDataSource);
        this.tx = new TransactionTemplate(new org.springframework.jdbc.datasource.DataSourceTransactionManager(rawDataSource));
    }

    @Override
    public void run(ApplicationArguments args) {
        LOG.info("Demo seed starting: 2 schools, {} + {} memberships, {} + {} students",
                SCHOOL_A_MEMBERS.size(), SCHOOL_B_MEMBERS.size(), FIRST_A.length, FIRST_B.length);

        seedSchool(SCHOOL_A, "Lycée Démo Jean-Moulin", SCHOOL_A_MEMBERS, FIRST_A, LAST_A,
                Map.of(0, "demo-student-college", 1, "demo-student-lycee"));
        seedSchool(SCHOOL_B, "École Démo Les Tilleuls", SCHOOL_B_MEMBERS, FIRST_B, LAST_B, Map.of());

        // Guardian links. The parent account spans both tenants; the second parent has one child.
        linkGuardian(SCHOOL_A, "demo-parent", 0, 1);
        linkGuardian(SCHOOL_B, "demo-parent", 0);
        linkGuardian(SCHOOL_A, "demo-parent-2", 2);

        LOG.info("Demo seed complete: schools={}, students={}, guardian_links={}",
                jdbc.queryForObject("SELECT count(*) FROM school", Integer.class),
                jdbc.queryForObject("SELECT count(*) FROM student", Integer.class),
                jdbc.queryForObject("SELECT count(*) FROM guardian_child", Integer.class));
    }

    private void seedSchool(UUID schoolId, String name, List<Member> members,
                            String[] firstNames, String[] lastNames,
                            Map<Integer, String> studentSubjects) {
        tx.executeWithoutResult(status -> {
            jdbc.queryForObject("SELECT set_config('app.current_school', ?, true)", String.class, schoolId.toString());
            jdbc.update("INSERT INTO school (id, school_id, name, timezone, locale) " +
                            "VALUES (?, ?, ?, 'Europe/Paris', 'fr') ON CONFLICT (id) DO NOTHING",
                    schoolId, schoolId, name);
            for (Member member : members) {
                jdbc.update("INSERT INTO membership (id, school_id, user_subject, user_email, role) " +
                                "VALUES (?, ?, ?, ?, ?) ON CONFLICT DO NOTHING",
                        stableId(schoolId + member.subject()), schoolId, member.subject(),
                        member.subject() + "@demo.schoolos.invalid", member.role());
            }
            for (int i = 0; i < firstNames.length; i++) {
                jdbc.update("INSERT INTO student (id, school_id, first_name, last_name, enrolment_date, user_subject) " +
                                "VALUES (?, ?, ?, ?, DATE '2026-09-01', ?) ON CONFLICT (id) DO NOTHING",
                        studentId(schoolId, i), schoolId, firstNames[i], lastNames[i], studentSubjects.get(i));
            }
        });
    }

    private void linkGuardian(UUID schoolId, String guardianSubject, int... studentIndexes) {
        tx.executeWithoutResult(status -> {
            jdbc.queryForObject("SELECT set_config('app.current_school', ?, true)", String.class, schoolId.toString());
            for (int index : studentIndexes) {
                UUID studentId = studentId(schoolId, index);
                jdbc.update("INSERT INTO guardian_child (id, school_id, guardian_subject, student_id, relationship) " +
                                "VALUES (?, ?, ?, ?, 'parent') ON CONFLICT DO NOTHING",
                        stableId(schoolId + guardianSubject + studentId), schoolId, guardianSubject, studentId);
            }
        });
    }

    public static UUID studentId(UUID schoolId, int index) {
        return stableId(schoolId + "student-" + index);
    }

    private static UUID stableId(String key) {
        return UUID.nameUUIDFromBytes(key.getBytes(StandardCharsets.UTF_8));
    }
}
