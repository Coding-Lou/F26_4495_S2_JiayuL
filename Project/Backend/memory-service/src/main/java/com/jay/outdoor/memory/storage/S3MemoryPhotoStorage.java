package com.jay.outdoor.memory.storage;

import com.jay.outdoor.memory.exception.StorageUnavailableException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import software.amazon.awssdk.core.exception.SdkException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;

import java.time.Duration;

/**
 * Production storage in a private S3 bucket. Credentials come from the SDK's
 * default provider chain; reads use presigned GET URLs.
 */
public class S3MemoryPhotoStorage implements MemoryPhotoStorage, AutoCloseable {

    private static final Logger log = LoggerFactory.getLogger(S3MemoryPhotoStorage.class);

    private final S3Client s3Client;
    private final S3Presigner presigner;
    private final String bucket;

    public S3MemoryPhotoStorage(S3Client s3Client, S3Presigner presigner, String bucket) {
        this.s3Client = s3Client;
        this.presigner = presigner;
        this.bucket = bucket;
    }

    /** Fails fast when the bucket or region is not configured. */
    public static S3MemoryPhotoStorage create(String bucket, String region) {
        if (bucket == null || bucket.isBlank()) {
            throw new IllegalStateException(
                    "memory.storage.type is s3 but memory.storage.s3.bucket "
                            + "(MEMORY_S3_BUCKET) is blank");
        }
        if (region == null || region.isBlank()) {
            throw new IllegalStateException(
                    "memory.storage.type is s3 but memory.storage.s3.region "
                            + "(MEMORY_S3_REGION) is blank");
        }

        Region awsRegion = Region.of(region.trim());

        return new S3MemoryPhotoStorage(
                S3Client.builder().region(awsRegion).build(),
                S3Presigner.builder().region(awsRegion).build(),
                bucket.trim()
        );
    }

    @Override
    public void put(String objectKey, byte[] content, String mediaType) {
        try {
            s3Client.putObject(
                    PutObjectRequest.builder()
                            .bucket(bucket)
                            .key(objectKey)
                            .contentType(mediaType)
                            .build(),
                    RequestBody.fromBytes(content)
            );
        } catch (SdkException ex) {
            log.warn("S3 put failed for object {}: {}", objectKey, ex.getClass().getSimpleName());
            throw new StorageUnavailableException();
        }
    }

    @Override
    public void delete(String objectKey) {
        try {
            s3Client.deleteObject(
                    DeleteObjectRequest.builder()
                            .bucket(bucket)
                            .key(objectKey)
                            .build()
            );
        } catch (SdkException ex) {
            log.warn("S3 delete failed for object {}: {}", objectKey, ex.getClass().getSimpleName());
            throw new StorageUnavailableException();
        }
    }

    @Override
    public SignedPhotoUrl presentationUrl(String objectKey, String mediaType, Duration ttl) {
        PresignedGetObjectRequest presigned = presigner.presignGetObject(
                GetObjectPresignRequest.builder()
                        .signatureDuration(ttl)
                        .getObjectRequest(GetObjectRequest.builder()
                                .bucket(bucket)
                                .key(objectKey)
                                .build())
                        .build()
        );

        return new SignedPhotoUrl(presigned.url().toString(), presigned.expiration());
    }

    @Override
    public void close() {
        presigner.close();
        s3Client.close();
    }
}
