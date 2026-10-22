package com.medicineassistant.Medicine_Assistant_backend.controller;

import com.medicineassistant.Medicine_Assistant_backend.dl.service.PrescriptionAIService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/prescription-ai")
public class PrescriptionAIController {

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

            return ResponseEntity.ok(
                    Map.of("result", result)
            );

        } catch (Exception e) {
            e.printStackTrace();

            return ResponseEntity.internalServerError()
                    .body(Map.of(
                            "error",
                            "Unable to analyze prescription: "
                                    + e.getMessage()
                    ));
        }
        
    }
}