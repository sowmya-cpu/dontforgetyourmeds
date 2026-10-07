package com.medicineassistant.Medicine_Assistant_backend.config;

import java.io.IOException;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.medicineassistant.Medicine_Assistant_backend.service.JwtService;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
	
	@Autowired
	JwtService jwtService;

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
			throws ServletException, IOException {
		
		String authHeader = request.getHeader("Authorization");

	    if (authHeader == null || !authHeader.startsWith("Bearer ")) {
	        filterChain.doFilter(request, response);
	        return;
	    }

	    String token = authHeader.substring(7);
	    
	    try {

	        String email = jwtService.extractEmail(token);

//	        System.out.println("JWT user: " + email);
	        
	        UsernamePasswordAuthenticationToken authentication =
	                new UsernamePasswordAuthenticationToken(
	                        email,
	                        null,
	                        null
	                );

	        SecurityContextHolder.getContext().setAuthentication(authentication);

	    } catch (Exception e) {

	        System.out.println("Invalid JWT: " + e.getMessage());
	    }

//	    System.out.println("JWT received: " + token);
	    
	    filterChain.doFilter(request, response);
		
	}
}
