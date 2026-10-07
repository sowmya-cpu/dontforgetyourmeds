import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function Signup() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();
  const handleSignup = async (e) => {
  e.preventDefault();

  try {
    const response = await fetch("http://localhost:8080/api/auth/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        username,
        email,
        password
      })
    });

    const result = await response.text();

    if (response.ok) {
      toast.success(result);
      setUsername("");
      setEmail("");
      setPassword("");
      navigate("/login");
    } else {
      toast.error(result);
    }

  } catch (error) {
    toast.error("Unable to connect to server");
    console.error("Signup error:", error);
  }
};

  return (
    <div className="container-fluid min-vh-100 d-flex justify-content-center align-items-center bg-white">
      <div className="w-100" style={{ maxWidth: "420px" }}>

        <div className="text-center mb-4">
          <h1 className="fw-bold" style={{ color: "#142b5f" }}>
            Create Account
          </h1>

          <p className="text-secondary">
            Create your Medicine Assistant account
          </p>
        </div>

        <form onSubmit={handleSignup}>

          {/* Username */}
          <div className="mb-3">
            <label className="form-label fw-semibold">
              Username
            </label>

            <input
              type="text"
              className="form-control form-control-lg"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

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
          <div className="mb-4">
            <label className="form-label fw-semibold">
              Password
            </label>

            <input
              type="password"
              className="form-control form-control-lg"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {/* Signup button */}
          <button
            type="submit"
            className="btn btn-primary btn-lg w-100"
          >
            Create Account
          </button>

        </form>

        {/* Login link */}
        <div className="text-center mt-4">
          <span className="text-secondary">
            Already have an account?{" "}
          </span>

          <Link
            to="/login"
            className="text-primary fw-semibold text-decoration-none"
          >
            Sign In
          </Link>
        </div>

      </div>
    </div>
  );
}

export default Signup;