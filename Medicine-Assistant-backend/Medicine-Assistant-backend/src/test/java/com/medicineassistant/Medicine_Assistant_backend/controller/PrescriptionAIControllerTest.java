package com.medicineassistant.Medicine_Assistant_backend.controller;

import com.medicineassistant.Medicine_Assistant_backend.dl.service.GeminiApiException;
import com.medicineassistant.Medicine_Assistant_backend.dl.service.PrescriptionAIService;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class PrescriptionAIControllerTest {

    private final PrescriptionAIService service =
            mock(PrescriptionAIService.class);
    private final PrescriptionAIController controller =
            new PrescriptionAIController(service);

    @Test
    void askReturnsAnswerOnSuccess() {
        when(service.askAssistant("What is this?", ""))
                .thenReturn("A general information response.");

        ResponseEntity<?> response = controller.askAssistant(
                Map.of("question", "What is this?")
        );

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(
                Map.of("answer", "A general information response."),
                response.getBody()
        );
    }

    @Test
    void askPreservesQuotaStatusAndMessage() {
        when(service.askAssistant("Question", ""))
                .thenThrow(new GeminiApiException(
                        HttpStatus.TOO_MANY_REQUESTS,
                        "Gemini quota is exhausted."
                ));

        ResponseEntity<?> response = controller.askAssistant(
                Map.of("question", "Question")
        );

        assertEquals(HttpStatus.TOO_MANY_REQUESTS, response.getStatusCode());
        assertEquals(
                Map.of("error", "Gemini quota is exhausted."),
                response.getBody()
        );
    }

    @Test
    void analyzePreservesTimeoutStatusAndMessage() {
        when(service.analyzePrescription("OCR text"))
                .thenThrow(new GeminiApiException(
                        HttpStatus.GATEWAY_TIMEOUT,
                        "The AI service timed out."
                ));

        ResponseEntity<?> response = controller.analyzePrescription(
                Map.of("ocrText", "OCR text")
        );

        assertEquals(HttpStatus.GATEWAY_TIMEOUT, response.getStatusCode());
        assertEquals(
                Map.of("error", "The AI service timed out."),
                response.getBody()
        );
    }
}
