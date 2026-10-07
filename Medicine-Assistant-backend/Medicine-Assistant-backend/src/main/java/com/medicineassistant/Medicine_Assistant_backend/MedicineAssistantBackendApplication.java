package com.medicineassistant.Medicine_Assistant_backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

import com.medicineassistant.Medicine_Assistant_backend.bl.AuthBL;

@SpringBootApplication
public class MedicineAssistantBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(MedicineAssistantBackendApplication.class, args);
	}

	@Bean
	AuthBL authBl() {
		return new AuthBL();
	}
}
