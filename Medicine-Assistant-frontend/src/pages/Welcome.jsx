import { useNavigate } from "react-router-dom";
import welcomeFamily from "../assets/images/welcome-family.png";

function Welcome() {
    const navigate = useNavigate();
  

  return (
    <div className="welcome-page container-fluid min-vh-100 d-flex justify-content-center align-items-center">
      
      <div className="welcome-container text-center">

        {/* Family Image */}
        <img
          src={welcomeFamily}
          alt="Family"
          className="welcome-family-image"
        />

        {/* Heading */}
        <h1 className="welcome-title">
          Your Medicine
          <br />
          Companion
        </h1>

        {/* Description */}
        <p className="welcome-description">
          Stay on track.
          <br />
          Stay healthy.
          <br />
          With the support
          <br />
          of your family.
        </p>

        {/* Get Started */}
        <button
          className="btn btn-primary welcome-button"
          onClick={() => navigate("/signup")}
        >
          Get Started
        </button>

        {/* Sign In */}
        <div className="welcome-signin-box">
          <p className="mb-1">Already have an account?</p>

          <button
            className="btn btn-link welcome-signin"
            onClick={() => navigate("/login")}
          >
            Sign In
          </button>
        </div>

      </div>

    </div>
  );
}

export default Welcome;