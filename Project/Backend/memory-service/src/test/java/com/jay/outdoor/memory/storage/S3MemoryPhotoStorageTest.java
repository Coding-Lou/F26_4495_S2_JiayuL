package com.jay.outdoor.memory.storage;

import com.jay.outdoor.memory.exception.StorageUnavailableException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.exception.SdkClientException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

import java.net.URI;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** S3 adapter, offline: presigning is local; the client is mocked (AC-20). */
class S3MemoryPhotoStorageTest {

    private static final String BUCKET = "test-memory-bucket";

    private final S3Client s3Client = mock(S3Client.class);
    private final S3Presigner presigner = S3Presigner.builder()
            .region(Region.US_WEST_2)
            .credentialsProvider(StaticCredentialsProvider.create(
                    AwsBasicCredentials.create("AKIDEXAMPLEEXAMPLE", "dummy-secret-for-offline-signing")))
            .build();
    private final S3MemoryPhotoStorage storage = new S3MemoryPhotoStorage(s3Client, presigner, BUCKET);
    private final String key = PhotoObjectKeys.photoKey(UUID.randomUUID(), UUID.randomUUID(), "jpg");

    @AfterEach
    void close() {
        presigner.close();
    }

    @Test
    void presignsAGetUrlForTheBucketKeyAndTtl() {
        Instant before = Instant.now();

        SignedPhotoUrl signed = storage.presentationUrl(key, "image/jpeg", Duration.ofMinutes(15));

        URI uri = URI.create(signed.url());
        assertEquals("https", uri.getScheme());
        assertTrue(uri.getHost().startsWith(BUCKET + "."), uri.getHost());
        assertEquals("/" + key, uri.getPath());
        assertTrue(uri.getQuery().contains("X-Amz-Expires=900"), uri.getQuery());
        assertTrue(uri.getQuery().contains("X-Amz-Signature="));
        assertTrue(!signed.expiresAt().isBefore(before.plus(Duration.ofMinutes(15)).minusSeconds(1)));
        assertTrue(!signed.expiresAt().isAfter(Instant.now().plus(Duration.ofMinutes(15)).plusSeconds(1)));
    }

    @Test
    void putWritesTheObjectWithItsContentType() throws Exception {
        byte[] content = {1, 2, 3};

        storage.put(key, content, "image/png");

        ArgumentCaptor<PutObjectRequest> request = ArgumentCaptor.forClass(PutObjectRequest.class);
        ArgumentCaptor<RequestBody> body = ArgumentCaptor.forClass(RequestBody.class);
        verify(s3Client).putObject(request.capture(), body.capture());
        assertEquals(BUCKET, request.getValue().bucket());
        assertEquals(key, request.getValue().key());
        assertEquals("image/png", request.getValue().contentType());
        try (var stream = body.getValue().contentStreamProvider().newStream()) {
            assertArrayEquals(content, stream.readAllBytes());
        }
    }

    @Test
    void deleteRemovesTheObject() {
        storage.delete(key);

        ArgumentCaptor<DeleteObjectRequest> request = ArgumentCaptor.forClass(DeleteObjectRequest.class);
        verify(s3Client).deleteObject(request.capture());
        assertEquals(BUCKET, request.getValue().bucket());
        assertEquals(key, request.getValue().key());
    }

    @Test
    void sdkFailuresBecomeStorageUnavailable() {
        when(s3Client.putObject(any(PutObjectRequest.class), any(RequestBody.class)))
                .thenThrow(SdkClientException.create("unreachable"));
        when(s3Client.deleteObject(any(DeleteObjectRequest.class)))
                .thenThrow(SdkClientException.create("unreachable"));

        assertThrows(StorageUnavailableException.class, () -> storage.put(key, new byte[]{1}, "image/jpeg"));
        assertThrows(StorageUnavailableException.class, () -> storage.delete(key));
    }
}
