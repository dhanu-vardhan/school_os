package com.schoolos.security;

import com.schoolos.common.TenantContext;
import com.schoolos.people.GuardianChild;
import com.schoolos.people.GuardianChildRepository;
import com.schoolos.people.Student;
import com.schoolos.people.StudentRepository;
import com.schoolos.people.StudentService;
import com.schoolos.tenancy.School;
import com.schoolos.tenancy.SchoolService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Row scope: staff see the tenant, guardians see linked children, students see themselves. */
@SpringBootTest
@ActiveProfiles("test")
class ParentScopeTest {

    @Autowired SchoolService schools;
    @Autowired StudentService students;
    @Autowired StudentRepository studentRepository;
    @Autowired GuardianChildRepository guardianChildren;

    private School school;
    private Student alice;
    private Student bob;
    private Student cara;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();
        school = schools.create("Scope School " + UUID.randomUUID());
        TenantContext.set(school.getId());

        alice = create("Alice", null);
        bob = create("Bob", null);
        cara = create("Cara", "demo-student-self");

        link("demo-parent", alice);
        link("demo-parent", bob);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
        TenantContext.clear();
    }

    private Student create(String firstName, String userSubject) {
        Student student = new Student();
        student.setFirstName(firstName);
        student.setLastName("Scope");
        student.setUserSubject(userSubject);
        return students.create(student);
    }

    private void link(String guardianSubject, Student student) {
        GuardianChild link = new GuardianChild();
        link.setSchoolId(school.getId());
        link.setGuardianSubject(guardianSubject);
        link.setStudentId(student.getId());
        guardianChildren.save(link);
    }

    private void login(String subject, String role) {
        SecurityContextHolder.getContext().setAuthentication(
                new TestingAuthenticationToken(subject, "n", "ROLE_" + role));
    }

    @Test
    void aGuardianOnlySeesLinkedChildren() {
        login("demo-parent", "GUARDIAN");
        assertThat(students.list()).extracting(Student::getFirstName)
                .containsExactlyInAnyOrder("Alice", "Bob");
    }

    @Test
    void aGuardianCannotOpenAnUnlinkedChild() {
        login("demo-parent", "GUARDIAN");
        assertThatThrownBy(() -> students.get(cara.getId()))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void anotherGuardianSeesNothing() {
        login("demo-other-parent", "GUARDIAN");
        assertThat(students.list()).isEmpty();
        assertThatThrownBy(() -> students.get(alice.getId()))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void aStudentOnlySeesTheirOwnRecord() {
        login("demo-student-self", "STUDENT");
        assertThat(students.list()).extracting(Student::getFirstName).containsExactly("Cara");
        assertThat(students.get(cara.getId()).getFirstName()).isEqualTo("Cara");
        assertThatThrownBy(() -> students.get(alice.getId()))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void staffStillSeeTheWholeTenant() {
        login("teacher-1", "TEACHER");
        List<Student> visible = students.list();
        assertThat(visible).extracting(Student::getFirstName)
                .containsExactlyInAnyOrder("Alice", "Bob", "Cara");
    }

    @Test
    void theStudentRowIsReadableByItsOwnSubject() {
        assertThat(studentRepository.findByUserSubject("demo-student-self"))
                .extracting(Student::getId).containsExactly(cara.getId());
    }
}
