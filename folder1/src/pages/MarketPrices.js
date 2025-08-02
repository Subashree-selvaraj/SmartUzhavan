import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';
import './MarketPrices.css';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const MarketPrices = () => {
  // API Configuration
  const API_KEY =process.env.REACT_APP_MARKET_API_KEY;
  const BACKUP_API_KEY =process.env.REACT_APP_MARKET_BACKUP_API_KEY;
  const API_URL = "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070"

  // State management
  const [allRecords, setAllRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [useBackupKey, setUseBackupKey] = useState(false);
  const [currentDateRange, setCurrentDateRange] = useState(30);

  // Filter states
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedCommodity, setSelectedCommodity] = useState('');

  // Data for display
  const [currentPrice, setCurrentPrice] = useState(null);
  const [priceChange, setPriceChange] = useState(null);
  const [summaryData, setSummaryData] = useState({});
  const [chartData, setChartData] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [insights, setInsights] = useState({});

  // Utility functions
  const showError = (message) => {
    setError(message);
    setTimeout(() => setError(''), 5000);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const parts = dateString.split(/[-/]/);
      let date;
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          date = new Date(parts[0], parts[1] - 1, parts[2]);
        } else {
          date = new Date(parts[2], parts[1] - 1, parts[0]);
        }
      } else {
        date = new Date(dateString);
      }
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const validateRecord = (record) => {
    return record && record.commodity && record.market && record.modal_price && record.arrival_date;
  };

  // Initial data loading
  const fetchInitialData = async () => {
    setLoading(true);
    setError('');

    try {
      const currentApiKey = useBackupKey ? BACKUP_API_KEY : API_KEY;
      const params = new URLSearchParams({
        "api-key": currentApiKey,
        format: "json",
        limit: 10000
      });

      const url = `${API_URL}?${params.toString()}`;
      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 401 && !useBackupKey) {
          setUseBackupKey(true);
          return fetchInitialData();
        }
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      console.log(data); // <-- Add this
      const processedRecords = (data.records || []).map(apiRecord => ({
        state: apiRecord.state ? apiRecord.state.trim() : '',
        district: apiRecord.district ? apiRecord.district.trim() : '',
        market: apiRecord.market ? apiRecord.market.trim() : '',
        commodity: apiRecord.commodity ? apiRecord.commodity.trim() : '',
        variety: apiRecord.variety ? apiRecord.variety.trim() : '',
        grade: apiRecord.grade ? apiRecord.grade.trim() : '',
        arrival_date: apiRecord.arrival_date ? apiRecord.arrival_date.trim() : '',
        min_price: apiRecord.min_price ? apiRecord.min_price.trim() : '',
        max_price: apiRecord.max_price ? apiRecord.max_price.trim() : '',
        modal_price: apiRecord.modal_price ? apiRecord.modal_price.trim() : '',
      }));

      setAllRecords(processedRecords);

      if (processedRecords.length === 0) {
        showError("No data available from the API at the moment.");
      }

    } catch (error) {
      console.error('Error fetching initial records:', error);
      showError("Failed to load initial market data. Please check your internet connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  // Get unique values for dropdowns
  const getUniqueStates = () => {
    return [...new Set(allRecords.map(record => record.state))].filter(Boolean).sort();
  };

  const getUniqueCities = () => {
    const filteredByState = selectedState 
      ? allRecords.filter(record => record.state === selectedState)
      : allRecords;
    return [...new Set(filteredByState.map(record => record.market))].filter(Boolean).sort();
  };

  const getUniqueCommodities = () => {
    let filtered = allRecords;
    if (selectedState) {
      filtered = filtered.filter(record => record.state === selectedState);
    }
    return [...new Set(filtered.map(record => record.commodity))].filter(Boolean).sort();
  };

  // Fetch market trends
  const fetchMarketTrends = () => {
    if (!selectedState || !selectedCommodity) {
      showError("Please select both State and Crop to view market trends.");
      return;
    }

    setLoading(true);
    setError('');

    try {
      let records = allRecords;

      if (selectedState) {
        records = records.filter(r => r.state === selectedState);
      }
      if (selectedCommodity) {
        records = records.filter(r => r.commodity === selectedCommodity);
      }
      if (selectedCity) {
        records = records.filter(r => r.market === selectedCity);
      }

      const validRecords = records.filter(validateRecord);

      if (validRecords.length === 0) {
        showError("No price data found for the selected filters. Try selecting a different state or crop.");
        return;
      }

      setFilteredRecords(validRecords);
      processAndDisplayData(validRecords);

    } catch (error) {
      console.error('Error fetching market trends:', error);
      showError("Unable to fetch market data. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  // Process and display data
  const processAndDisplayData = (records) => {
    const sortedRecords = records
      .filter(validateRecord)
      .sort((a, b) => {
        const dateA = new Date(a.arrival_date.split('/').reverse().join('-'));
        const dateB = new Date(b.arrival_date.split('/').reverse().join('-'));
        return dateA - dateB;
      });

    const recentRecords = sortedRecords.slice(-currentDateRange);

    if (recentRecords.length === 0) {
      showError("No recent data available for the selected time period.");
      return;
    }

    updateCurrentPrice(recentRecords);
    updateSummaryCards(recentRecords);
    setTableData(recentRecords);
    createPriceChart(recentRecords);
    generateMarketInsights(recentRecords);
  };

  // Update current price
  const updateCurrentPrice = (records) => {
    if (records.length === 0) return;

    const sorted = records.slice().sort((a, b) => {
      const dateA = new Date(a.arrival_date.split('/').reverse().join('-'));
      const dateB = new Date(b.arrival_date.split('/').reverse().join('-'));
      return dateB - dateA;
    });

    const latestRecord = sorted[0];
    const currentPriceValue = parseFloat(latestRecord.modal_price) || 0;
    const latestDate = formatDate(latestRecord.arrival_date);

    setCurrentPrice({
      value: currentPriceValue,
      date: latestDate
    });

    if (sorted.length > 1) {
      const previousRecord = sorted[1];
      const previousPrice = parseFloat(previousRecord.modal_price) || 0;
      const change = currentPriceValue - previousPrice;
      const percentChange = previousPrice ? ((change / previousPrice) * 100).toFixed(1) : 0;

      setPriceChange({
        absolute: change,
        percent: percentChange,
        direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable'
      });
    } else {
      setPriceChange(null);
    }
  };

  // Update summary cards
  const updateSummaryCards = (records) => {
    if (records.length === 0) return;

    const prices = records.map(r => parseFloat(r.modal_price) || 0);
    const firstPrice = prices[0];
    const lastPrice = prices[prices.length - 1];
    const priceChangeVal = lastPrice - firstPrice;
    const percentChange = firstPrice ? ((priceChangeVal / firstPrice) * 100).toFixed(1) : 0;

    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(0);
    const lastDate = formatDate(records[records.length - 1].arrival_date);

    setSummaryData({
      trend: {
        direction: priceChangeVal > 0 ? 'up' : priceChangeVal < 0 ? 'down' : 'stable',
        percent: percentChange
      },
      minPrice,
      maxPrice,
      avgPrice,
      lastUpdated: lastDate
    });
  };

  // Create price chart
  const createPriceChart = (records) => {
    const labels = records.map(record => formatDate(record.arrival_date));
    const prices = records.map(record => parseFloat(record.modal_price) || 0);

    setChartData({
      labels: labels,
      datasets: [{
        label: `${selectedCommodity} Price Trend (₹/Quintal)`,
        data: prices,
        borderColor: '#2e7d32',
        backgroundColor: 'rgba(46, 125, 50, 0.1)',
        fill: true,
        tension: 0.4,
      }]
    });
  };

  // Generate market insights
  const generateMarketInsights = (records) => {
    if (records.length < 2) {
      setInsights({
        bestTime: 'Not enough data for insights.',
        volatility: 'Not enough data for insights.',
        prediction: 'Not enough data for insights.'
      });
      return;
    }

    const prices = records.map(r => parseFloat(r.modal_price) || 0);
    const maxPrice = Math.max(...prices);
    const maxPriceIndex = prices.indexOf(maxPrice);
    const maxPriceDate = formatDate(records[maxPriceIndex].arrival_date);

    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const variance = prices.reduce((acc, price) => acc + Math.pow(price - avgPrice, 2), 0) / prices.length;
    const volatilityVal = Math.sqrt(variance);
    const volatilityPercent = avgPrice ? ((volatilityVal / avgPrice) * 100).toFixed(1) : 0;

    const recentTrend = prices[prices.length - 1] - prices[0];
    const predictionVal = prices[prices.length - 1] + (recentTrend / prices.length);

    setInsights({
      bestTime: `Best price was on ${maxPriceDate} (₹${maxPrice} per Quintal)`,
      volatility: `Price varies by ${volatilityPercent}% (±₹${volatilityVal.toFixed(0)} per Quintal)`,
      prediction: `Next price likely around ₹${predictionVal.toFixed(0)} per Quintal based on recent trend.`
    });
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        title: { 
          display: true, 
          text: 'Price (₹/Quintal)' 
        }
      }
    },
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Price Trend Analysis'
      }
    }
  };

  // Update chart by date range
  const updateChartByDateRange = (days) => {
    setCurrentDateRange(days);
    if (filteredRecords.length > 0) {
      const sortedRecords = filteredRecords
        .filter(validateRecord)
        .sort((a, b) => new Date(a.arrival_date) - new Date(b.arrival_date));
      
      const recentRecords = sortedRecords.slice(-days);
      if (recentRecords.length > 0) {
        createPriceChart(recentRecords);
      }
    }
  };

  // Effects
  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedState) {
      setSelectedCity(''); // Reset city when state changes
    }
  }, [selectedState]);

  if (loading && allRecords.length === 0) {
    return (
      <div className="market-prices-container">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading market data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="market-prices-container">
      {/* Page Header */}
      <div className="page-header">
        <h1>🌾 Farmer's Mandi Price Dashboard</h1>
        <p>Track market trends and make informed selling decisions</p>
      </div>

      {/* Filters Section */}
      <section className="filters">
        <div className="filter-group">
          <label htmlFor="stateSelect">Select State:</label>
          <select 
            id="stateSelect"
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
          >
            <option value="">Choose State</option>
            {getUniqueStates().map(state => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="citySelect">Select City/Mandi:</label>
          <select 
            id="citySelect"
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
          >
            <option value="">Choose City</option>
            {getUniqueCities().map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="commoditySelect">Select Crop:</label>
          <select 
            id="commoditySelect"
            value={selectedCommodity}
            onChange={(e) => setSelectedCommodity(e.target.value)}
          >
            <option value="">Choose Crop</option>
            {getUniqueCommodities().map(commodity => (
              <option key={commodity} value={commodity}>{commodity}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="dateRange">Date Range:</label>
          <select 
            id="dateRange"
            value={currentDateRange}
            onChange={(e) => setCurrentDateRange(parseInt(e.target.value))}
          >
            <option value="7">Last 7 Days</option>
            <option value="15">Last 15 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 3 Months</option>
          </select>
        </div>

        <button onClick={fetchMarketTrends}>
          📊 Get Market Trends
        </button>
      </section>

      {/* Loading and Error */}
      {loading && filteredRecords.length === 0 && (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading market data...</p>
        </div>
      )}

      {error && (
        <div className="error-message">
          <i className="fas fa-exclamation-circle"></i>
          <span>{error}</span>
        </div>
      )}

      {/* Main Content */}
      <main>
        {/* Current Price Section */}
        {currentPrice && (
          <section className="current-price-section">
            <div className="current-price-card">
              <h2>💰 Current Market Price <span style={{fontSize:'0.9rem', fontWeight:'400'}}>(per Quintal)</span></h2>
              <div className="current-price">
                <span className="price-value">₹{currentPrice.value}</span>
                <span className="price-date">(as of {currentPrice.date})</span>
              </div>
              {priceChange && (
                <div className="price-change">
                  <span className={`change-value change-${priceChange.direction}`}>
                    {priceChange.direction === 'up' ? '↗️' : priceChange.direction === 'down' ? '↘️' : '→'} 
                    ₹{Math.abs(priceChange.absolute).toFixed(2)} ({priceChange.percent}%)
                  </span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Summary Cards */}
        {summaryData.trend && (
          <section className="summary-cards">
            <div className="card">
              <h3>📈 Current Trend</h3>
              <div className="trend-indicator">
                <span className={`trend-text trend-${summaryData.trend.direction}`}>
                  {summaryData.trend.direction === 'up' ? '↗️' : summaryData.trend.direction === 'down' ? '↘️' : '→'} 
                  {summaryData.trend.percent}%
                </span>
              </div>
            </div>

            <div className="card">
              <h3>💰 Price Range</h3>
              <div className="price-range">
                <span className="min-price">Min: ₹{summaryData.minPrice}</span>
                <span className="max-price">Max: ₹{summaryData.maxPrice}</span>
              </div>
            </div>

            <div className="card">
              <h3>📊 Average Price</h3>
              <div className="avg-price">
                <span className="price">₹{summaryData.avgPrice}</span>
              </div>
            </div>

            <div className="card">
              <h3>📅 Last Updated</h3>
              <div className="last-updated">
                <span className="date">{summaryData.lastUpdated}</span>
              </div>
            </div>
          </section>
        )}

        {/* Price Trend Chart */}
        {chartData && (
          <section className="chart-section">
            <h2>📈 Price Trend Analysis <span style={{fontSize:'0.9rem', fontWeight:'400'}}>(₹ per Quintal)</span></h2>
            <div className="chart-container">
              <Line data={chartData} options={chartOptions} />
            </div>
            <div className="chart-controls">
              <button 
                className={`chart-btn ${currentDateRange === 7 ? 'active' : ''}`}
                onClick={() => updateChartByDateRange(7)}
              >
                7 Days
              </button>
              <button 
                className={`chart-btn ${currentDateRange === 15 ? 'active' : ''}`}
                onClick={() => updateChartByDateRange(15)}
              >
                15 Days
              </button>
              <button 
                className={`chart-btn ${currentDateRange === 30 ? 'active' : ''}`}
                onClick={() => updateChartByDateRange(30)}
              >
                30 Days
              </button>
              <button 
                className={`chart-btn ${currentDateRange === 90 ? 'active' : ''}`}
                onClick={() => updateChartByDateRange(90)}
              >
                3 Months
              </button>
            </div>
          </section>
        )}

        {/* Price Table */}
        {tableData.length > 0 && (
          <section className="table-section">
            <h2>📋 Detailed Price Data</h2>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Crop</th>
                    <th>Market</th>
                    <th>Min Price (₹/Quintal)</th>
                    <th>Max Price (₹/Quintal)</th>
                    <th>Modal Price (₹/Quintal)</th>
                    <th>Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((record, index) => {
                    const modalPrice = parseFloat(record.modal_price) || 0;
                    let trendClass = 'trend-stable';
                    let trendText = '→';
                    
                    if (index > 0) {
                      const prevPrice = parseFloat(tableData[index - 1].modal_price) || 0;
                      if (modalPrice > prevPrice) { 
                        trendClass = 'trend-up'; 
                        trendText = '↗️'; 
                      } else if (modalPrice < prevPrice) { 
                        trendClass = 'trend-down'; 
                        trendText = '↘️'; 
                      }
                    }

                    return (
                      <tr key={index}>
                        <td className="date-cell">{formatDate(record.arrival_date)}</td>
                        <td>{record.commodity || 'N/A'}</td>
                        <td>{record.market || 'N/A'}</td>
                        <td>₹{record.min_price || 'N/A'}</td>
                        <td>₹{record.max_price || 'N/A'}</td>
                        <td>₹{record.modal_price || 'N/A'}</td>
                        <td className={`trend-cell ${trendClass}`}>{trendText}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Market Insights */}
        {insights.bestTime && (
          <section className="insights-section">
            <h2>💡 Market Insights</h2>
            <div className="insights">
              <div className="insight-card">
                <h4>🎯 Best Selling Time</h4>
                <p>{insights.bestTime}</p>
              </div>
              <div className="insight-card">
                <h4>📊 Price Volatility</h4>
                <p>{insights.volatility}</p>
              </div>
              <div className="insight-card">
                <h4>💰 Price Prediction</h4>
                <p>{insights.prediction}</p>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="footer-section">
        <p>&copy; {new Date().getFullYear()} Farmer Dashboard | Data Source: <a href="https://data.gov.in/" target="_blank" rel="noopener noreferrer">data.gov.in</a></p>
      </footer>
    </div>
  );
};

export default MarketPrices;
