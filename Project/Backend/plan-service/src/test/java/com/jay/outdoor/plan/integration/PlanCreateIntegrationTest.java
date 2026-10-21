package com.jay.outdoor.plan.integration;

import com.jay.outdoor.plan.exception.TrailServiceUnavailableException;
import com.jay.outdoor.plan.support.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;
import tools.jackson.databind.JsonNode;

import java.sql.Timestamp;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.hamcrest.Matchers.hasSize;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Create, validation, trail validation, and idempotency (AC-01, 02, 04–08, 13, 14, 26, 28). */
class PlanCreateIntegrationTest extends AbstractIntegrationTest {

    private static final Set<String> PLAN_FIELDS =
            Set.of("id", "trailId", "tripDate", "status", "createdAt", "updatedAt");

    // ---------------------------------------------------------------- create

    @Test
    void createReturns201WithThePlanAndStoresTheTokenSubjectAsOwner() throws Exception {
        MvcResult result = postPlan(userA(), planJson(TRAIL, today()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.trailId").value(TRAIL.toString()))
                .andExpect(jsonPath("$.tripDate").value(today().toString()))
                .andExpect(jsonPath("$.status").value("READY"))
                .andReturn();

        JsonNode body = json(result);
        assertEquals(PLAN_FIELDS, fieldNames(body));
        assertEquals(body.get("createdAt").asString(), body.get("updatedAt").asString());
        assertTrue(body.get("createdAt").asString().endsWith("Z"), body.toString());
        assertClean(result);

        UUID id = UUID.fromString(body.get("id").asString());
        Map<String, Object> row = jdbc.queryForMap("SELECT * FROM plans WHERE id = ?", id);
        assertEquals("user-a", row.get("owner_subject"));
        assertEquals(TRAIL, row.get("trail_id"));
        assertEquals("READY", row.get("status"));
        assertEquals(false, row.get("deleted"));
        verify(trailCatalogClient).trailExists(TRAIL);
    }

    @Test
    void aFutureDateIsAcceptedWithNoMaximum() throws Exception {
        postPlan(userA(), planJson(TRAIL, today().plusDays(1)))
                .andExpect(status().isCreated());
        postPlan(userA(), planJson(TRAIL, today().plusYears(3)))
                .andExpect(status().isCreated());
        assertEquals(2, countPlans());
    }

    @Test
    void clientSuppliedOwnerIdStatusAndServerFieldsAreIgnored() throws Exception {
        UUID forgedId = UUID.fromString("99999999-9999-9999-9999-999999999999");
        String body = """
                {"trailId":"%s","tripDate":"%s","id":"%s","ownerSubject":"user-b",
                 "status":"COMPLETED","deleted":true,
                 "createdAt":"2000-01-01T00:00:00Z","updatedAt":"2000-01-01T00:00:00Z"}"""
                .formatted(TRAIL, today(), forgedId);

        MvcResult result = postPlan(userA(), body)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("READY"))
                .andReturn();

        UUID id = UUID.fromString(json(result).get("id").asString());
        assertNotEquals(forgedId, id);

        List<Map<String, Object>> rows = jdbc.queryForList("SELECT * FROM plans");
        assertEquals(1, rows.size());
        Map<String, Object> row = rows.getFirst();
        assertEquals("user-a", row.get("owner_subject"));
        assertEquals("READY", row.get("status"));
        assertEquals(false, row.get("deleted"));
        assertTrue(((Timestamp) row.get("created_at")).toLocalDateTime().getYear() > 2000);

        // user-b has nothing.
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .get("/api/plans").with(userB()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(0)));
    }

    // ---------------------------------------------------------------- validation

