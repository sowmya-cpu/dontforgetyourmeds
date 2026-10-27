package com.medicineassistant.Medicine_Assistant_backend.dl.service;

import io.github.cdimascio.dotenv.Dotenv;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.net.SocketTimeoutException;
import java.net.http.HttpTimeoutException;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class PrescriptionAIService {

    private static final Logger logger =
            LoggerFactory.getLogger(PrescriptionAIService.class);

    private final String apiKey;
    private final String apiUrl;
    private final RestTemplate restTemplate;
    private final Duration connectTimeout;
    private final Duration readTimeout;

    public PrescriptionAIService(
            Dotenv dotenv,
            RestTemplate restTemplate,
            @Value("${gemini.api.url}") String apiUrl,
            @Value("${gemini.api.connect-timeout:10s}") Duration connectTimeout,
            @Value("${gemini.api.read-timeout:90s}") Duration readTimeout) {

        this.apiKey = dotenv.get("GEMINI_API_KEY");
        this.apiUrl = apiUrl;
        this.restTemplate = restTemplate;
        this.connectTimeout = connectTimeout;
        this.readTimeout = readTimeout;

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

        logger.info(
                "Gemini API configured for host {} with model {} "
                        + "(connect timeout {}, read timeout {}).",
                hostName(),
                modelName(),
                connectTimeout,
                readTimeout
        );
    }

    public String analyzePrescription(String ocrText) {

        if (ocrText == null || ocrText.isBlank()) {
            throw new IllegalArgumentException(
                    "Prescription text cannot be empty."
            );
        }

        String prompt = """
                You extract medicine details from prescription OCR text.

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

                Rules:
                1. Extract every medicine explicitly mentioned.
                2. Associate each medicine with its own instructions.
                3. Never invent missing values.
                4. Use empty strings for absent or unclear details.
                5. Do not change prescribed instructions.
                6. Return only valid JSON.

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

        return sendGeminiRequest(requestBody);
    }

    public String askAssistant(
            String question,
            String medicineContext) {

        if (question == null || question.isBlank()) {
            throw new IllegalArgumentException(
                    "Question cannot be empty."
            );
        }

        String safeMedicineContext =
                medicineContext == null || medicineContext.isBlank()
                        ? "No saved medicine information was provided."
                        : medicineContext;

        String prompt = """
                You are a Medicine Assistant helping users, especially older adults.

                Rules:
                1. Explain information in simple, clear language.
                2. Use the supplied medicine information when relevant.
                3. Never invent medicine details or prescribed dosages.
                4. Never recommend changing a prescribed dosage.
                5. If information is insufficient, say so.
                6. For missed doses or possible interactions, recommend contacting
                   a doctor or pharmacist.
                7. For potentially life-threatening symptoms, advise emergency care.
                8. Do not claim to be a doctor.

                SAVED MEDICINE INFORMATION:
                """ + safeMedicineContext
                + "\n\nUSER QUESTION:\n" + question;

        Map<String, Object> requestBody = Map.of(
                "contents", List.of(
                        Map.of(
                                "parts", List.of(
                                        Map.of("text", prompt)
                                )
                        )
                )
        );

        return sendGeminiRequest(requestBody);
    }

    private String sendGeminiRequest(
            Map<String, Object> requestBody) {

        HttpHeaders headers = new HttpHeaders();

        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("x-goog-api-key", apiKey);

        HttpEntity<Map<String, Object>> request =
                new HttpEntity<>(requestBody, headers);

        try {
            logger.info("Sending request to Gemini API host {}.", hostName());

            ResponseEntity<Map> response =
                    restTemplate.postForEntity(
                            apiUrl,
                            request,
                            Map.class
                    );

            logger.info(
                    "Gemini API returned HTTP {} with response headers {}.",
                    response.getStatusCode(),
                    diagnosticHeaders(response.getHeaders())
            );

            return extractResponse(response);
        } catch (HttpStatusCodeException ex) {

            int status = ex.getStatusCode().value();
            String responseBody = redactAndLimit(
                    ex.getResponseBodyAsString()
            );

            logger.warn(
                    "Gemini API returned HTTP {} with response headers {}: {}",
                    status,
                    diagnosticHeaders(ex.getResponseHeaders()),
                    responseBody
            );

            if (status == 429) {
                throw new GeminiApiException(
                        HttpStatus.TOO_MANY_REQUESTS,
                        "The Gemini API quota or rate limit has been reached. "
                                + "Please check your API quota and try again later.",
                        ex
                );
            }

            if (status == 503) {
                throw new GeminiApiException(
                        HttpStatus.SERVICE_UNAVAILABLE,
                        "Gemini is temporarily unavailable (HTTP 503). "
                                + "Please try again later.",
                        ex
                );
            }

            if (status == 504) {
                throw new GeminiApiException(
                        HttpStatus.GATEWAY_TIMEOUT,
                        "Gemini returned HTTP 504 (Gateway Timeout).",
                        ex
                );
            }

            if (status == 401 || status == 403) {
                throw new GeminiApiException(
                        HttpStatus.BAD_GATEWAY,
                        "Gemini rejected the backend API credentials. "
                                + "Check the backend GEMINI_API_KEY configuration.",
                        ex
                );
            }

            if (status == 400 || status == 404) {
                throw new GeminiApiException(
                        HttpStatus.BAD_GATEWAY,
                        "Gemini rejected the configured model or request "
                                + "(HTTP " + status + ").",
                        ex
                );
            }

            throw new GeminiApiException(
                    status >= 500
                            ? HttpStatus.SERVICE_UNAVAILABLE
                            : HttpStatus.BAD_GATEWAY,
                    "Gemini API request failed with HTTP " + status + ".",
                    ex
            );

        } catch (ResourceAccessException ex) {

            Throwable cause = mostSpecificCause(ex);
            String causeMessage = redactAndLimit(cause.getMessage());
            boolean timedOut = hasTimeoutCause(ex);

            logger.warn(
                    "Gemini transport failure; no HTTP status was available. "
                            + "host={}, connectTimeout={}, readTimeout={}, "
                            + "causeType={}, causeMessage={}",
                    hostName(),
                    connectTimeout,
                    readTimeout,
                    cause.getClass().getSimpleName(),
                    causeMessage
            );

            throw new GeminiApiException(
                    timedOut
                            ? HttpStatus.GATEWAY_TIMEOUT
                            : HttpStatus.SERVICE_UNAVAILABLE,
                    timedOut
                            ? "The AI service did not respond before the backend timeout. "
                                    + "Please try again later."
                            : "The backend could not connect to the AI service. "
                                    + "Please try again later.",
                    ex
            );
        }
    }

    private String extractResponse(
            ResponseEntity<Map> response) {

        Map<?, ?> responseBody = response.getBody();

        if (responseBody == null) {
            throw new GeminiApiException(
                    HttpStatus.BAD_GATEWAY,
                    "Gemini returned an empty response."
            );
        }

        Object candidatesObject = responseBody.get("candidates");

        if (!(candidatesObject instanceof List<?> candidates)
                || candidates.isEmpty()) {

            logger.warn(
                    "Gemini response did not contain any candidates."
            );
            throw new GeminiApiException(
                    HttpStatus.BAD_GATEWAY,
                    "The AI service did not return an answer. Please rephrase your question and try again."
            );
        }

        Object candidateObject = candidates.get(0);

        if (!(candidateObject instanceof Map<?, ?> candidate)) {
            throw new GeminiApiException(
                    HttpStatus.BAD_GATEWAY,
                    "Gemini returned an invalid candidate."
            );
        }

        Object contentObject = candidate.get("content");

        if (!(contentObject instanceof Map<?, ?> content)) {
            throw new GeminiApiException(
                    HttpStatus.BAD_GATEWAY,
                    "Gemini returned no response content."
            );
        }

        Object partsObject = content.get("parts");

        if (!(partsObject instanceof List<?> parts)
                || parts.isEmpty()) {

            throw new GeminiApiException(
                    HttpStatus.BAD_GATEWAY,
                    "Gemini returned no response text."
            );
        }

        StringBuilder result = new StringBuilder();

        for (Object partObject : parts) {

            if (partObject instanceof Map<?, ?> part) {

                if (Boolean.TRUE.equals(part.get("thought"))) {
                    continue;
                }

                Object textObject = part.get("text");

                if (textObject instanceof String text) {
                    result.append(text);
                }
            }
        }

        if (result.toString().isBlank()) {
            throw new GeminiApiException(
                    HttpStatus.BAD_GATEWAY,
                    "Gemini returned empty response text."
            );
        }

        return result.toString();
    }

    private boolean hasTimeoutCause(Throwable exception) {
        for (Throwable cause = exception;
             cause != null && cause.getCause() != cause;
             cause = cause.getCause()) {
            if (cause instanceof SocketTimeoutException
                    || cause instanceof HttpTimeoutException) {
                return true;
            }
        }
        return false;
    }

    private Throwable mostSpecificCause(Throwable exception) {
        Throwable cause = exception;
        while (cause.getCause() != null && cause.getCause() != cause) {
            cause = cause.getCause();
        }
        return cause;
    }

    private String hostName() {
        try {
            return java.net.URI.create(apiUrl).getHost();
        } catch (IllegalArgumentException ex) {
            return "unavailable";
        }
    }

    private String modelName() {
        try {
            String path = java.net.URI.create(apiUrl).getPath();
            int modelStart = path.indexOf("/models/");
            int methodStart = path.indexOf(':', modelStart);
            if (modelStart >= 0 && methodStart > modelStart) {
                return path.substring(modelStart + "/models/".length(), methodStart);
            }
            return "unavailable";
        } catch (IllegalArgumentException ex) {
            return "unavailable";
        }
    }

    private String redactAndLimit(String value) {
        if (value == null || value.isBlank()) {
            return "(no details)";
        }
        String redacted = apiKey == null || apiKey.isBlank()
                ? value
                : value.replace(apiKey, "[REDACTED]");
        return redacted.length() <= 1000
                ? redacted
                : redacted.substring(0, 1000) + "...";
    }

    private Map<String, String> diagnosticHeaders(
            org.springframework.http.HttpHeaders headers) {
        Map<String, String> diagnosticHeaders = new LinkedHashMap<>();
        if (headers == null) {
            return diagnosticHeaders;
        }

        for (String name : List.of(
                "content-type",
                "date",
                "retry-after",
                "server",
                "x-request-id")) {
            String value = headers.getFirst(name);
            if (value != null) {
                diagnosticHeaders.put(name, value);
            }
        }
        return diagnosticHeaders;
    }
}