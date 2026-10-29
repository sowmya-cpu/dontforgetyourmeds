package com.medicineassistant.Medicine_Assistant_backend.config.webauthn;

import java.util.Set;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.medicineassistant.Medicine_Assistant_backend.dl.service.webauthn.WebAuthnCredentialStore;
import com.yubico.webauthn.RelyingParty;
import com.yubico.webauthn.data.RelyingPartyIdentity;

@Configuration
public class WebAuthnConfig {

    @Bean
    public RelyingParty relyingParty(WebAuthnCredentialStore credentialStore) {

        RelyingPartyIdentity identity = RelyingPartyIdentity.builder()
                .id("localhost")
                .name("Medication Assistant")
                .build();

        return RelyingParty.builder()
                .identity(identity)
                .credentialRepository(credentialStore)
                .origins(Set.of(
                    "http://localhost:5173",
                    "http://localhost:4173",
                    "https://dontforgetyourmeds-4rkf.vercel.app"
                ))
                .build();
    }
}