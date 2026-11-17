package com.schoolos.ai;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class RedactionServiceTest {
    @Test
    void redactsPii() {
        RedactionService r = new RedactionService();
        String in = "Contact alice@example.com or 06 12 34 56 78, IBAN FR76 1234 5678 9012 3456 7890 123";
        String out = r.redact(in);
        assertThat(out).doesNotContain("alice@example.com");
        assertThat(out).contains("[EMAIL]");
        assertThat(out).contains("[PHONE]");
        assertThat(out).contains("[IBAN]");
    }
}