    @Test
    void aPastDateIsRefusedOnTripDateWithNoTrailCallAndNothingStored() throws Exception {
        postPlan(userA(), planJson(TRAIL, today().minusDays(1)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.errors", hasSize(1)))
                .andExpect(jsonPath("$.errors[0].field").value("tripDate"))
                .andExpect(jsonPath("$.errors[0].message").value("must not be in the past"));

        assertEquals(0, countPlans());
        verify(trailCatalogClient, never()).trailExists(any());
    }

    @Test
    void aMissingOrNullTripDateIsRefusedNamingTripDate() throws Exception {
        expectFieldErrors("{\"trailId\":\"" + TRAIL + "\"}", "tripDate");
        expectFieldErrors("{\"trailId\":\"" + TRAIL + "\",\"tripDate\":null}", "tripDate");
        assertEquals(0, countPlans());
    }

    @Test
    void aMissingOrNullTrailIdIsRefusedNamingTrailId() throws Exception {
        expectFieldErrors("{\"tripDate\":\"" + today() + "\"}", "trailId");
        expectFieldErrors("{\"trailId\":null,\"tripDate\":\"" + today() + "\"}", "trailId");
        assertEquals(0, countPlans());
    }

    @Test
    void bothFieldsMissingNamesBoth() throws Exception {
        MvcResult result = postPlan(userA(), "{}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.errors", hasSize(2)))
                .andReturn();

        Set<String> fields = new java.util.TreeSet<>();
        json(result).get("errors").forEach(error -> fields.add(error.get("field").asString()));
        assertEquals(Set.of("trailId", "tripDate"), fields);
    }

    @Test
    void unparseableValuesAreValidationErrorsWithoutFieldList() throws Exception {
        for (String body : List.of(
                "{\"trailId\":\"" + TRAIL + "\",\"tripDate\":\"2026-13-45\"}",
                "{\"trailId\":\"" + TRAIL + "\",\"tripDate\":\"tomorrow\"}",
                "{\"trailId\":\"not-a-uuid\",\"tripDate\":\"" + today() + "\"}",
                "{\"trailId\":")) {
            MvcResult result = postPlan(userA(), body)
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                    .andReturn();
            assertFalse(json(result).has("errors"), body);
        }
        assertEquals(0, countPlans());
        verify(trailCatalogClient, never()).trailExists(any());
    }

    @Test
    void aBodyThatIsNotJsonIsUnsupportedMediaType() throws Exception {
        mockMvc.perform(post("/api/plans")
                        .with(userA())
                        .contentType(MediaType.TEXT_PLAIN)
                        .content(planJson(TRAIL, today())))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.code").value("UNSUPPORTED_MEDIA_TYPE"));
        assertEquals(0, countPlans());
    }

    // ---------------------------------------------------------------- trail validation

    @Test
    void aMissingTrailIsTrailNotFoundAndNothingIsStored() throws Exception {
        when(trailCatalogClient.trailExists(TRAIL)).thenReturn(false);

        postPlan(userA(), planJson(TRAIL, today()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("TRAIL_NOT_FOUND"));

        assertEquals(0, countPlans());
    }

    @Test
    void anUnavailableTrailServiceIs503AndNothingIsStored() throws Exception {
        when(trailCatalogClient.trailExists(TRAIL)).thenThrow(new TrailServiceUnavailableException());

        postPlan(userA(), planJson(TRAIL, today()))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("TRAIL_SERVICE_UNAVAILABLE"));

        assertEquals(0, countPlans());
    }

    @Test
    void anExistingPlanIsReturnedWhileTrailServiceIsDownWithNoTrailCall() throws Exception {
        UUID id = createPlan("user-a", TRAIL, today());
        when(trailCatalogClient.trailExists(any())).thenThrow(new TrailServiceUnavailableException());

        postPlan(userA(), planJson(TRAIL, today()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id.toString()));

        verify(trailCatalogClient, times(1)).trailExists(any());
        assertEquals(1, countPlans());
    }

    @Test
    void aSyntheticTrailThatTrailServiceKnowsCanBePlanned() throws Exception {
        // Synthetic ids are md5('synthetic-demo-trail:' || n)::uuid; trail-service answers 200.
        UUID synthetic = UUID.fromString("3b5d5c37-1b8e-4e5c-9f3f-2a7c1d9e8f10");
        when(trailCatalogClient.trailExists(synthetic)).thenReturn(true);

        postPlan(userA(), planJson(synthetic, today().plusDays(2)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.trailId").value(synthetic.toString()));
    }

    // ---------------------------------------------------------------- idempotency

    @Test
    void repeatingTheSameCreateReturns200WithTheIdenticalPlan() throws Exception {
        MvcResult first = postPlan(userA(), planJson(TRAIL, today().plusDays(3)))
                .andExpect(status().isCreated())
                .andReturn();
        MvcResult second = postPlan(userA(), planJson(TRAIL, today().plusDays(3)))
                .andExpect(status().isOk())
                .andReturn();

        // Same id and string-equal timestamps: the 201 body came from the persisted
        // entity, the 200 body from a database read (spec section 12, UTC).
        assertEquals(json(first), json(second));
        assertEquals(json(first).get("createdAt").asString(), json(second).get("createdAt").asString());
        assertEquals(json(first).get("updatedAt").asString(), json(second).get("updatedAt").asString());
        assertTrue(json(second).get("createdAt").asString().endsWith("Z"));

        assertEquals(1, countPlans());
        verify(trailCatalogClient, times(1)).trailExists(TRAIL);
    }

    @Test
    @ExtendWith(OutputCaptureExtension.class)
    void concurrentIdenticalCreatesProduceOneRowAndTheSamePlan(CapturedOutput output) throws Exception {
        String subject = "race-subject-5e1b";
        CountDownLatch bothPastLookup = new CountDownLatch(2);
        when(trailCatalogClient.trailExists(TRAIL)).thenAnswer(invocation -> {
            // Both requests have passed the duplicate lookup (step 2) before either inserts.
            bothPastLookup.countDown();
            if (!bothPastLookup.await(10, TimeUnit.SECONDS)) {
                throw new IllegalStateException("the second request never reached the trail check");
            }
            return true;
        });

        Callable<MvcResult> create = () -> postPlan(as(subject), planJson(TRAIL, today())).andReturn();
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            Future<MvcResult> one = pool.submit(create);
            Future<MvcResult> two = pool.submit(create);
            MvcResult a = one.get(30, TimeUnit.SECONDS);
            MvcResult b = two.get(30, TimeUnit.SECONDS);

            assertEquals(Set.of(201, 200),
                    Set.of(a.getResponse().getStatus(), b.getResponse().getStatus()),
                    a.getResponse().getContentAsString() + " / " + b.getResponse().getContentAsString());
            assertEquals(json(a), json(b));
        } finally {
            pool.shutdownNow();
        }

        assertEquals(1, countPlans());
        verify(trailCatalogClient, times(2)).trailExists(TRAIL);

        // The losing insert went through the unique index, and nothing logged the owner.
        assertTrue(output.getAll().contains("concurrent create, existing plan"), "race path not taken");
        assertFalse(output.getAll().contains(subject), "owner subject in the log");
    }

    @Test
    void aDifferentDateOrTrailIsADifferentPlan() throws Exception {
        UUID base = createPlan("user-a", TRAIL, today().plusDays(1));
        UUID otherDate = createPlan("user-a", TRAIL, today().plusDays(2));
        UUID otherTrail = createPlan("user-a", OTHER_TRAIL, today().plusDays(1));

        assertEquals(3, Set.of(base, otherDate, otherTrail).size());
        assertEquals(3, countPlans());
    }

    @Test
    void twoUsersPlanningTheSameTrailAndDateGetIndependentPlans() throws Exception {
        UUID a = createPlan("user-a", TRAIL, today());
        UUID b = createPlan("user-b", TRAIL, today());

        assertNotEquals(a, b);
        assertEquals(2, countPlans());
    }

    @Test
    void afterADeleteTheSameTrailAndDateCanBePlannedAgain() throws Exception {
        UUID first = createPlan("user-a", TRAIL, today());
        mockMvc.perform(delete("/api/plans/{id}", first).with(userA()))
                .andExpect(status().isNoContent());

        UUID second = createPlan("user-a", TRAIL, today());

        assertNotEquals(first, second);
        assertEquals(2, countPlans());
        assertEquals(1, countActivePlans());
    }

    // ---------------------------------------------------------------- helpers

    private void expectFieldErrors(String body, String field) throws Exception {
        postPlan(userA(), body)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.title").value("Validation Failed"))
                .andExpect(jsonPath("$.errors", hasSize(1)))
                .andExpect(jsonPath("$.errors[0].field").value(field));
    }

    private static void assertClean(MvcResult result) throws Exception {
        String body = result.getResponse().getContentAsString();
        for (String forbidden : List.of("ownerSubject", "owner_subject", "user-a", "deleted")) {
            assertFalse(body.contains(forbidden), forbidden + " in " + body);
        }
    }
}
