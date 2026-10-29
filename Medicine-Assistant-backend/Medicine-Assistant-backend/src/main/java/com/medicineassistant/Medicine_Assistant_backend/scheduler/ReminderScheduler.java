package com.medicineassistant.Medicine_Assistant_backend.scheduler;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.medicineassistant.Medicine_Assistant_backend.WebPushService;
import com.medicineassistant.Medicine_Assistant_backend.model.PushSubscriptionEntity;
import com.medicineassistant.Medicine_Assistant_backend.model.ReminderScheduleEntity;
import com.medicineassistant.Medicine_Assistant_backend.repository.UserRepository;
import com.medicineassistant.Medicine_Assistant_backend.repository.PushSubscriptionRepository;
import com.medicineassistant.Medicine_Assistant_backend.repository.ReminderScheduleRepository;

@Component
public class ReminderScheduler {

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

        LocalDateTime now = LocalDateTime.now();

        List<ReminderScheduleEntity> schedules =
                reminderRepository.findByEnabledTrue();

        for (ReminderScheduleEntity schedule : schedules) {

            if (schedule.getScheduledAt().isAfter(now)) {
                continue;
            }

            Long userId = schedule.getUserId();
            String userEmail = userRepository.findById(userId)
                    .map(user -> user.getEmail())
                    .orElse(null);

            List<PushSubscriptionEntity> subscriptions =
                    subscriptionRepository.findByUserId(userId);

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
                } catch (Exception e) {
                    System.err.println(
                            "Failed to send reminder: " + e.getMessage()
                    );
                }
            }

            // Schedule the next reminder for tomorrow
            schedule.setScheduledAt(
                    schedule.getScheduledAt().plusDays(1)
            );

            reminderRepository.save(schedule);
        }
    }
}