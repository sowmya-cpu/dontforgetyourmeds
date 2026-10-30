
package com.medicineassistant.Medicine_Assistant_backend;

import java.security.GeneralSecurityException;
import java.security.Security;
import java.time.LocalDateTime;

import org.apache.http.HttpResponse;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.medicineassistant.Medicine_Assistant_backend.model.PushSubscriptionEntity;

import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import nl.martijndwars.webpush.Subscription;

@Service
public class WebPushService {

    private final PushService pushService;

    public WebPushService(
            @Value("${webpush.public-key}") String publicKey,
            @Value("${webpush.private-key}") String privateKey,
            @Value("${webpush.subject}") String subject)
            throws GeneralSecurityException {

        if (Security.getProvider("BC") == null) {
            Security.addProvider(new BouncyCastleProvider());
        }

        this.pushService = new PushService(
                publicKey,
                privateKey,
                subject
        );
    }

    public void sendNotification(
            String endpoint,
            String p256dh,
            String auth,
            String title,
            String body) throws Exception {

        sendNotification(
                endpoint,
                p256dh,
                auth,
                title,
                body,
                null,
                null,
                null
        );
    }

    public void sendReminderToSubscription(
            PushSubscriptionEntity subscription,
            String title,
            String body,
            String userEmail,
            String timeOfDay,
            LocalDateTime scheduledAt) throws Exception {

        sendNotification(
                subscription.getEndpoint(),
                subscription.getP256dh(),
                subscription.getAuth(),
                title,
                body,
                userEmail,
                timeOfDay,
                scheduledAt
        );
    }

    private void sendNotification(
            String endpoint,
            String p256dh,
            String auth,
            String title,
            String body,
            String userEmail,
            String timeOfDay,
            LocalDateTime scheduledAt) throws Exception {

        Subscription.Keys keys =
                new Subscription.Keys(p256dh, auth);

        Subscription subscription =
                new Subscription(endpoint, keys);

        String metadata = userEmail == null
                ? ""
                : String.format(
                        ",\"userEmail\":\"%s\",\"timeOfDay\":\"%s\",\"scheduledAt\":\"%s\"",
                        escapeJson(userEmail),
                        escapeJson(timeOfDay),
                        escapeJson(scheduledAt.toString())
                );
        String payload = String.format(
                "{\"title\":\"%s\",\"body\":\"%s\",\"url\":\"/\"%s}",
                escapeJson(title),
                escapeJson(body),
                metadata
        );

        Notification notification =
                new Notification(subscription, payload);

        HttpResponse response = pushService.send(notification);
        int statusCode = response.getStatusLine().getStatusCode();

        if (statusCode < 200 || statusCode >= 300) {
            throw new PushDeliveryException(statusCode);
        }
    }

    public void sendToSubscription(
            PushSubscriptionEntity subscription,
            String title,
            String body) throws Exception {

        sendNotification(
                subscription.getEndpoint(),
                subscription.getP256dh(),
                subscription.getAuth(),
                title,
                body
        );
    }

    private String escapeJson(String value) {
        return value
                .replace("\\", "\\\\")
                .replace("\"", "\\\"");
    }

    public static class PushDeliveryException extends Exception {

        private final int statusCode;

        public PushDeliveryException(int statusCode) {
            super("Push service returned HTTP " + statusCode);
            this.statusCode = statusCode;
        }

        public int getStatusCode() {
            return statusCode;
        }
    }
}
