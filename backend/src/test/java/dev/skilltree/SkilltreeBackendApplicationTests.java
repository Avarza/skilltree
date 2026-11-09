package dev.skilltree;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import dev.skilltree.ai.TreeGenerator;
import dev.skilltree.auth.Role;
import dev.skilltree.auth.UserRepository;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;

@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:skilltree-test;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH")
@AutoConfigureMockMvc
@ActiveProfiles("dev")
class SkilltreeBackendApplicationTests {

    @Autowired
    MockMvc mvc;

    @Autowired
    ObjectMapper objectMapper;

    @Autowired
    UserRepository users;

    @MockitoBean
    TreeGenerator generator;

    @Test
    void seededConfigIsPublicAndSupportsConditionalGet() throws Exception {
        MvcResult first = mvc.perform(get("/api/v1/config"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.schemaVersion").value(1))
                .andExpect(jsonPath("$.theme.slug").value("default"))
                .andExpect(jsonPath("$.templates[0].slug").value("learn-typescript"))
                .andReturn();
        String etag = first.getResponse().getHeader(HttpHeaders.ETAG);
        assertThat(etag).isNotBlank();

        mvc.perform(get("/api/v1/config").header(HttpHeaders.IF_NONE_MATCH, etag))
                .andExpect(status().isNotModified());
    }

    @Test
    void adminEndpointsRequireCmsRole() throws Exception {
        String userToken = register("plain-" + UUID.randomUUID() + "@test.dev");
        mvc.perform(get("/api/v1/admin/entries")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/admin/entries").header("Authorization", "Bearer " + userToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void editorCannotPublishButPublisherReleasesNewConfigVersion() throws Exception {
        String editor = userWithRole("editor-" + UUID.randomUUID() + "@test.dev", Role.EDITOR);
        String publisher = userWithRole("publisher-" + UUID.randomUUID() + "@test.dev", Role.PUBLISHER);
        int versionBefore = currentVersion();

        JsonNode theme = findEntry(editor, "THEME", "default");
        ObjectNode content = (ObjectNode) theme.get("content").deepCopy();
        ((ObjectNode) content.get("light")).put("primary", "#FF5722");

        mvc.perform(put("/api/v1/admin/entries/" + theme.get("id").asLong()).header("Authorization", "Bearer " + editor)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(objectMapper.createObjectNode().set("content", content))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DRAFT"));

        // Draft changes are not live yet.
        mvc.perform(get("/api/v1/config")).andExpect(jsonPath("$.theme.light.primary").value("#0E7490"));

        long id = theme.get("id").asLong();
        mvc.perform(post("/api/v1/admin/entries/" + id + "/submit").header("Authorization", "Bearer " + editor))
                .andExpect(status().isOk());
        mvc.perform(post("/api/v1/admin/entries/" + id + "/publish").header("Authorization", "Bearer " + editor))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/admin/entries/" + id + "/publish").header("Authorization", "Bearer " + publisher))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.configVersion").value(versionBefore + 1));

        mvc.perform(get("/api/v1/config"))
                .andExpect(jsonPath("$.version").value(versionBefore + 1))
                .andExpect(jsonPath("$.theme.light.primary").value("#FF5722"));

        // Rollback re-publishes the previous snapshot as a new version.
        mvc.perform(post("/api/v1/admin/config-versions/" + versionBefore + "/rollback")
                .header("Authorization", "Bearer " + publisher))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.source").value("ROLLBACK"));
        mvc.perform(get("/api/v1/config"))
                .andExpect(jsonPath("$.version").value(versionBefore + 2))
                .andExpect(jsonPath("$.theme.light.primary").value("#0E7490"));
    }

    @Test
    void invalidContentAndUnknownKeysAreRejected() throws Exception {
        String editor = userWithRole("editor2-" + UUID.randomUUID() + "@test.dev", Role.EDITOR);
        JsonNode theme = findEntry(editor, "THEME", "default");
        ObjectNode bad = (ObjectNode) theme.get("content").deepCopy();
        ((ObjectNode) bad.get("light")).put("primary", "red");
        bad.put("javascript", "alert(1)");

        mvc.perform(put("/api/v1/admin/entries/" + theme.get("id").asLong()).header("Authorization", "Bearer " + editor)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(objectMapper.createObjectNode().set("content", bad))))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.code").value("validation_failed"));

        ObjectNode cyclic = objectMapper.createObjectNode();
        cyclic.put("type", "SKILL_TEMPLATE");
        cyclic.put("slug", "cyclic-" + UUID.randomUUID().toString().substring(0, 8));
        cyclic.set("content", objectMapper.readTree("""
                {"title":"Loop","category":"test","locale":"en","nodes":[
                  {"id":"a","title":"A","xp":10,"requires":["b"]},
                  {"id":"b","title":"B","xp":10,"requires":["a"]}]}
                """));
        mvc.perform(post("/api/v1/admin/entries").header("Authorization", "Bearer " + editor)
                .contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(cyclic)))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.errors[0]").value("Node prerequisites contain a cycle"));
    }

