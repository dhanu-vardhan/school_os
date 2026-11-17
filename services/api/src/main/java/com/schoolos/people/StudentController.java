package com.schoolos.people;

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
    public Student create(@RequestBody Student student) {
        return service.create(student);
    }

    @GetMapping
    public List<Student> list() {
        return service.list();
    }

    @GetMapping("/{id}")
    public Student get(@PathVariable UUID id) {
        return service.get(id);
    }
}
