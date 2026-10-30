package com.medicineassistant.Medicine_Assistant_backend.dl.serviceImp;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.medicineassistant.Medicine_Assistant_backend.model.ReminderScheduleEntity;
import com.medicineassistant.Medicine_Assistant_backend.repository.ReminderScheduleRepository;

@Service
public class ReminderScheduleService {

    private static final Logger logger =
            LoggerFactory.getLogger(ReminderScheduleService.class);
    private static final ZoneId REMINDER_ZONE =
            ZoneId.of("Asia/Kolkata");

    private final ReminderScheduleRepository repository;

    public ReminderScheduleService(
            ReminderScheduleRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public void saveReminderSchedule(
            Long userId,
            String timeOfDay,
            LocalDateTime scheduledAt) {

        var existing = repository.findByUserIdAndTimeOfDay(
                userId, timeOfDay);

        ReminderScheduleEntity schedule;

        if (existing.isPresent()) {
            schedule = existing.get();
            schedule.setScheduledAt(scheduledAt);
            schedule.setEnabled(true);
        } else {
            schedule = new ReminderScheduleEntity(
                userId, timeOfDay, scheduledAt);
        }

        repository.save(schedule);
        logger.info(
                "Saved reminder schedule {} for {} at {}",
                schedule.getId(),
                timeOfDay,
                scheduledAt
        );
    }

    @Transactional
    public void syncReminderSchedules(
            Long userId,
            Set<String> activeSlots) {

        List<ReminderScheduleEntity> schedules =
                repository.findByUserId(userId);

        // Disable slots no longer used by this user
        for (ReminderScheduleEntity schedule : schedules) {
            if (!activeSlots.contains(schedule.getTimeOfDay())) {
                schedule.setEnabled(false);
            }
        }

        // Register newly active slots
        for (String slot : activeSlots) {
            if (!slot.matches("Morning|Afternoon|Night")) {
                throw new IllegalArgumentException(
                    "Invalid reminder slot: " + slot);
            }

            var existing = repository.findByUserIdAndTimeOfDay(
                    userId, slot);

            if (existing.isPresent()) {
                ReminderScheduleEntity schedule = existing.get();
                schedule.setEnabled(true);
                LocalDateTime scheduledAt = getNextReminderTime(slot);
                schedule.setScheduledAt(scheduledAt);
                logger.info(
                        "Updated reminder schedule {} for {} to {}",
                        schedule.getId(),
                        slot,
                        scheduledAt
                );
            } else {
                LocalDateTime scheduledAt =
                        getNextReminderTime(slot);

                ReminderScheduleEntity schedule = repository.save(
                        new ReminderScheduleEntity(
                                userId, slot, scheduledAt));
                logger.info(
                        "Created reminder schedule {} for {} at {}",
                        schedule.getId(),
                        slot,
                        scheduledAt
                );
            }
        }

        repository.saveAll(schedules);
    }

    public LocalDateTime getNextReminderTime(String slot) {
        LocalDateTime now = LocalDateTime.now(REMINDER_ZONE);

        int hour = switch (slot) {
            case "Morning" -> 8;
            case "Afternoon" -> 13;
            case "Night" -> 20;
            default -> throw new IllegalArgumentException(
                "Invalid reminder slot");
        };
        int minute = 0;
        LocalDateTime next = now.toLocalDate()
                .atTime(hour, minute);

        if (!next.isAfter(now)) {
            next = next.plusDays(1);
        }

        return next;
    }

    public List<ReminderScheduleEntity> getSchedulesForUser(
            Long userId) {
        return repository.findByUserId(userId);
    }

    public List<ReminderScheduleEntity> getEnabledSchedules() {
        return repository.findByEnabledTrue();
    }
}
