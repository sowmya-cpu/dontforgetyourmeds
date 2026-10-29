package com.medicineassistant.Medicine_Assistant_backend.controller;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.medicineassistant.Medicine_Assistant_backend.dl.serviceImp.ReminderScheduleService;
import com.medicineassistant.Medicine_Assistant_backend.repository.UserRepository;

@RestController
@RequestMapping("/api/reminders")
public class ReminderScheduleController {

    private final ReminderScheduleService reminderScheduleService;
    private final UserRepository userRepository;

    public ReminderScheduleController(
            ReminderScheduleService reminderScheduleService,
            UserRepository userRepository) {
        this.reminderScheduleService = reminderScheduleService;
        this.userRepository = userRepository;
    }

    @PostMapping("/register")
    public ResponseEntity<?> registerReminder(
            @RequestBody Map<String, String> request,
            Authentication authentication) {

        if (authentication == null
                || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401)
                    .body(Map.of("error", "Authentication required"));
        }

        String timeOfDay = request.get("timeOfDay");

        if (timeOfDay == null
                || !timeOfDay.matches("Morning|Afternoon|Night")) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Invalid reminder time"));
        }

        try {
            var user = userRepository
                    .findByEmail(authentication.getName())
                    .orElse(null);

            if (user == null) {
                return ResponseEntity.status(401)
                        .body(Map.of("error", "User not found"));
            }

            LocalDateTime scheduledAt =
                    reminderScheduleService.getNextReminderTime(timeOfDay);

            reminderScheduleService.saveReminderSchedule(
                    user.getId(),
                    timeOfDay,
                    scheduledAt
            );

            return ResponseEntity.ok(
                    Map.of(
                        "message", "Reminder schedule registered",
                        "timeOfDay", timeOfDay,
                        "scheduledAt", scheduledAt.toString()
                    )
            );

        } catch (Exception e) {
            e.printStackTrace();

            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Could not register reminder"));
        }
    }
    
	
	@PostMapping("/sync")
	public ResponseEntity<?> syncReminderSchedules(
	        @RequestBody Map<String, List<String>> request,
	        Authentication authentication) {
	
	    if (authentication == null || !authentication.isAuthenticated()) {
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
	
	        List<String> activeSlots = request.get("activeSlots");
	
	        if (activeSlots == null) {
	            return ResponseEntity.badRequest()
	                    .body(Map.of("error", "activeSlots is required"));
	        }
	
	        reminderScheduleService.syncReminderSchedules(
	                user.getId(),
	                new java.util.HashSet<>(activeSlots)
	        );
	
	        return ResponseEntity.ok(
	                Map.of("message", "Reminder schedules synchronized")
	        );
	
	    } catch (IllegalArgumentException e) {
	        return ResponseEntity.badRequest()
	                .body(Map.of("error", e.getMessage()));
	    } catch (Exception e) {
	        e.printStackTrace();
	
	        return ResponseEntity.internalServerError()
	                .body(Map.of("error", "Could not sync reminders"));
	    }
	}

}
