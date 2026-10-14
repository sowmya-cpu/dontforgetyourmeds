package com.medicineassistant.Medicine_Assistant_backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.medicineassistant.Medicine_Assistant_backend.model.WebAuthnCredential;

import java.util.Optional;

@Repository
public interface WebAuthnCredentialRepository
        extends JpaRepository<WebAuthnCredential, Long> {

    Optional<WebAuthnCredential> findByCredentialId(String credentialId);
}