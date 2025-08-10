import React, { useState } from 'react';

const OutbreakReportForm = ({ diagnosis, onReportSuccess }) => {
  const [district, setDistrict] = useState('');
  const [taluk, setTaluk] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!district.trim()) {
      setError('Please enter your district');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const resp = await fetch('/api/outbreak/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cropType: diagnosis.cropType,
          diseaseName: diagnosis.diseaseName,
          location: { district: district.trim(), taluk: taluk.trim() },
        }),
      });
      const data = await resp.json();
      if (data.success) onReportSuccess();
      else setError(data.error || 'Failed to send report');
    } catch (ex) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: 16 }}>
      <h4>Share this diagnosis with farmers in your district?</h4>
      <form onSubmit={handleSubmit}>
        <label>
          District *
          <input type="text" value={district} onChange={e => setDistrict(e.target.value)} required />
        </label><br/>
        <label>
          Taluk (optional)
          <input type="text" value={taluk} onChange={e => setTaluk(e.target.value)} />
        </label><br/>
        <button type="submit" disabled={loading}>
          {loading ? 'Reporting...' : 'Share Anonymously'}
        </button>
      </form>
      {error && <p style={{ color: 'red', marginTop: 8 }}>{error}</p>}
    </div>
  );
};
export default OutbreakReportForm;
