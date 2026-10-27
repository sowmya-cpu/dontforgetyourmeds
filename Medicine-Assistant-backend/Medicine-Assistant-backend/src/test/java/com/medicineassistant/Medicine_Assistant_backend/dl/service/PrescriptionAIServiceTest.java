package com.medicineassistant.Medicine_Assistant_backend.dl.service;

import io.github.cdimascio.dotenv.Dotenv;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import java.net.SocketTimeoutException;
import java.time.Duration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class PrescriptionAIServiceTest {

    private static final String API_URL =
            "https://generativelanguage.googleapis.com/test";

    private MockRestServiceServer server;
    private PrescriptionAIService service;

    @BeforeEach
    void setUp() {
        Dotenv dotenv = mock(Dotenv.class);
        when(dotenv.get("GEMINI_API_KEY")).thenReturn("test-api-key");

        RestTemplate restTemplate = new RestTemplate();
        server = MockRestServiceServer.bindTo(restTemplate).build();
        service = new PrescriptionAIService(
                dotenv,
                restTemplate,
                API_URL,
                Duration.ofSeconds(10),
                Duration.ofSeconds(90)
        );
    }

    @Test
    void sendsGeminiRequestAndReturnsGeneratedText() {
        server.expect(requestTo(API_URL))
                .andExpect(method(org.springframework.http.HttpMethod.POST))
                .andExpect(header("x-goog-api-key", "test-api-key"))
                .andExpect(content().contentTypeCompatibleWith(
                        MediaType.APPLICATION_JSON
                ))
                .andExpect(jsonPath("$.contents[0].parts[0].text")
                        .value(org.hamcrest.Matchers.containsString(
                                "USER QUESTION:\nWhat is this?"
                        )))
                .andRespond(withSuccess(
                        """
                        {"candidates":[{"content":{"parts":[{"text":"Hello"}]}}]}
                        """,
                        MediaType.APPLICATION_JSON
                ));

        assertEquals(
                "Hello",
                service.askAssistant("What is this?", "")
        );
        server.verify();
    }

    @Test
    void mapsQuotaResponseToTooManyRequests() {
        server.expect(requestTo(API_URL))
                .andRespond(withStatus(HttpStatus.TOO_MANY_REQUESTS)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("""
                              {"error":{"message":"Quota exhausted"}}
                              """));

        GeminiApiException exception = assertThrows(
                GeminiApiException.class,
                () -> service.askAssistant("Question", "")
        );

        assertEquals(HttpStatus.TOO_MANY_REQUESTS, exception.getStatus());
        server.verify();
    }

    @Test
    void mapsSocketTimeoutToGatewayTimeout() {
        server.expect(requestTo(API_URL))
                .andRespond(request -> {
                    throw new SocketTimeoutException("Read timed out");
                });

        GeminiApiException exception = assertThrows(
                GeminiApiException.class,
                () -> service.askAssistant("Question", "")
        );

        assertEquals(HttpStatus.GATEWAY_TIMEOUT, exception.getStatus());
        server.verify();
    }

    @Test
    void rejectsResponseWithoutGeneratedCandidates() {
        server.expect(requestTo(API_URL))
                .andRespond(withSuccess(
                        "{\"candidates\":[]}",
                        MediaType.APPLICATION_JSON
                ));

        GeminiApiException exception = assertThrows(
                GeminiApiException.class,
                () -> service.askAssistant("Question", "")
        );

        assertEquals(HttpStatus.BAD_GATEWAY, exception.getStatus());
        server.verify();
    }
}
