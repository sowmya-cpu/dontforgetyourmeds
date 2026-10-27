package com.medicineassistant.Medicine_Assistant_backend;

import com.medicineassistant.Medicine_Assistant_backend.dl.service.GeminiApiException;
import com.medicineassistant.Medicine_Assistant_backend.dl.service.PrescriptionAIService;
import com.medicineassistant.Medicine_Assistant_backend.config.GeminiConfig;
import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.boot.convert.DurationStyle;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.Properties;

public class GeminiConnectionTest {

    public static void main(String[] args) throws Exception {
        System.setProperty("java.net.preferIPv4Stack", "true");

        Properties properties = new Properties();
        Path propertiesPath = Path.of(
                "src",
                "main",
                "resources",
                "application.properties"
        );
        try (InputStream input = Files.newInputStream(propertiesPath)) {
            properties.load(input);
        }

        Duration connectTimeout = DurationStyle.detectAndParse(
                properties.getProperty("gemini.api.connect-timeout", "10s")
        );
        Duration readTimeout = DurationStyle.detectAndParse(
                properties.getProperty("gemini.api.read-timeout", "90s")
        );
        String apiUrl = properties.getProperty("gemini.api.url");
        String model = args.length > 0 ? args[0] : "gemini-3.5-flash-lite";
        if (!model.matches("gemini-[0-9.]+-flash(-lite)?")) {
            throw new IllegalArgumentException(
                    "Model must be a Gemini Flash or Flash-Lite model ID."
            );
        }
        apiUrl = apiUrl.replaceFirst(
                "models/[^:]+:",
                "models/" + model + ":"
        );
        String question = args.length > 1
                ? String.join(" ", java.util.Arrays.copyOfRange(args, 1, args.length))
                : "Reply with only: Gemini is working";

        GeminiConfig config = new GeminiConfig();
        PrescriptionAIService service = new PrescriptionAIService(
                Dotenv.configure().ignoreIfMissing().load(),
                config.geminiRestTemplate(connectTimeout, readTimeout),
                apiUrl,
                connectTimeout,
                readTimeout
        );

        System.out.println(
                "Sending diagnostic request using the backend Gemini client "
                        + "with model " + model + "."
        );
        try {
            String response = service.askAssistant(
                    question,
                    ""
            );
            System.out.println("Gemini diagnostic request succeeded.");
            System.out.println("Response: " + response);
        } catch (GeminiApiException e) {
            System.err.println(
                    "Gemini diagnostic request failed; mapped backend status: "
                            + e.getStatus().value()
            );
            System.err.println(e.getMessage());
        }
    }
}