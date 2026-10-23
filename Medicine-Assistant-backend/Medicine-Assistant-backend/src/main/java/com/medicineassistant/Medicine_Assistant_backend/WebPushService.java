
package com.medicineassistant.Medicine_Assistant_backend;

import java.security.GeneralSecurityException;
import java.security.Security;

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

        Subscription.Keys keys =
                new Subscription.Keys(p256dh, auth);

        Subscription subscription =
                new Subscription(endpoint, keys);

        String payload = String.format(
                "{\"title\":\"%s\",\"body\":\"%s\",\"url\":\"/\"}",
                escapeJson(title),
                escapeJson(body)
        );

        Notification notification =
                new Notification(subscription, payload);

        pushService.send(notification);
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
}
