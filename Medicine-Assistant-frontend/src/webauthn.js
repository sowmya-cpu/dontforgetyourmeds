import {
    startRegistration,
    startAuthentication
} from "@simplewebauthn/browser";
export async function registerDevice(token) {
    const response = await fetch(
        "http://localhost:8080/api/webauthn/register/start",
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );

    if (!response.ok) {
        throw new Error(await response.text());
    }

    const options = await response.json();

    // Remove null transports from excluded credentials.
    options.excludeCredentials = (options.excludeCredentials || []).map(
        (credential) => {
            if (credential.transports == null) {
                delete credential.transports;
            }

            return credential;
        }
    );

    // Remove null extension values.
    if (options.extensions) {
        Object.keys(options.extensions).forEach((key) => {
            if (options.extensions[key] == null) {
                delete options.extensions[key];
            }
        });
    }

    // Register using the options provided by the backend.
    const registrationResponse = await startRegistration({
        optionsJSON: options,
    });

    const result = await fetch(
        "http://localhost:8080/api/webauthn/register/finish",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(registrationResponse),
        }
    );

    if (!result.ok) {
        throw new Error(await result.text());
    }

    return await result.text();
}
export async function authenticateDevice(token) {
    // Step 1: Request authentication options from the backend
    const response = await fetch(
        "http://localhost:8080/api/webauthn/authenticate/start",
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );

    if (!response.ok) {
        throw new Error(await response.text());
    }

    const data = await response.json();

    // Step 2: Validate and extract the authentication options
    const options = data.publicKeyCredentialRequestOptions;

    if (!options) {
        throw new Error(
            "Authentication options are missing from the backend response."
        );
    }

    // Remove null extension values
    if (options.extensions) {
        Object.keys(options.extensions).forEach((key) => {
            if (options.extensions[key] == null) {
                delete options.extensions[key];
            }
        });
    }

    // Remove null transports from allowed credentials
    options.allowCredentials = (options.allowCredentials || []).map(
        (credential) => {
            if (credential.transports == null) {
                delete credential.transports;
            }

            return credential;
        }
    );

    // Step 3: Ask the browser to authenticate using the registered passkey
    const authenticationResponse = await startAuthentication({
        optionsJSON: options,
    });

    // Step 4: Send the authentication response to the backend
    const result = await fetch(
        "http://localhost:8080/api/webauthn/authenticate/finish",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(authenticationResponse),
        }
    );

    if (!result.ok) {
        throw new Error(await result.text());
    }

    return await result.text();
}