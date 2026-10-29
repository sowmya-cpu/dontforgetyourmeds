package com.medicineassistant.Medicine_Assistant_backend;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {
		"spring.datasource.url=jdbc:h2:mem:medicineassistant-test;DB_CLOSE_DELAY=-1"
})
class MedicineAssistantBackendApplicationTests {

	@Test
	void contextLoads() {
	}

}
