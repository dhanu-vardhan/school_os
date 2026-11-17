package com.schoolos.ai;

public interface EmbeddingModel {
    float[] embed(String text);
}
