package com.medicineassistant.Medicine_Assistant_backend.dl.service;

import com.medicineassistant.Medicine_Assistant_backend.model.User;

public interface AuthDLService {
	 boolean existsByEmail(String email);

	 String signup(User user);

}
