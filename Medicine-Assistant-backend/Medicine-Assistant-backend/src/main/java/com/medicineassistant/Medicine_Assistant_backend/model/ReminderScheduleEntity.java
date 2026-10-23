package com.medicineassistant.Medicine_Assistant_backend.model;

import java.time.LocalDateTime;

import jakarta.persistence.*;

@Entity
@Table(
    name = "reminder_schedules",
    uniqueConstraints = {
        @UniqueConstraint(
            columnNames = {"userId", "timeOfDay"}
        )
    }
)
public class ReminderScheduleEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false, length = 20)
    private String timeOfDay;

    @Column(nullable = false)
    private LocalDateTime scheduledAt;

    @Column(nullable = false)
    private boolean enabled = true;

    public ReminderScheduleEntity() {
    }

    public ReminderScheduleEntity(
            Long userId,
            String timeOfDay,
            LocalDateTime scheduledAt) {

        this.userId = userId;
        this.timeOfDay = timeOfDay;
        this.scheduledAt = scheduledAt;
        this.enabled = true;
    }

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getTimeOfDay() {
        return timeOfDay;
    }

    public void setTimeOfDay(String timeOfDay) {
        this.timeOfDay = timeOfDay;
    }

    public LocalDateTime getScheduledAt() {
        return scheduledAt;
    }

    public void setScheduledAt(LocalDateTime scheduledAt) {
        this.scheduledAt = scheduledAt;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }
}
