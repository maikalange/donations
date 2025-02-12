document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");
    const togglePassword = document.getElementById("togglePassword");
    const passwordInput = document.getElementById("password");

    // Toggle password visibility
    togglePassword.addEventListener("click", () => {
        const type = passwordInput.getAttribute("type") === "password" ? "text" : "password";
        passwordInput.setAttribute("type", type);
        togglePassword.textContent = type === "password" ? "👁️" : "🙈";
    });

    // Handle form submission
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const username = document.getElementById("username").value;
        const password = passwordInput.value;
        const rememberMe = document.getElementById("rememberMe").checked;
        const errorMessage = document.getElementById("error-message");

        const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password, rememberMe }),
            credentials: "include",
        });

        const result = await response.json();
        if (response.ok) {
            window.location.href = "/"; // Redirect to dashboard
        } else {
            errorMessage.textContent = result.error || "Invalid login credentials.";
        }
    });
});
