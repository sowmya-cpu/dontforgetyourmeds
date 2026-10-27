
package com.medicineassistant.Medicine_Assistant_backend.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.medicineassistant.Medicine_Assistant_backend.WebPushService;
import com.medicineassistant.Medicine_Assistant_backend.dl.serviceImp.PushSubscriptionService;
import com.medicineassistant.Medicine_Assistant_backend.model.User;
import com.medicineassistant.Medicine_Assistant_backend.repository.UserRepository;

@RestController
@RequestMapping("/api/push")
public class WebPushController {

    private final WebPushService webPushService;
    private final PushSubscriptionService subscriptionService;
    private final UserRepository userRepository;

    public WebPushController(
            WebPushService webPushService,
            PushSubscriptionService subscriptionService,
            UserRepository userRepository) {
        this.webPushService = webPushService;
        this.subscriptionService = subscriptionService;
        this.userRepository = userRepository;
    }

    @PostMapping("/test")
    public ResponseEntity<?> testPush(
            @RequestBody Map<String, String> request) {

        try {
            webPushService.sendNotification(
                    request.get("endpoint"),
                    request.get("p256dh"),
                    request.get("auth"),
                    "Medicine Assistant Test",
                    "Your browser push notification is working!"
            );

            return ResponseEntity.ok(
                    Map.of("message", "Push notification sent successfully")
            );

        } catch (Exception e) {
            e.printStackTrace();

            return ResponseEntity.internalServerError().body(
                    Map.of("error", "Failed to send push notification")
            );
        }
    }

    @PostMapping("/subscribe")
    public ResponseEntity<?> subscribe(
            @RequestBody Map<String, String> request,
            Authentication authentication) {

        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication.getName() == null) {
            return ResponseEntity.status(401)
                    .body(Map.of("error", "Authentication required"));
        }

        String endpoint = request.get("endpoint");
        String p256dh = request.get("p256dh");
        String auth = request.get("auth");

        if (endpoint == null || endpoint.isBlank()
                || p256dh == null || p256dh.isBlank()
                || auth == null || auth.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Incomplete subscription"));
        }

        try {
            User user = userRepository.findByEmail(authentication.getName())
                    .orElse(null);

            if (user == null) {
                return ResponseEntity.status(401)
                        .body(Map.of("error", "User not found"));
            }

            subscriptionService.saveSubscription(
                    endpoint,
                    p256dh,
                    auth,
                    user.getId()
            );

            return ResponseEntity.ok(
                    Map.of("message", "Push subscription saved successfully")
            );

        } catch (Exception e) {
            e.printStackTrace();

            return ResponseEntity.internalServerError().body(
                    Map.of("error", "Could not save subscription")
            );
        }
    }
    
    @PostMapping("/send-test")
    public ResponseEntity<?> sendTestToCurrentUser(
            Authentication authentication) {

        if (authentication == null
                || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401)
                    .body(Map.of("error", "Authentication required"));
        }

        try {
            var user = userRepository
                    .findByEmail(authentication.getName())
                    .orElse(null);

            if (user == null) {
                return ResponseEntity.status(401)
                        .body(Map.of("error", "User not found"));
            }

            var subscriptions =
                    subscriptionService.getSubscriptionsForUser(user.getId());

            if (subscriptions.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "No saved push subscriptions"));
            }

            for (var subscription : subscriptions) {
                webPushService.sendToSubscription(
                        subscription,
                        "Medicine Assistant Test",
                        "Your saved browser subscription is working!"
                );
            }

            return ResponseEntity.ok(
                    Map.of("message", "Test notification sent")
            );

        } catch (Exception e) {
            e.printStackTrace();

            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to send notification"));
        }
    }
}
