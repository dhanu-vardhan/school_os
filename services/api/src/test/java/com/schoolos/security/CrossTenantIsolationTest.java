package com.schoolos.security;

import com.schoolos.common.TenantContext;
import com.schoolos.people.Student;
import com.schoolos.people.StudentService;
import com.schoolos.tenancy.School;
import com.schoolos.tenancy.SchoolService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class CrossTenantIsolationTest {

    @Autowired SchoolService schoolService;
    @Autowired StudentService studentService;

    @Test
    void studentsIsolatedBetweenSchools() {
        School a = schoolService.create("School A");
        School b = schoolService.create("School B");

        TenantContext.set(a.getId());
        Student sa = new Student();
        sa.setFirstName("Alice");
        sa.setLastName("A");
        studentService.create(sa);

        TenantContext.set(b.getId());
        Student sb = new Student();
        sb.setFirstName("Bob");
        sb.setLastName("B");
        studentService.create(sb);

        TenantContext.set(a.getId());
        List<Student> aStudents = studentService.list();
        assertThat(aStudents).extracting(Student::getFirstName).containsExactly("Alice");

        TenantContext.set(b.getId());
        List<Student> bStudents = studentService.list();
        assertThat(bStudents).extracting(Student::getFirstName).containsExactly("Bob");
    }
}
