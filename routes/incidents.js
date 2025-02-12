const express = require("express");
const router = express.Router();
const Incident = require("../models/Incident");
const authenticate = require("../middleware/authMiddleware");
const rateLimit = require("express-rate-limit");

// Rate Limiting: Allow only 5 reports per 10 minutes per IP
const reportLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 5, // Max 5 reports per window per IP
    message: { error: "Too many reports submitted. Try again later." },
    headers: true,
});

// Prevent duplicate incidents from the same user within 2 minutes
async function checkDuplicateIncident(req, res, next) {
    try {
        const { category, type, location } = req.body;
        const recentIncident = await Incident.findOne({
            category,
            type,
            "location.coordinates": location.coordinates,
            createdAt: { $gte: new Date(Date.now() - 2 * 60 * 1000) }, // Last 2 minutes
        });

        if (recentIncident) {
            return res.status(400).json({ error: "Duplicate incident detected. Try again later." });
        }

        next();
    } catch (error) {
        console.error("Duplicate check failed:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// Apply rate limiting and duplicate check to the incident creation route
router.post("/", authenticate, reportLimiter, checkDuplicateIncident, async (req, res) => {
    try {
        const { category, type, meterNumber, reference, location } = req.body;

        if (!category || !type || !location || !location.type || !location.coordinates) {
            return res.status(400).json({ error: "Invalid data" });
        }

        const incident = new Incident({
            category,
            type,
            meterNumber: meterNumber || null,
            reference: reference || null,
            location,
            createdAt: new Date(), // Track creation time
        });

        const savedIncident = await incident.save();
        res.status(201).json({ message: "Incident reported successfully", incident: savedIncident });
    } catch (err) {
        console.error("Error saving incident:", err);
        res.status(500).json({ error: "Failed to save incident" });
    }
});

// Get All Incidents (Authenticated)
router.get("/", authenticate, async (req, res) => {
    try {
      // Return all fields except MongoDB's _id
      const incidents = await Incident.find({}, { _id: 0 }).sort({ _id: -1 });
      res.status(200).json(incidents);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch incidents" });
    }
  });

module.exports = router;
