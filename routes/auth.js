const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

router.post("/login", (req, res) => {
    // Example: Validate user (could be expanded for real authentication)
    const { username, password } = req.body;
    if (username !== process.env.ADMIN_USER || password !== process.env.ADMIN_PASS) {
        return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate a token
    const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: "1h" });

    // Set token in HTTP-only cookie
    res.cookie("auth_token", token, { httpOnly: true, secure: true, sameSite: "Strict" });
    res.json({ message: "Authentication successful" });
});

router.post("/logout", (req, res) => {
    res.clearCookie("auth_token");
    res.json({ message: "Logged out successfully" });
});

router.get("/check", (req, res) => {
    const token = req.cookies.auth_token;
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        res.json({ user: decoded.username });
    } catch (err) {
        res.status(403).json({ error: "Invalid token" });
    }
});


module.exports = router;
