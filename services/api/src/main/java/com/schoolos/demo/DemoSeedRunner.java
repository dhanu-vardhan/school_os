package com.schoolos.demo;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

import javax.sql.DataSource;
import java.util.List;
import java.util.UUID;

/**
 * Server-side demo seed. The browser never owns this data: it is inserted by the API
 * under the demo profile and read back through the BFF proxy like any other request.
 */
@Component
@Profile("demo")
public class DemoSeedRunner implements ApplicationRunner {

    public static final UUID SCHOOL_A = UUID.fromString("11111111-1111-4111-8111-111111111111");
    public static final UUID SCHOOL_B = UUID.fromString("22222222-2222-4222-8222-222222222222");

    private static final List<String[]> MEMBERSHIPS = List.of(
            new String[]{"demo-director", "directeur@demo.schoolos.test", "DIRECTOR"},
            new String[]{"demo-deputy", "adjoint@demo.schoolos.test", "DEPUTY"},
            new String[]{"demo-teacher", "enseignant@demo.schoolos.test", "TEACHER"},
            new String[]{"demo-assistant", "assistant@demo.schoolos.test", "ASSISTANT"},
            new String[]{"demo-finance", "finance@demo.schoolos.test", "FINANCE"},
            new String[]{"demo-admissions", "admissions@demo.schoolos.test", "ADMISSIONS"},
            new String[]{"demo-reception", "accueil@demo.schoolos.test", "RECEPTION"},
            new String[]{"demo-guardian", "parent@demo.schoolos.test", "GUARDIAN"},
            new String[]{"demo-guardian-2", "parent2@demo.schoolos.test", "GUARDIAN"},
            new String[]{"demo-instructor", "intervenant@demo.schoolos.test", "INSTRUCTOR"},
            new String[]{"demo-provider", "prestataire@demo.schoolos.test", "PROVIDER"},
            new String[]{"demo-safeguarding", "protection@demo.schoolos.test", "SAFEGUARDING"},
            new String[]{"demo-operator", "operateur@demo.schoolos.test", "OPERATOR"}
    );

    private static final String[] FIRST_A = {"Léa", "Tom", "Inès", "Noah", "Jade", "Lucas", "Emma", "Hugo", "Chloé", "Louis", "Manon", "Gabriel", "Alice", "Raphaël"};
    private static final String[] LAST_A = {"Martin", "Durand", "Petit", "Bernard", "Roux", "Moreau", "Girard", "Leroy", "Cohen", "Diallo", "Perrin", "Fontaine", "Chevalier", "François"};
    private static final String[] FIRST_B = {"Nina", "Adam", "Zoé", "Milo", "Lina", "Ezra", "Mia", "Sami"};
    private static final String[] LAST_B = {"Rivière", "Haddad", "Lambert", "Bonnet", "Garnier", "Faure", "Rousseau", "Vincent"};

    private final JdbcTemplate jdbc;
    private final TransactionTemplate tx;

    public DemoSeedRunner(@Qualifier("rawDataSource") DataSource rawDataSource) {
        this.jdbc = new JdbcTemplate(rawDataSource);
        this.tx = new TransactionTemplate(new org.springframework.jdbc.datasource.DataSourceTransactionManager(rawDataSource));
    }

    private static final org.slf4j.Logger LOG = org.slf4j.LoggerFactory.getLogger(DemoSeedRunner.class);

    @Override
    public void run(ApplicationArguments args) {
        LOG.info("Demo seed starting: 2 schools, {} memberships, {} + {} students",
                MEMBERSHIPS.size(), FIRST_A.length, FIRST_B.length);
        seedSchool(SCHOOL_A, "École Primaire Saint-Denis", MEMBERSHIPS, FIRST_A, LAST_A);
        seedSchool(SCHOOL_B, "École Maternelle Rivoli", MEMBERSHIPS, FIRST_B, LAST_B);
        LOG.info("Demo seed complete: schools={}, students={}",
                jdbc.queryForObject("SELECT count(*) FROM school", Integer.class),
                jdbc.queryForObject("SELECT count(*) FROM student", Integer.class));
    }

    private void seedSchool(UUID schoolId, String name, List<String[]> members, String[] firstNames, String[] lastNames) {
        tx.executeWithoutResult(status -> {
            jdbc.queryForObject("SELECT set_config('app.current_school', ?, true)", String.class, schoolId.toString());
            jdbc.update("INSERT INTO school (id, school_id, name, timezone, locale) " +
                            "VALUES (?, ?, ?, 'Europe/Paris', 'fr') ON CONFLICT (id) DO NOTHING",
                    schoolId, schoolId, name);
            for (String[] member : members) {
                jdbc.update("INSERT INTO membership (id, school_id, user_subject, user_email, role) " +
                                "VALUES (?, ?, ?, ?, ?) ON CONFLICT DO NOTHING",
                        stableId(schoolId + member[0]), schoolId, member[0], member[1], member[2]);
            }
            for (int i = 0; i < firstNames.length; i++) {
                jdbc.update("INSERT INTO student (id, school_id, first_name, last_name, enrolment_date) " +
                                "VALUES (?, ?, ?, ?, DATE '2026-09-01') ON CONFLICT (id) DO NOTHING",
                        stableId(schoolId + "student-" + i), schoolId, firstNames[i], lastNames[i]);
            }
        });
    }

    private static UUID stableId(String key) {
        return UUID.nameUUIDFromBytes(key.getBytes(java.nio.charset.StandardCharsets.UTF_8));
    }
}
