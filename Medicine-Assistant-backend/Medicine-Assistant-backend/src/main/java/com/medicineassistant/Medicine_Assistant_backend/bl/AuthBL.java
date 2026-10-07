package com.medicineassistant.Medicine_Assistant_backend.bl;

import org.springframework.beans.factory.annotation.Autowired;

import com.medicineassistant.Medicine_Assistant_backend.dl.serviceImp.AuthDLServiceImpl;

import com.medicineassistant.Medicine_Assistant_backend.model.User;

public class AuthBL {

	@Autowired
	AuthDLServiceImpl authDLServiceImpl;
	
	public String signup(User user) {
        return authDLServiceImpl.signup(user);
    }
	
}
