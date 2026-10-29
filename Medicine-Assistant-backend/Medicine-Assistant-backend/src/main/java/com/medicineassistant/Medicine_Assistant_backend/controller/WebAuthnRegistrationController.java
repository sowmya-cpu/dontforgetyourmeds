package com.medicineassistant.Medicine_Assistant_backend.controller;

import java.security.SecureRandom;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.yubico.webauthn.AssertionRequest;
import com.yubico.webauthn.AssertionResult;
import com.yubico.webauthn.FinishAssertionOptions;
import com.yubico.webauthn.StartAssertionOptions;
import com.yubico.webauthn.data.AuthenticatorAssertionResponse;
import com.yubico.webauthn.data.ClientAssertionExtensionOutputs;
import com.yubico.webauthn.data.PublicKeyCredential;
import com.yubico.webauthn.RelyingParty;
import com.yubico.webauthn.StartRegistrationOptions;
import com.yubico.webauthn.data.ByteArray;
import com.yubico.webauthn.data.PublicKeyCredentialCreationOptions;
import com.yubico.webauthn.data.UserIdentity;
import org.springframework.web.bind.annotation.RequestBody;
import com.yubico.webauthn.FinishRegistrationOptions;
import com.yubico.webauthn.RegistrationResult;
import org.springframework.web.bind.annotation.GetMapping;
import com.yubico.webauthn.data.PublicKeyCredential;

import com.yubico.webauthn.data.AuthenticatorAttestationResponse;
import com.yubico.webauthn.data.ClientRegistrationExtensionOutputs;
import com.medicineassistant.Medicine_Assistant_backend.model.User;
import com.medicineassistant.Medicine_Assistant_backend.model.WebAuthnCredential;
import com.medicineassistant.Medicine_Assistant_backend.repository.UserRepository;
import com.medicineassistant.Medicine_Assistant_backend.repository.WebAuthnCredentialRepository;
@RestController
@RequestMapping("/api/webauthn")
public class WebAuthnRegistrationController {
	private final RelyingParty relyingParty;
	private final UserRepository userRepository;
	private final WebAuthnCredentialRepository credentialRepository;
	private final Map<String, PublicKeyCredentialCreationOptions> registrationRequests =
	        new ConcurrentHashMap<>();
	private final Map<String, AssertionRequest> authenticationRequests =
	        new ConcurrentHashMap<>();
	private final SecureRandom secureRandom = new SecureRandom();
    public WebAuthnRegistrationController(
            RelyingParty relyingParty,
            UserRepository userRepository,
            WebAuthnCredentialRepository credentialRepository) {

        this.relyingParty = relyingParty;
        this.userRepository = userRepository;
        this.credentialRepository = credentialRepository;
    }
    @PostMapping("/register/start")
    public PublicKeyCredentialCreationOptions startRegistration(
            Authentication authentication) {

        String email = authentication.getName();

        UserIdentity user = UserIdentity.builder()
                .name(email)
                .displayName(email)
                .id(new ByteArray(email.getBytes()))
                .build();

        PublicKeyCredentialCreationOptions options =
                relyingParty.startRegistration(
                        StartRegistrationOptions.builder()
                                .user(user)
                                .authenticatorSelection(
                                        com.yubico.webauthn.data.AuthenticatorSelectionCriteria
                                                .builder()
                                                .authenticatorAttachment(
                                                        com.yubico.webauthn.data.AuthenticatorAttachment.PLATFORM)
                                                .userVerification(
                                                        com.yubico.webauthn.data.UserVerificationRequirement.REQUIRED)
                                                .build()
                                )
                                .build()
                );

        registrationRequests.put(email, options);

        return options;
    }
    @PostMapping("/authenticate/start")
    public AssertionRequest startAuthentication(Authentication authentication) {

        String email = authentication.getName();

        AssertionRequest request = relyingParty.startAssertion(
                StartAssertionOptions.builder()
                        .username(email)
                        .userVerification(
                                com.yubico.webauthn.data.UserVerificationRequirement.REQUIRED
                        )
                        .build()
        );

        authenticationRequests.put(email, request);

        return request;
    }
    @PostMapping("/authenticate/finish")
    public String finishAuthentication(
            Authentication authentication,
            @RequestBody String responseJson) {

        String email = authentication.getName();

        AssertionRequest request = authenticationRequests.get(email);

        if (request == null) {
            throw new IllegalStateException(
                    "Authentication request not found. Start authentication again.");
        }

        try {
            PublicKeyCredential<AuthenticatorAssertionResponse,
                    ClientAssertionExtensionOutputs> response =
                    PublicKeyCredential.parseAssertionResponseJson(responseJson);

            AssertionResult result = relyingParty.finishAssertion(
                    FinishAssertionOptions.builder()
                            .request(request)
                            .response(response)
                            .build());

            if (!result.isSuccess()) {
                throw new IllegalArgumentException("Device authentication failed.");
            }

            authenticationRequests.remove(email);

            return "Device authentication successful";
        } catch (Exception e) {
            throw new IllegalStateException(
                    "Device authentication verification failed.", e);
        }
    }
    @PostMapping("/register/finish")
    public String finishRegistration(
            Authentication authentication,
            @RequestBody String responseJson) {

        String email = authentication.getName();

        PublicKeyCredential<AuthenticatorAttestationResponse,
        ClientRegistrationExtensionOutputs> response;

try {
    response = PublicKeyCredential.parseRegistrationResponseJson(responseJson);
} catch (Exception e) {
    throw new IllegalArgumentException("Invalid registration response", e);
}

        PublicKeyCredentialCreationOptions request =
                registrationRequests.get(email);

        if (request == null) {
            throw new IllegalStateException(
                    "Registration request not found. Start registration again.");
        }

        try {
            RegistrationResult result = relyingParty.finishRegistration(
                    FinishRegistrationOptions.builder()
                            .request(request)
                            .response(response)
                            .build()
            );
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new IllegalStateException("User not found"));

            WebAuthnCredential credential = new WebAuthnCredential();

            credential.setUser(user);
            credential.setCredentialId(result.getKeyId().getId().getBase64Url());
            credential.setUserHandle(request.getUser().getId().getBase64Url());
            credential.setPublicKey(result.getPublicKeyCose().getBase64Url());
            credential.setSignatureCount(result.getSignatureCount());

            credentialRepository.save(credential);
            registrationRequests.remove(email);
            return "Registration verified for: " + email;

        } catch (Exception e) {
            throw new IllegalStateException(
                    "Registration verification failed.", e);
        }
    }
    @GetMapping("/status")
    public Map<String, Boolean> checkPasskeyStatus(Authentication authentication) {

        String email = authentication.getName();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalStateException("User not found"));

        boolean registered = credentialRepository.existsByUser(user);

        return Map.of("registered", registered);
    }
    
}
