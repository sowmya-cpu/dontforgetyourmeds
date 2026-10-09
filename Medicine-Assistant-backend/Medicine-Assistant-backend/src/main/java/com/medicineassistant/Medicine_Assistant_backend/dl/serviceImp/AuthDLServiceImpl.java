package com.medicineassistant.Medicine_Assistant_backend.dl.serviceImp;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.medicineassistant.Medicine_Assistant_backend.dl.service.AuthDLService;
import com.medicineassistant.Medicine_Assistant_backend.model.User;
import com.medicineassistant.Medicine_Assistant_backend.repository.UserRepository;
@Service
public class AuthDLServiceImpl implements AuthDLService {
	
	@Autowired
	UserRepository userRepository;
	@Autowired
	PasswordEncoder passwordEncoder;

	@Override
	public boolean existsByEmail(String email) {
		return userRepository.existsByEmail(email);
	}

	@Override
	public String signup(User user) {

        if (userRepository.existsByEmail(user.getEmail())) {
            return "Email already exists";
        }
        String hashedPassword = passwordEncoder.encode(user.getPassword());

        user.setPassword(hashedPassword);
        userRepository.save(user);

        return "Signup successful";
    }

	@Override
	public User findByEmail(String email) {
		return userRepository.findByEmail(email).orElse(null);
	}
	
	

}
