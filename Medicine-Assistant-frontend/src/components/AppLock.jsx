import { useEffect, useRef, useState } from "react";
import { authenticateDevice } from "../webauthn";
import { toast } from "react-toastify";

const INACTIVITY_TIMEOUT = 5 * 60 * 1000;

function AppLock({ children }) {
    const [isLocked, setIsLocked] = useState(true);
    const [isAuthenticating, setIsAuthenticating] = useState(false);

    const inactivityTimer = useRef(null);
    const lockedRef = useRef(true);
    const authenticatingRef = useRef(false);
    const lastActivityRef = useRef(Date.now());
    const resetTimerRef = useRef(null);

    useEffect(() => {
        const token = localStorage.getItem("token");

        if (!token) {
            return;
        }

        let isMounted = true;

        const lockApp = () => {
            clearTimeout(inactivityTimer.current);
            lockedRef.current = true;

            if (isMounted) {
                setIsLocked(true);
            }
        };

        const resetInactivityTimer = () => {
            clearTimeout(inactivityTimer.current);

            if (lockedRef.current || authenticatingRef.current) {
                return;
            }

            lastActivityRef.current = Date.now();

            inactivityTimer.current = setTimeout(
                lockApp,
                INACTIVITY_TIMEOUT
            );
        };

        resetTimerRef.current = resetInactivityTimer;

        const handleVisibilityChange = () => {
            if (document.hidden) {
                return;
            }

            const inactiveDuration = Date.now() - lastActivityRef.current;

            if (
                !lockedRef.current &&
                inactiveDuration >= INACTIVITY_TIMEOUT
            ) {
                lockApp();
            } else {
                resetInactivityTimer();
            }
        };

        const events = [
            "mousemove",
            "mousedown",
            "keydown",
            "touchstart",
            "scroll",
            "click"
        ];

        events.forEach((event) => {
            window.addEventListener(event, resetInactivityTimer);
        });

        document.addEventListener(
            "visibilitychange",
            handleVisibilityChange
        );

        // Lock immediately when the protected application opens.
        lockApp();

        return () => {
            isMounted = false;
            clearTimeout(inactivityTimer.current);

            events.forEach((event) => {
                window.removeEventListener(event, resetInactivityTimer);
            });

            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange
            );
        };
    }, []);

    const handleUnlock = async () => {
        if (authenticatingRef.current) {
            return;
        }

        authenticatingRef.current = true;
        setIsAuthenticating(true);

        try {
            const token = localStorage.getItem("token");

            if (!token) {
                toast.error("Please sign in again.");
                return;
            }

            const message = await authenticateDevice(token);

            lockedRef.current = false;
            lastActivityRef.current = Date.now();
            setIsLocked(false);

            toast.success(message);

            // Start the next five-minute inactivity period.
            resetTimerRef.current?.();
        } catch (error) {
            console.error("Unlock error:", error);
            toast.error("Device authentication failed. Please try again.");
        } finally {
            authenticatingRef.current = false;
            setIsAuthenticating(false);
        }
    };

    if (isLocked) {
        return (
            <div className="d-flex justify-content-center align-items-center min-vh-100 bg-light p-3">
                <div
                    className="card border-0 shadow-sm text-center p-4"
                    style={{ maxWidth: "400px", width: "100%" }}
                >
                    <div className="fs-1 mb-3">🔒</div>

                    <h3 className="fw-bold">App Locked</h3>

                    <p className="text-muted">
                        Authenticate with your device to access your
                        Medication Assistant.
                    </p>

                    <button
                        type="button"
                        className="btn btn-primary w-100"
                        onClick={handleUnlock}
                        disabled={isAuthenticating}
                    >
                        {isAuthenticating
                            ? "Authenticating..."
                            : "Unlock with device"}
                    </button>
                </div>
            </div>
        );
    }

    return children;
}

export default AppLock;