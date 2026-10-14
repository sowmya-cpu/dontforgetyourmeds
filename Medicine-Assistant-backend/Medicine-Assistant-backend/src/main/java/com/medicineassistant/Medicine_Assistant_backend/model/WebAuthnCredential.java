package com.medicineassistant.Medicine_Assistant_backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

@Entity
@Table(
    name = "webauthn_credentials",
    uniqueConstraints = {
        @UniqueConstraint(columnNames = "credentialId")
    }
)
@Getter
@Setter
@NoArgsConstructor
public class WebAuthnCredential {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, unique = true, length = 1024)
    private String credentialId;

    @Column(nullable = false, unique = true, length = 128)
    private String userHandle;
    
    @Column(nullable = false, length = 4096)
    private String publicKey;

    @Column(nullable = false)
    private Long signatureCount;
}