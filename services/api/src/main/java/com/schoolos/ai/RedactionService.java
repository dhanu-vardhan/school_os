package com.schoolos.ai;

import java.util.regex.Pattern;

public class RedactionService {
    private static final Pattern EMAIL = Pattern.compile("[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}");
    private static final Pattern PHONE = Pattern.compile("\\b(?:\\+33|0)[1-9](?:[\\s.-]?\\d{2}){4}\\b");
    private static final Pattern IBAN = Pattern.compile("\\bFR\\d{2}[\\s]?\\d{4}[\\s]?\\d{4}[\\s]?\\d{4}[\\s]?\\d{4}[\\s]?\\d{4}[\\s]?\\d{3}\\b", Pattern.CASE_INSENSITIVE);

    public String redact(String input) {
        if (input == null) return null;
        String out = EMAIL.matcher(input).replaceAll("[EMAIL]");
        out = PHONE.matcher(out).replaceAll("[PHONE]");
        out = IBAN.matcher(out).replaceAll("[IBAN]");
        return out;
    }
}
