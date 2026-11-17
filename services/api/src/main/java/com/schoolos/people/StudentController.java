package com.schoolos.people;

import com.schoolos.security.PolicyService;
import com.schoolos.security.RequirePermission;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/students")
public class StudentController {

    private final StudentService service;

    public StudentController(StudentService service) {
        this.service = service;
    }

    @PostMapping
    @RequirePermission(PolicyService.STUDENT_WRITE)
    public Student create(@RequestBody Student student) {
        return service.create(student);
    }

    @GetMapping
    @RequirePermission(PolicyService.STUDENT_READ)
    public List<Student> list() {
        return service.list();
    }

    @GetMapping("/{id}")
    @RequirePermission(PolicyService.STUDENT_READ)
    public Student get(@PathVariable UUID id) {
        return service.get(id);
    }
}
