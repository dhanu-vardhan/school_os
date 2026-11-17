package com.schoolos.ai;

import com.schoolos.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "ai_suggestion")
public class AiSuggestion extends BaseEntity {
    @Column(name = "feature", nullable = false) private String feature;
    @Column(name = "model_id", nullable = false) private String modelId;
    @Column(name = "status", nullable = false) private String status = "proposed";
    @Column(name = "output") private String output;
    @Column(name = "decided_by") private String decidedBy;
    @Column(name = "decided_at") private java.time.Instant decidedAt;
    public String getFeature() { return feature; }
    public void setFeature(String v) { feature = v; }
    public String getModelId() { return modelId; }
    public void setModelId(String v) { modelId = v; }
    public String getStatus() { return status; }
    public void setStatus(String v) { status = v; }
    public String getOutput() { return output; }
    public void setOutput(String v) { output = v; }
    public String getDecidedBy() { return decidedBy; }
    public void setDecidedBy(String v) { decidedBy = v; }
    public java.time.Instant getDecidedAt() { return decidedAt; }
    public void setDecidedAt(java.time.Instant v) { decidedAt = v; }
}
