package com.medicineassistant.Medicine_Assistant_backend.service;

import java.util.Date;

import javax.crypto.SecretKey;

import org.springframework.stereotype.Service;

import io.jsonwebtoken.Jwts;

@Service
public class JwtService {
	
	 private final SecretKey key = Jwts.SIG.HS256.key().build();

	    public String generateToken(String email) {

	        return Jwts.builder()
	                .subject(email)
	                .issuedAt(new Date())
	                .expiration(new Date(System.currentTimeMillis() + 1000 * 60 * 60))
	                .signWith(key)
	                .compact();
	    }
	    
	    public String extractEmail(String token) {

	        return Jwts.parser()
	                .verifyWith(key)
	                .build()
	                .parseSignedClaims(token)
	                .getPayload()
	                .getSubject();
	    }
}
