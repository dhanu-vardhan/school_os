package com.schoolos.common;

import java.util.UUID;

public final class Uuids {
    private Uuids() {}

    public static UUID newId() {
        return UUID.randomUUID();
    }
}
