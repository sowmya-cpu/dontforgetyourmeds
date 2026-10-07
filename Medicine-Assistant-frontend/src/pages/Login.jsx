import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
//   const navigate = useNavigate();

  const handleLogin = async (e) => {
  e.preventDefault();

  try {
    const response = await fetch("http://localhost:8080/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        password
      })
    });

    const result = await response.text();

    if (response.ok) {
      localStorage.setItem("token", result);

      toast.success("Login successful");

    //   console.log("JWT:", result);
    } else {
      toast.error(result);
    }

  } catch (error) {
    console.error("Login error:", error);
    toast.error("Unable to connect to server");
  }
};

  return (
    <div className="container-fluid min-vh-100 d-flex justify-content-center align-items-center bg-white">
      <div className="w-100" style={{ maxWidth: "420px" }}>

        {/* Heading */}
        <div className="text-center mb-4">
          <h1 className="fw-bold" style={{ color: "#142b5f" }}>
            Welcome Back
          </h1>

          <p className="text-secondary">
            Sign in to continue to Medicine Assistant
          </p>
        </div>

        <form onSubmit={handleLogin}>

          {/* Email */}
          <div className="mb-3">
            <label className="form-label fw-semibold">
              Email
            </label>

            <input
              type="email"
              className="form-control form-control-lg"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* Password */}
          <div className="mb-2">
            <label className="form-label fw-semibold">
              Password
            </label>

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

          {/* Forgot Password */}
          <div className="text-end mb-4">
            <Link
              to="/forgot-password"
              className="text-primary text-decoration-none"
            >
              Forgot Password?
            </Link>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            className="btn btn-primary btn-lg w-100"
          >
            Sign In
          </button>

        </form>

        {/* Signup */}
        <div className="text-center mt-4">
          <span className="text-secondary">
            Don't have an account?{" "}
          </span>

          <Link
            to="/signup"
            className="text-primary fw-semibold text-decoration-none"
          >
            Sign Up
          </Link>
        </div>

      </div>
    </div>
  );
}

export default Login;