package com.schoolos.tenancy;

import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/schools")
public class SchoolController {

    private final SchoolService service;

    public SchoolController(SchoolService service) {
        this.service = service;
    }

    @PostMapping
    public School create(@RequestBody Map<String, String> body) {
        return service.create(body.get("name"));
    }

    @GetMapping
    public List<School> list() {
        return service.list();
    }

    @GetMapping("/{id}")
    public School get(@PathVariable UUID id) {
        return service.get(id);
    }
}
