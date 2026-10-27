import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { registerDevice } from "../webauthn";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [needsRegistration, setNeedsRegistration] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  const checkPasskeyStatus = async (authToken) => {
  console.log("Checking passkey status...");
  console.log("Sending request to:", "http://localhost:8080/api/webauthn/status");
    const response = await fetch(
      "http://localhost:8080/api/webauthn/status",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Unable to check device registration status.");
    }

    return await response.json();
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("http://localhost:8080/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.text();

      if (!response.ok) {
        toast.error(result);
        return;
      }

      localStorage.setItem("token", result);
      localStorage.setItem("email", email.trim().toLowerCase());
      setToken(result);

      const status = await checkPasskeyStatus(result);

      if (status.registered) {
        // AppLock will handle locking and device authentication.
        navigate("/dashboard", { replace: true });
      } else {
        setNeedsRegistration(true);
        toast.info("Please register device authentication to continue.");
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error(error.message || "Unable to connect to server.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeviceRegistration = async () => {
    try {
      const message = await registerDevice(token);

      toast.success(message);

      // Registration is complete. Continue to the dashboard.
      navigate("/dashboard", { replace: true });
    } catch (error) {
      console.error("Device registration error:", error);
      toast.error(error.message || "Device registration failed.");
    }
  };

  return (
    <div className="container-fluid min-vh-100 d-flex justify-content-center align-items-center bg-white">
      <div className="w-100" style={{ maxWidth: "420px" }}>
        <div className="text-center mb-4">
          <h1 className="fw-bold" style={{ color: "#142b5f" }}>
            Welcome Back
          </h1>

          <p className="text-secondary">
            Sign in to continue to Medicine Assistant
          </p>
        </div>

        {!needsRegistration ? (
          <form onSubmit={handleLogin}>
            <div className="mb-3">
              <label className="form-label fw-semibold">Email</label>

              <input
                type="email"
                className="form-control form-control-lg"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="mb-2">
              <label className="form-label fw-semibold">Password</label>

              <div className="input-group">
                <input
                  type={showPassword ? "text" : "password"}
                  className="form-control form-control-lg"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />

                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="text-end mb-4">
              <Link
                to="/forgot-password"
                className="text-primary text-decoration-none"
              >
                Forgot Password?
              </Link>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg w-100"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        ) : (
          <div className="text-center">
            <div className="fs-1 mb-3">🔐</div>

            <h4 className="fw-bold">Register Device Authentication</h4>

            <p className="text-secondary">
              Register a passkey on your device to securely unlock your
              Medication Assistant.
            </p>

            <button
              type="button"
              className="btn btn-primary btn-lg w-100"
              onClick={handleDeviceRegistration}
            >
              Register Device
            </button>
          </div>
        )}

        {!needsRegistration && (
          <div className="text-center mt-4">
            <span className="text-secondary">Don't have an account? </span>

            <Link
              to="/signup"
              className="text-primary fw-semibold text-decoration-none"
            >
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default Login;