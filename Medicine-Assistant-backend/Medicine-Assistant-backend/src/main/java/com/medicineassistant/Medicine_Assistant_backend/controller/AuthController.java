package com.medicineassistant.Medicine_Assistant_backend.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.medicineassistant.Medicine_Assistant_backend.bl.AuthBL;
import com.medicineassistant.Medicine_Assistant_backend.dto.Logindto;
import com.medicineassistant.Medicine_Assistant_backend.model.User;
import com.medicineassistant.Medicine_Assistant_backend.repository.UserRepository;
import com.medicineassistant.Medicine_Assistant_backend.service.JwtService;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
	
	@Autowired
	AuthBL authBl;
	@Autowired
	JwtService jwtService;
	@Autowired
	UserRepository userRepository;
	@Autowired
	PasswordEncoder passwordEncoder;
	
	@PostMapping("/signup")
    public String signup(@RequestBody User user) {

        return authBl.signup(user);
    }
	
	@PostMapping("/login")
	public String login(@RequestBody Logindto user) {
		System.out.println("Email received: [" + user.getEmail() + "]");
	    User existingUser = userRepository.findByEmail(user.getEmail())
	            .orElse(null);

	    if (existingUser == null) {
	        return "User not found";
	    }

	    if (!passwordEncoder.matches(
	            user.getPassword(),
	            existingUser.getPassword())) {

	        return "Invalid password";
	    }

	    return jwtService.generateToken(existingUser.getEmail());
	}
	
	@GetMapping("/test")
	public String test() {
	    return "Authenticated successfully";
	}
}
