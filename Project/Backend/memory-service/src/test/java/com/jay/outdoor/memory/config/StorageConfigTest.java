package com.jay.outdoor.memory.config;

import com.jay.outdoor.memory.storage.LocalMemoryPhotoStorage;
import com.jay.outdoor.memory.storage.MemoryPhotoStorage;
import com.jay.outdoor.memory.storage.S3MemoryPhotoStorage;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

/** Storage selection and the s3 fail-fast rule (section 11.6, AC-34). */
class StorageConfigTest {

    @TempDir
    Path root;

    private final ApplicationContextRunner runner = new ApplicationContextRunner()
            .withUserConfiguration(StorageConfig.class, ClockConfig.class);

    @Test
    void localIsTheDefault() {
        runner.withPropertyValues("memory.storage.local.root=" + root)
                .run(context -> {
                    assertThat(context).hasNotFailed();
                    assertThat(context).hasSingleBean(MemoryPhotoStorage.class);
                    assertThat(context).hasSingleBean(LocalMemoryPhotoStorage.class);
                });
    }

    @Test
    void s3WithABlankBucketFailsToStartWithAClearMessage() {
        runner.withPropertyValues(
                        "memory.storage.type=s3",
                        "memory.storage.s3.bucket=",
                        "memory.storage.s3.region=us-west-2")
                .run(context -> {
                    assertThat(context).hasFailed();
                    assertThat(context.getStartupFailure())
                            .rootCause()
                            .hasMessageContaining("memory.storage.s3.bucket")
                            .hasMessageContaining("MEMORY_S3_BUCKET");
                });
    }

    @Test
    void s3WithABlankRegionFailsToStartWithAClearMessage() {
        runner.withPropertyValues(
                        "memory.storage.type=s3",
                        "memory.storage.s3.bucket=photos",
                        "memory.storage.s3.region= ")
                .run(context -> {
                    assertThat(context).hasFailed();
                    assertThat(context.getStartupFailure())
                            .rootCause()
                            .hasMessageContaining("MEMORY_S3_REGION");
                });
    }

    @Test
    void s3WithBucketAndRegionStartsWithoutContactingAws() {
        runner.withPropertyValues(
                        "memory.storage.type=s3",
                        "memory.storage.s3.bucket=photos",
                        "memory.storage.s3.region=us-west-2")
                .run(context -> {
                    assertThat(context).hasNotFailed();
                    assertThat(context).hasSingleBean(S3MemoryPhotoStorage.class);
                    assertThat(context).doesNotHaveBean(LocalMemoryPhotoStorage.class);
                });
    }
}
