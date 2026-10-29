package com.medicineassistant.Medicine_Assistant_backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.medicineassistant.Medicine_Assistant_backend.model.ReminderScheduleEntity;

@Repository
public interface ReminderScheduleRepository extends JpaRepository<ReminderScheduleEntity, Long> {

    List<ReminderScheduleEntity> findByUserId(Long userId);

    Optional<ReminderScheduleEntity> findByUserIdAndTimeOfDay(Long userId, String timeOfDay);

    List<ReminderScheduleEntity> findByEnabledTrue();
}