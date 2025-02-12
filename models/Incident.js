// models/Incident.js
const mongoose = require("mongoose");
const { type } = require("os");

const IncidentSchema = new mongoose.Schema({
  category: { type: String, required: true },
  createdAt: { type: Date, default: Date.now() },
  type: { type: String, required: true },
  meterNumber: { type: String, default: null },  // <--- New Field
  reference: { type: String, default: null },    // <--- New Field
  location: {
    type: { type: String, enum: ["Point"], required: true },
    coordinates: { type: [Number], required: true },
  },
});

// Enable geospatial queries
IncidentSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Incident", IncidentSchema);
