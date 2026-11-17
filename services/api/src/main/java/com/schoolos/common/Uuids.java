package com.schoolos.common;

import java.util.UUID;

public final class Uuids {
    private Uuids() {}

    public static UUID newId() {
        return newV7();
    }

    /**
     * UUIDv7-style identifier (48-bit millisecond timestamp, version 7, RFC-4122 variant).
     * Analytics tables use this so ids sort by creation time. The SQL default in Flyway
     * V6 uses the equivalent {@code analytics_uuidv7()} function.
     */
    public static UUID newV7() {
        long millis = System.currentTimeMillis();
        java.nio.ByteBuffer bytes = java.nio.ByteBuffer.allocate(16);
        bytes.putLong(0, 0L);
        bytes.putLong(8, 0L);
        // 48-bit timestamp in the first six bytes.
        bytes.put(0, (byte) (millis >>> 40));
        bytes.put(1, (byte) (millis >>> 32));
        bytes.put(2, (byte) (millis >>> 24));
        bytes.put(3, (byte) (millis >>> 16));
        bytes.put(4, (byte) (millis >>> 8));
        bytes.put(5, (byte) millis);
        java.util.Random random = new java.security.SecureRandom();
        byte[] tail = new byte[10];
        random.nextBytes(tail);
        // version 7
        bytes.put(6, (byte) ((tail[0] & 0x0F) | 0x70));
        bytes.put(7, tail[1]);
        // RFC-4122 variant (10xx)
        bytes.put(8, (byte) ((tail[2] & 0x3F) | 0x80));
        for (int i = 9; i < 16; i++) {
            bytes.put(i, tail[i - 6]);
        }
        return new UUID(bytes.getLong(0), bytes.getLong(8));
    }
}
