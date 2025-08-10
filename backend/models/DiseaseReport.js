
const mongoose = require("mongoose");

const DiseaseReportSchema = new mongoose.Schema({
  farmerName: { type: String, default: "Anonymous" },
  cropName: { type: String, required: true },
  diseaseName: { type: String, required: true },
  severity: { type: String, enum: ["mild", "moderate", "severe"], required: true },
  imageUrl: { type: String, required: false },
  location: {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], required: true } // [lng, lat]
  },
  dateReported: { type: Date, default: Date.now },
  reportedBy: { type: String, default: "anonymous" }
});

DiseaseReportSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("DiseaseReport", DiseaseReportSchema);
