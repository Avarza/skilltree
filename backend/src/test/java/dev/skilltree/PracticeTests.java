package dev.skilltree;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import dev.skilltree.practice.PracticeContent;
import dev.skilltree.practice.PracticeGenerator;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:skilltree-test;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH")
@AutoConfigureMockMvc
@ActiveProfiles("dev")
class PracticeTests {

    @Autowired
    MockMvc mvc;

    @Autowired
    ObjectMapper objectMapper;

    @MockitoBean
    PracticeGenerator generator;

    private static final PracticeContent SAMPLE = new PracticeContent("Types describe values.",
            List.of("Annotate three variables", "Fix one type error"),
            List.of(new PracticeContent.QuizQuestion("Which is a primitive?", List.of("string", "Array"), 0, "string is primitive")),
            20);

    @Test
    void practiceIsGeneratedOnceThenServedFromCache() throws Exception {
        when(generator.generate(any())).thenReturn(new PracticeGenerator.Result(SAMPLE, "test-model"));
        String token = register();
        String treeId = templateTree(token);

        for (int i = 0; i < 2; i++) {
            mvc.perform(get("/api/v1/trees/" + treeId + "/nodes/ts-setup/practice").header("Authorization", "Bearer " + token))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.tasks.length()").value(2))
                    .andExpect(jsonPath("$.quiz[0].correctIndex").value(0))
                    .andExpect(jsonPath("$.suggestedMinutes").value(20));
        }
        verify(generator, times(1)).generate(any());

        mvc.perform(get("/api/v1/trees/" + treeId + "/nodes/nope/practice").header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
        String other = register();
        mvc.perform(get("/api/v1/trees/" + treeId + "/nodes/ts-setup/practice").header("Authorization", "Bearer " + other))
                .andExpect(status().isNotFound());
    }

    @Test
    void invalidAiPracticeIsRejected() throws Exception {
        when(generator.generate(any())).thenReturn(new PracticeGenerator.Result(
                new PracticeContent("", List.of(), List.of(), 1), "test-model"));
        String token = register();
        String treeId = templateTree(token);
        mvc.perform(get("/api/v1/trees/" + treeId + "/nodes/ts-setup/practice").header("Authorization", "Bearer " + token))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.code").value("ai_invalid_practice"));
    }

    @Test
    void studySessionsAreRecordedAndListed() throws Exception {
        String token = register();
        String treeId = templateTree(token);
        mvc.perform(post("/api/v1/trees/" + treeId + "/nodes/ts-setup/sessions").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"durationSeconds\":1500}"))
                .andExpect(status().isCreated());
        mvc.perform(post("/api/v1/trees/" + treeId + "/nodes/ts-setup/sessions").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"durationSeconds\":0}"))
                .andExpect(status().isBadRequest());

        String since = Instant.now().minus(1, ChronoUnit.DAYS).toString();
        mvc.perform(get("/api/v1/sessions").param("since", since).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].durationSeconds").value(1500))
                .andExpect(jsonPath("$[0].nodeId").value("ts-setup"));

        // Sessions are private.
        mvc.perform(get("/api/v1/sessions").param("since", since).header("Authorization", "Bearer " + register()))
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void fallbackPracticeIsValidWithoutAi() {
        PracticeContent p = invokeFallback(new PracticeGenerator.Request("Guitar", "Power Chords", "Play E5 cleanly", 150, "en"));
        assertThat(p.lesson()).contains("E5");
        assertThat(p.tasks()).hasSize(3);
        assertThat(p.quiz()).isEmpty();
        assertThat(p.suggestedMinutes()).isBetween(5, 90);
    }

    private static PracticeContent invokeFallback(PracticeGenerator.Request r) {
        try {
            var m = Class.forName("dev.skilltree.practice.ClaudePracticeGenerator").getDeclaredMethod("fallback", PracticeGenerator.Request.class);
            m.setAccessible(true);
            return (PracticeContent) m.invoke(null, r);
        } catch (ReflectiveOperationException e) {
            throw new AssertionError(e);
        }
    }

    private String register() throws Exception {
        MvcResult r = mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"p-" + UUID.randomUUID() + "@test.dev\",\"password\":\"correct-horse-battery\"}"))
                .andExpect(status().isCreated()).andReturn();
        return objectMapper.readTree(r.getResponse().getContentAsString()).get("accessToken").asString();
    }

    private String templateTree(String token) throws Exception {
        MvcResult r = mvc.perform(post("/api/v1/trees/from-template/learn-typescript").header("Authorization", "Bearer " + token))
                .andExpect(status().isCreated()).andReturn();
        return objectMapper.readTree(r.getResponse().getContentAsString()).get("id").asString();
    }
}
