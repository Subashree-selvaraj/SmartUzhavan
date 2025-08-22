const mongoose = require('mongoose');

const OutbreakReportSchema = new mongoose.Schema({
  cropType: { type: String, required: true },
  diseaseName: { type: String, required: true },
  location: {
    district: { type: String, required: true },
    taluk: { type: String } // optional
  },
  date: { type: Date, default: Date.now },
});

module.exports = mongoose.model('OutbreakReport', OutbreakReportSchema);
