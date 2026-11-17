package com.schoolos.people;

import com.schoolos.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.time.LocalDate;

@Entity
@Table(name = "student")
public class Student extends BaseEntity {

    @Column(name = "first_name", nullable = false)
    private String firstName;

    @Column(name = "last_name", nullable = false)
    private String lastName;

    @Column(name = "birth_date")
    private LocalDate birthDate;

    @Column(name = "ine_number")
    private String ineNumber;

    @Column(name = "class_id")
    private java.util.UUID classId;

    @Column(name = "enrolment_date")
    private LocalDate enrolmentDate;

    @Column(name = "languages_spoken")
    private String languagesSpoken;

    /** Set only for STUDENT accounts: the pupil's own login is scoped to this row. */
    @Column(name = "user_subject")
    private String userSubject;

    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }
    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }
    public LocalDate getBirthDate() { return birthDate; }
    public void setBirthDate(LocalDate birthDate) { this.birthDate = birthDate; }
    public String getIneNumber() { return ineNumber; }
    public void setIneNumber(String ineNumber) { this.ineNumber = ineNumber; }
    public java.util.UUID getClassId() { return classId; }
    public void setClassId(java.util.UUID classId) { this.classId = classId; }
    public LocalDate getEnrolmentDate() { return enrolmentDate; }
    public void setEnrolmentDate(LocalDate enrolmentDate) { this.enrolmentDate = enrolmentDate; }
    public String getLanguagesSpoken() { return languagesSpoken; }
    public void setLanguagesSpoken(String languagesSpoken) { this.languagesSpoken = languagesSpoken; }
    public String getUserSubject() { return userSubject; }
    public void setUserSubject(String userSubject) { this.userSubject = userSubject; }
}
