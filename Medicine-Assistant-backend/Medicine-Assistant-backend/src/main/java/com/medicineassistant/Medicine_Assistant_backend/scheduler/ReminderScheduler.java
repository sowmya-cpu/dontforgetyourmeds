package com.medicineassistant.Medicine_Assistant_backend.scheduler;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.medicineassistant.Medicine_Assistant_backend.WebPushService;
import com.medicineassistant.Medicine_Assistant_backend.WebPushService.PushDeliveryException;
import com.medicineassistant.Medicine_Assistant_backend.model.PushSubscriptionEntity;
import com.medicineassistant.Medicine_Assistant_backend.model.ReminderScheduleEntity;
import com.medicineassistant.Medicine_Assistant_backend.repository.UserRepository;
import com.medicineassistant.Medicine_Assistant_backend.repository.PushSubscriptionRepository;
import com.medicineassistant.Medicine_Assistant_backend.repository.ReminderScheduleRepository;

@Component
public class ReminderScheduler {

    private static final Logger logger =
            LoggerFactory.getLogger(ReminderScheduler.class);
    private static final ZoneId REMINDER_ZONE =
            ZoneId.of("Asia/Kolkata");

    private final ReminderScheduleRepository reminderRepository;
    private final PushSubscriptionRepository subscriptionRepository;
    private final UserRepository userRepository;
    private final WebPushService webPushService;

    public ReminderScheduler(
            ReminderScheduleRepository reminderRepository,
            PushSubscriptionRepository subscriptionRepository,
            UserRepository userRepository,
            WebPushService webPushService) {

        this.reminderRepository = reminderRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.userRepository = userRepository;
        this.webPushService = webPushService;
    }

    @Scheduled(fixedRate = 30000)
    @Transactional
    public void sendDueReminders() {

        LocalDateTime now = LocalDateTime.now(REMINDER_ZONE);
        long enabledCount = reminderRepository.countByEnabledTrue();
        List<ReminderScheduleEntity> dueSchedules =
                reminderRepository
                        .findByEnabledTrueAndScheduledAtLessThanEqual(now);

        logger.info(
                "Reminder scheduler run at {}: {} enabled schedules, {} due",
                now,
                enabledCount,
                dueSchedules.size()
        );

        for (ReminderScheduleEntity schedule : dueSchedules) {
            Long userId = schedule.getUserId();
            String userEmail = userRepository.findById(userId)
                    .map(user -> user.getEmail())
                    .orElse(null);

            List<PushSubscriptionEntity> subscriptions =
                    subscriptionRepository.findByUserId(userId);

            logger.info(
                    "Reminder schedule {} ({}) lookup: userFound={}, subscriptions={}",
                    schedule.getId(),
                    schedule.getTimeOfDay(),
                    userEmail != null,
                    subscriptions.size()
            );

            int successfulDeliveries = 0;
            int failedDeliveries = 0;
            int expiredSubscriptions = 0;

            for (PushSubscriptionEntity subscription : subscriptions) {
                try {
                    String title = "Medicine Assistant 💊";
                    String body =
                            "Your scheduled " +
                            schedule.getTimeOfDay().toLowerCase() +
                            " medicine reminder is due.";

                    if (userEmail == null) {
                        webPushService.sendToSubscription(
                                subscription,
                                title,
                                body
                        );
                    } else {
                        webPushService.sendReminderToSubscription(
                                subscription,
                                title,
                                body,
                                userEmail,
                                schedule.getTimeOfDay(),
                                schedule.getScheduledAt()
                        );
                    }
                    successfulDeliveries++;
                    logger.info(
                            "Push accepted for reminder schedule {} subscription {}",
                            schedule.getId(),
                            subscription.getId()
                    );
                } catch (PushDeliveryException e) {
                    failedDeliveries++;
                    int statusCode = e.getStatusCode();

                    if (statusCode == 404 || statusCode == 410) {
                        subscriptionRepository.delete(subscription);
                        expiredSubscriptions++;
                        logger.warn(
                                "Removed expired push subscription {} for reminder schedule {} (HTTP {})",
                                subscription.getId(),
                                schedule.getId(),
                                statusCode
                        );
                    } else {
                        logger.warn(
                                "Push delivery rejected for reminder schedule {} subscription {} (HTTP {})",
                                schedule.getId(),
                                subscription.getId(),
                                statusCode
                        );
                    }
                } catch (Exception e) {
                    failedDeliveries++;
                    logger.warn(
                            "Push delivery failed for reminder schedule {} subscription {} ({})",
                            schedule.getId(),
                            subscription.getId(),
                            e.getClass().getSimpleName()
                    );
                }
            }

            if (successfulDeliveries == 0) {
                logger.warn(
                        "Retaining due reminder schedule {} for retry: {} failed, {} expired, {} subscriptions",
                        schedule.getId(),
                        failedDeliveries,
                        expiredSubscriptions,
                        subscriptions.size()
                );
                continue;
            }

            LocalDateTime nextScheduledAt =
                    schedule.getScheduledAt().plusDays(1);
            while (!nextScheduledAt.isAfter(now)) {
                nextScheduledAt = nextScheduledAt.plusDays(1);
            }
            schedule.setScheduledAt(nextScheduledAt);
            reminderRepository.save(schedule);

            logger.info(
                    "Advanced reminder schedule {} to {} after {} accepted push(es); {} failed, {} expired",
                    schedule.getId(),
                    nextScheduledAt,
                    successfulDeliveries,
                    failedDeliveries,
                    expiredSubscriptions
            );
        }
    }
}