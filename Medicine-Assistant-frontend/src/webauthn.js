import { startRegistration } from "@simplewebauthn/browser";

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
        throw new Error("Failed to start registration");
    }

    const options = await response.json();
    options.excludeCredentials = (options.excludeCredentials || []).map(
    credential => {
        if (credential.transports == null) {
            delete credential.transports;
        }
        return credential;
    }
);
    console.log("Exclude credentials:", options.excludeCredentials);
    // Remove null extension values

    if (options.extensions) {
        Object.keys(options.extensions).forEach((key) => {
            if (options.extensions[key] == null) {
                delete options.extensions[key];
            }
        });
    }

    // Start browser registration using the options directly
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