package com.lmsrag.backend.util;

import org.springframework.core.io.AbstractResource;
import org.springframework.core.io.Resource;

import java.io.FilterInputStream;
import java.io.IOException;
import java.io.InputStream;

/**
 * Repeatable view over a bounded byte range of another resource.
 * Each call opens a fresh source stream and stops at {@code count} bytes.
 */
public final class ByteRangeResource extends AbstractResource {

    private final Resource source;
    private final long position;
    private final long count;

    public ByteRangeResource(Resource source, long position, long count) {
        if (position < 0 || count < 0) {
            throw new IllegalArgumentException("Range position and count must be non-negative");
        }
        this.source = source;
        this.position = position;
        this.count = count;
    }

    @Override
    public String getDescription() {
        return "%s [bytes %d-%d]".formatted(
                source.getDescription(),
                position,
                position + Math.max(0, count - 1)
        );
    }

    @Override
    public String getFilename() {
        return source.getFilename();
    }

    @Override
    public long contentLength() {
        return count;
    }

    @Override
    public InputStream getInputStream() throws IOException {
        InputStream inputStream = source.getInputStream();
        try {
            inputStream.skipNBytes(position);
            return new LimitedInputStream(inputStream, count);
        } catch (IOException | RuntimeException exception) {
            inputStream.close();
            throw exception;
        }
    }

    private static final class LimitedInputStream extends FilterInputStream {

        private long remaining;

        private LimitedInputStream(InputStream inputStream, long remaining) {
            super(inputStream);
            this.remaining = remaining;
        }

        @Override
        public int read() throws IOException {
            if (remaining == 0) return -1;
            int value = super.read();
            if (value >= 0) remaining--;
            return value;
        }

        @Override
        public int read(byte[] buffer, int offset, int length) throws IOException {
            if (remaining == 0) return -1;
            int boundedLength = (int) Math.min(length, remaining);
            int bytesRead = super.read(buffer, offset, boundedLength);
            if (bytesRead > 0) remaining -= bytesRead;
            return bytesRead;
        }

        @Override
        public long skip(long bytes) throws IOException {
            long skipped = super.skip(Math.min(bytes, remaining));
            remaining -= skipped;
            return skipped;
        }

        @Override
        public int available() throws IOException {
            return (int) Math.min(super.available(), remaining);
        }
    }
}
