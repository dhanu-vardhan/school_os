package com.schoolos.pedagogy;

import com.schoolos.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

/** A reusable teaching resource in the department library. */
@Entity
@Table(name = "lesson_resource")
public class LessonResource extends BaseEntity {

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "kind", nullable = false)
    private String kind = "document";

    @Column(name = "subject")
    private String subject;

    @Column(name = "level")
    private String level;

    /** Comma-separated tags; see V4 comment. */
    @Column(name = "tags", nullable = false)
    private String tags = "";

    @Column(name = "url")
    private String url;

    /** Object-storage key. Scanning/AV wiring is deferred; never a public URL. */
    @Column(name = "file_key")
    private String fileKey;

    @Column(name = "status", nullable = false)
    private String status = "published";

    public String getTitle() { return title; }
    public void setTitle(String v) { title = v; }
    public String getKind() { return kind; }
    public void setKind(String v) { kind = v; }
    public String getSubject() { return subject; }
    public void setSubject(String v) { subject = v; }
    public String getLevel() { return level; }
    public void setLevel(String v) { level = v; }
    public String getTags() { return tags; }
    public void setTags(String v) { tags = v == null ? "" : v; }
    public String getUrl() { return url; }
    public void setUrl(String v) { url = v; }
    public String getFileKey() { return fileKey; }
    public void setFileKey(String v) { fileKey = v; }
    public String getStatus() { return status; }
    public void setStatus(String v) { status = v; }
}
