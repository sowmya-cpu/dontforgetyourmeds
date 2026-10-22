package com.medicineassistant.Medicine_Assistant_backend.dl.service;

import io.github.cdimascio.dotenv.Dotenv;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Service
public class PrescriptionAIService {

    private final String apiKey;
    private final String apiUrl;
    private final RestTemplate restTemplate;

    private static final int MAX_ATTEMPTS = 3;

    public PrescriptionAIService(
            Dotenv dotenv,
            @Value("${gemini.api.url}") String apiUrl) {

        this.apiKey = dotenv.get("GEMINI_API_KEY");
        this.apiUrl = apiUrl;
        this.restTemplate = new RestTemplate();

        if (this.apiKey == null || this.apiKey.isBlank()) {
            throw new IllegalStateException(
                    "GEMINI_API_KEY was not found in the backend .env file."
            );
        }

        if (this.apiUrl == null || this.apiUrl.isBlank()) {
            throw new IllegalStateException(
                    "Gemini API URL is missing from application configuration."
            );
        }
    }

    public String analyzePrescription(String ocrText) {

        if (ocrText == null || ocrText.isBlank()) {
            throw new IllegalArgumentException(
                    "Prescription text cannot be empty."
            );
        }

        String prompt = """
                You are an assistant that extracts medicine details from prescription OCR text.

                Extract every medicine explicitly mentioned in the text.

                Return only a valid JSON object in this format:
                {
                  "medicines": [
                    {
                      "medicineName": "",
                      "strength": "",
                      "dosage": "",
                      "frequency": "",
                      "instructions": "",
                      "duration": ""
                    }
                  ]
                }

                IMPORTANT RULES:
                1. Read the entire OCR text before extracting medicines.
                2. Associate each medicine with its own dosage, frequency,
                   instructions, and duration.
                3. A duration such as "5 days" may appear on a separate line.
                   Include it for the correct medicine when the text clearly
                   associates it with that medicine.
                4. Do not stop reading a medicine's instructions just because
                   the next detail appears on another line.
                5. Never copy one medicine's duration to another medicine
                   unless the prescription explicitly indicates that they share it.
                6. Never invent missing values. If a detail is absent or unclear,
                   return an empty string for that field.
                7. Preserve the medicine name and prescribed details accurately.
                8. Return every medicine found in the prescription.
                9. Do not provide medical advice or change prescribed instructions.

                OCR TEXT:
                """ + ocrText;

        Map<String, Object> requestBody = Map.of(
                "contents", List.of(
                        Map.of(
                                "parts", List.of(
                                        Map.of("text", prompt)
                                )
                        )
                ),
                "generationConfig", Map.of(
                        "responseMimeType", "application/json"
                )
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("x-goog-api-key", apiKey);

        HttpEntity<Map<String, Object>> request =
                new HttpEntity<>(requestBody, headers);

        // Retry only temporary failures.
        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {

            try {
                ResponseEntity<Map> response = restTemplate.postForEntity(
                        apiUrl,
                        request,
                        Map.class
                );

                return extractMedicineResponse(response);

            } catch (HttpStatusCodeException ex) {

                HttpStatusCode status = ex.getStatusCode();

                // Retry temporary server errors and rate limits.
                boolean retryable =
                        status.value() == 429 ||
                        status.value() == 500 ||
                        status.value() == 502 ||
                        status.value() == 503 ||
                        status.value() == 504;

                if (!retryable) {
                    throw new IllegalStateException(
                            "Gemini API request failed with HTTP "
                                    + status.value()
                                    + ". Please check the API configuration and request.",
                            ex
                    );
                }

                if (attempt == MAX_ATTEMPTS) {
                    throw new IllegalStateException(
                            "The prescription analysis service is temporarily busy. "
                                    + "Please wait a little and try again.",
                            ex
                    );
                }

                waitBeforeRetry(attempt);

            } catch (ResourceAccessException ex) {

                // Network and connection timeouts may be temporary.
                if (attempt == MAX_ATTEMPTS) {
                    throw new IllegalStateException(
                            "Could not connect to the prescription analysis service. "
                                    + "Please check your connection and try again.",
                            ex
                    );
                }

                waitBeforeRetry(attempt);
            }
        }

        throw new IllegalStateException(
                "Unable to analyze the prescription. Please try again later."
        );
    }

    private String extractMedicineResponse(
            ResponseEntity<Map> response) {

        Map<?, ?> responseBody = response.getBody();

        if (responseBody == null) {
            throw new IllegalStateException(
                    "Gemini returned an empty response."
            );
        }

        Object candidatesObject = responseBody.get("candidates");

        if (!(candidatesObject instanceof List<?> candidates)
                || candidates.isEmpty()) {
            throw new IllegalStateException(
                    "Gemini did not return any results."
            );
        }

        Object candidateObject = candidates.get(0);

        if (!(candidateObject instanceof Map<?, ?> candidate)) {
            throw new IllegalStateException(
                    "Gemini returned an invalid candidate."
            );
        }

        Object contentObject = candidate.get("content");

        if (!(contentObject instanceof Map<?, ?> content)) {
            throw new IllegalStateException(
                    "Gemini returned no response content."
            );
        }

        Object partsObject = content.get("parts");

        if (!(partsObject instanceof List<?> parts)
                || parts.isEmpty()) {
            throw new IllegalStateException(
                    "Gemini returned no response text."
            );
        }

        Object firstPartObject = parts.get(0);

        if (!(firstPartObject instanceof Map<?, ?> firstPart)) {
            throw new IllegalStateException(
                    "Gemini returned an invalid response part."
            );
        }

        Object textObject = firstPart.get("text");

        if (!(textObject instanceof String result)
                || result.isBlank()) {
            throw new IllegalStateException(
                    "Gemini returned empty medicine details."
            );
        }

        return result;
    }

    private void waitBeforeRetry(int attempt) {

        // Attempt 1 waits 2 seconds; attempt 2 waits 4 seconds.
        long delayMillis = 2000L * attempt;

        try {
            Thread.sleep(delayMillis);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();

            throw new IllegalStateException(
                    "Prescription analysis was interrupted.",
                    ex
            );
        }
    }
}