    @Test
    void userProgressesThroughTemplateTree() throws Exception {
        String token = register("learner-" + UUID.randomUUID() + "@test.dev");
        MvcResult created = mvc.perform(post("/api/v1/trees/from-template/learn-typescript")
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.nodes[0].status").value("AVAILABLE"))
                .andExpect(jsonPath("$.nodes[1].status").value("LOCKED"))
                .andReturn();
        String treeId = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asString();

        mvc.perform(patch("/api/v1/trees/" + treeId + "/nodes/basic-types").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"COMPLETED\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("node_locked"));

        mvc.perform(patch("/api/v1/trees/" + treeId + "/nodes/ts-setup").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"COMPLETED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.earnedXp").value(50))
                .andExpect(jsonPath("$.nodes[1].status").value("AVAILABLE"));

        // Another user cannot see the tree.
        String other = register("other-" + UUID.randomUUID() + "@test.dev");
        mvc.perform(get("/api/v1/trees/" + treeId).header("Authorization", "Bearer " + other))
                .andExpect(status().isNotFound());
    }

    @Test
    void aiGenerationIsValidatedAndSaved() throws Exception {
        when(generator.generate(any())).thenReturn(new TreeGenerator.Result("Guitar", "Play songs", List.of(
                new TreeGenerator.GeneratedNode("chords", "Basic chords", "C, G, D", 100, List.of()),
                new TreeGenerator.GeneratedNode("strumming", "Strumming", "4/4 patterns", 150, List.of("chords"))),
                "test-model", 10L, 20L));
        String token = register("ai-" + UUID.randomUUID() + "@test.dev");

        mvc.perform(post("/api/v1/trees/generate").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"topic\":\"Guitar\",\"level\":\"beginner\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.source").value("AI"))
                .andExpect(jsonPath("$.totalXp").value(250))
                .andExpect(jsonPath("$.nodes[1].status").value("LOCKED"));

        when(generator.generate(any())).thenReturn(new TreeGenerator.Result("Broken", null, List.of(
                new TreeGenerator.GeneratedNode("a", "A", null, 10, List.of("missing"))), "test-model", 1L, 1L));
        mvc.perform(post("/api/v1/trees/generate").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"topic\":\"Anything\",\"level\":\"beginner\"}"))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.code").value("ai_invalid_tree"));
    }

    // -----------------------------------------------------------------------------------------------------------

    private String register(String email) throws Exception {
        MvcResult result = mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"password\":\"correct-horse-battery\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("accessToken").asString();
    }

    private String userWithRole(String email, Role role) throws Exception {
        register(email);
        var user = users.findByEmailIgnoreCase(email).orElseThrow();
        user.setRole(role);
        users.save(user);
        MvcResult login = mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"password\":\"correct-horse-battery\"}"))
                .andExpect(status().isOk())
                .andExpect(header().doesNotExist("Set-Cookie"))
                .andReturn();
        return objectMapper.readTree(login.getResponse().getContentAsString()).get("accessToken").asString();
    }

    private JsonNode findEntry(String token, String type, String slug) throws Exception {
        MvcResult res = mvc.perform(get("/api/v1/admin/entries?type=" + type).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andReturn();
        for (JsonNode e : objectMapper.readTree(res.getResponse().getContentAsString())) {
            if (slug.equals(e.get("slug").asString())) {
                return e;
            }
        }
        throw new AssertionError("Entry not found: " + slug);
    }

    private int currentVersion() throws Exception {
        MvcResult res = mvc.perform(get("/api/v1/config/version")).andReturn();
        return objectMapper.readTree(res.getResponse().getContentAsString()).get("version").asInt();
    }
}
