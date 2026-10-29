package com.medicineassistant.Medicine_Assistant_backend.controller;

import com.medicineassistant.Medicine_Assistant_backend.dl.service.PrescriptionAIService;
import com.medicineassistant.Medicine_Assistant_backend.dl.service.GeminiApiException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/prescription-ai")
public class PrescriptionAIController {

    private static final Logger logger =
            LoggerFactory.getLogger(PrescriptionAIController.class);

    private final PrescriptionAIService prescriptionAIService;

    public PrescriptionAIController(
            PrescriptionAIService prescriptionAIService) {
        this.prescriptionAIService = prescriptionAIService;
    }

    @PostMapping("/analyze")
    public ResponseEntity<?> analyzePrescription(
            @RequestBody Map<String, String> request) {

        String ocrText = request.get("ocrText");

        if (ocrText == null || ocrText.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "OCR text is required."));
        }

        try {
            String result =
                    prescriptionAIService.analyzePrescription(ocrText);

            return ResponseEntity.ok(Map.of("result", result));

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));

        } catch (GeminiApiException e) {
            return ResponseEntity.status(e.getStatus())
                    .body(Map.of("error", e.getMessage()));

        } catch (Exception e) {
            logger.error("Prescription analysis failed.", e);

            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of(
                            "error",
                            "Prescription analysis is temporarily unavailable. Please try again later."
                    ));
        }
    }

    @PostMapping("/ask")
    public ResponseEntity<?> askAssistant(
            @RequestBody Map<String, String> request) {

        String question = request.get("question");
        String medicineContext = request.getOrDefault(
                "medicineContext", ""
        );

        if (question == null || question.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Please enter a question."));
        }

        try {
            String answer = prescriptionAIService.askAssistant(
                    question,
                    medicineContext
            );

            return ResponseEntity.ok(Map.of("answer", answer));

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));

        } catch (GeminiApiException e) {
            return ResponseEntity.status(e.getStatus())
                    .body(Map.of("error", e.getMessage()));

        } catch (Exception e) {
            logger.error("Ask Assistant failed.", e);

            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of(
                            "error",
                            "The assistant is temporarily unavailable. Please try again later."
                    ));
        }
    }
}