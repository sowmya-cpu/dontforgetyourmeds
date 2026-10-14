package com.medicineassistant.Medicine_Assistant_backend.dl.service.webauthn;

import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.Base64;
import org.springframework.stereotype.Service;
import com.yubico.webauthn.CredentialRepository;
import com.yubico.webauthn.RegisteredCredential;
import com.yubico.webauthn.data.ByteArray;
import com.yubico.webauthn.data.PublicKeyCredentialDescriptor;
import com.medicineassistant.Medicine_Assistant_backend.repository.WebAuthnCredentialRepository;
@Service
public class WebAuthnCredentialStore implements CredentialRepository {
	private final WebAuthnCredentialRepository credentialRepository;

public WebAuthnCredentialStore(
        WebAuthnCredentialRepository credentialRepository) {
    this.credentialRepository = credentialRepository;
}
	@Override
	public Set<PublicKeyCredentialDescriptor> getCredentialIdsForUsername(String username) {
		// TODO Auto-generated method stub

	    return credentialRepository.findAll()
	            .stream()
	            .filter(credential ->
	                    credential.getUser().getEmail().equals(username))
	            .map(credential ->
	                    PublicKeyCredentialDescriptor.builder()
	                            .id(new ByteArray(
	                                    java.util.Base64.getUrlDecoder()
	                                            .decode(credential.getCredentialId())))
	                            .build())
	            .collect(java.util.stream.Collectors.toSet());
	}

	@Override
	public Optional<ByteArray> getUserHandleForUsername(String username) {
		 return credentialRepository.findAll()
		            .stream()
		            .filter(credential ->
		                    credential.getUser().getEmail().equals(username))
		            .map(credential ->
		                    new ByteArray(
		                            java.util.Base64.getUrlDecoder()
		                                    .decode(credential.getUserHandle())))
		            .findFirst();
	}

	@Override
	public Optional<String> getUsernameForUserHandle(ByteArray userHandle) {
		 String handle = userHandle.getBase64Url();

		    return credentialRepository.findAll()
		            .stream()
		            .filter(credential ->
		                    credential.getUserHandle().equals(handle))
		            .map(credential ->
		                    credential.getUser().getEmail())
		            .findFirst();
	}

	@Override
	public Optional<RegisteredCredential> lookup(ByteArray credentialId, ByteArray userHandle) {

	    return credentialRepository.findAll()
	            .stream()
	            .filter(credential ->
	                    credential.getCredentialId()
	                            .equals(credentialId.getBase64Url())
	                    && credential.getUserHandle()
	                            .equals(userHandle.getBase64Url()))
	            .findFirst()
	            .map(credential ->
	                    RegisteredCredential.builder()
	                            .credentialId(credentialId)
	                            .userHandle(userHandle)
	                            .publicKeyCose(
	                                    new ByteArray(
	                                            java.util.Base64.getUrlDecoder()
	                                                    .decode(credential.getPublicKey())))
	                            .signatureCount(credential.getSignatureCount())
	                            .build());
	}

	@Override
	public Set<RegisteredCredential> lookupAll(ByteArray credentialId) {
		 return credentialRepository.findAll()
		            .stream()
		            .filter(credential ->
		                    credential.getCredentialId()
		                            .equals(credentialId.getBase64Url()))
		            .map(credential ->
		                    RegisteredCredential.builder()
		                            .credentialId(credentialId)
		                            .userHandle(new ByteArray(
		                                    java.util.Base64.getUrlDecoder()
		                                            .decode(credential.getUserHandle())))
		                            .publicKeyCose(new ByteArray(
		                                    java.util.Base64.getUrlDecoder()
		                                            .decode(credential.getPublicKey())))
		                            .signatureCount(credential.getSignatureCount())
		                            .build())
		            .collect(java.util.stream.Collectors.toSet());
	}

}