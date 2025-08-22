
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
  const API_URL = "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070";

  // State management
  const [allRecords, setAllRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
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
      
      // Log the first record to see all available fields
      if (data.records && data.records.length > 0) {
        console.log('=== API DATA STRUCTURE ANALYSIS ===');
        console.log('First record from API:', data.records[0]);
        console.log('All available fields:', Object.keys(data.records[0]));
        console.log('Total records:', data.records.length);
        console.log('Sample dates range:');
        const dates = data.records.slice(0, 10).map(r => r.arrival_date);
        console.log('Sample arrival dates:', dates);
        console.log('=== END ANALYSIS ===');
        

      }
      
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

  // Fetch market trends based on selected date range
  const fetchMarketTrends = async () => {
    if (!selectedState || !selectedCommodity) {
      showError("Please select both State and Crop to view market trends.");
      return;
    }

    setDataLoading(true);
    setError('');

    try {
      // Calculate date range for API query
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - currentDateRange);

      // Format dates for API (DD/MM/YYYY format)
      const formatDateForAPI = (date) => {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      };

      const startDateStr = formatDateForAPI(startDate);
      const endDateStr = formatDateForAPI(endDate);

      // Fetch data from API with date range filter
      const currentApiKey = useBackupKey ? BACKUP_API_KEY : API_KEY;
      const params = new URLSearchParams({
        "api-key": currentApiKey,
        format: "json",
        limit: 10000,
        "filters[arrival_date]": `${startDateStr},${endDateStr}`,
        "filters[state]": selectedState,
        "filters[commodity]": selectedCommodity
      });

      if (selectedCity) {
        params.append("filters[market]", selectedCity);
      }

      const url = `${API_URL}?${params.toString()}`;
      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 401 && !useBackupKey) {
          setUseBackupKey(true);
          return fetchMarketTrends();
        }
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      const apiRecords = data.records || [];

      // Process and filter the API records
      const processedRecords = apiRecords
        .map(apiRecord => ({
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
        }))
        .filter(validateRecord);

      if (processedRecords.length === 0) {
        showError(`No price data found for ${selectedCommodity} in ${selectedState} for the last ${currentDateRange} days. Try selecting a different state, crop, or date range.`);
        setFilteredRecords([]);
        setChartData(null);
        setTableData([]);
        setCurrentPrice(null);
        setPriceChange(null);
        setSummaryData({});
        setInsights({});
        return;
      }

      setFilteredRecords(processedRecords);
      processAndDisplayData(processedRecords);

    } catch (error) {
      console.error('Error fetching market trends:', error);
      showError("Unable to fetch market data. Please try again later.");
    } finally {
      setDataLoading(false);
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

  // Generate market insights using computeInsights logic
  const computeInsights = (records) => {
    if (!records || records.length < 5) {
      return {
        bestTime: "Not enough data for insights.",
        volatility: "Not enough data for insights.",
        prediction: "Not enough data for insights."
      };
    }

    // Sort records by date
    const sorted = [...records].sort(
      (a, b) => new Date(a.arrival_date) - new Date(b.arrival_date)
    );

    // Use only records with numerical modal_price
    const valid = sorted.filter(r => !isNaN(parseFloat(r.modal_price)));
    const prices = valid.map(r => parseFloat(r.modal_price));

    // Best selling time = day with highest modal_price
    let bestTime = "Not enough data for insights.";
    if (valid.length > 0) {
      const idx = prices.indexOf(Math.max(...prices));
      bestTime = `Best price was on ${formatDate(valid[idx].arrival_date)} (₹${prices[idx]} per Quintal)`;
    }

    // Price volatility = Standard deviation
    let volatility = "Not enough data for insights.";
    if (prices.length > 1) {
      const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
      const variance = prices.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / prices.length;
      const stdDev = Math.sqrt(variance);
      const volatilityPercent = avg ? ((stdDev / avg) * 100).toFixed(1) : 0;
      volatility = `Price varies by ${volatilityPercent}% (±₹${stdDev.toFixed(0)} per Quintal)`;
    }

    // Price prediction = Linear regression for next day
    let prediction = "Not enough data for insights.";
    if (prices.length > 2) {
      const N = prices.length;
      const x = Array.from({ length: N }, (v, i) => i);
      const y = prices;
      const sumX = x.reduce((a, b) => a + b, 0);
      const sumY = y.reduce((a, b) => a + b, 0);
      const sumXY = x.map((xi, i) => xi * y[i]).reduce((a, b) => a + b, 0);
      const sumXX = x.map(xi => xi * xi).reduce((a, b) => a + b, 0);
      const slope = (N * sumXY - sumX * sumY) / (N * sumXX - sumX * sumX);
      const intercept = (sumY - slope * sumX) / N;
      const nextVal = slope * N + intercept;
      prediction = `Next price likely around ₹${nextVal.toFixed(0)} per Quintal based on recent trend.`;
    }

    return { bestTime, volatility, prediction };
  };

  const generateMarketInsights = (records) => {
    setInsights(computeInsights(records));
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

  // Update chart by date range - fetch new data from API
  const updateChartByDateRange = (days) => {
    setCurrentDateRange(days);
    // If we have selected state and commodity, fetch new data for the updated date range
    if (selectedState && selectedCommodity) {
      fetchMarketTrends();
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
      <div
        className="market-prices-container" style={{ backgroundColor: "#f0f0f0" }}
      >
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading market data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="market-prices-container" style={{ backgroundColor: "#f0f0f0" }}>
      {/* Page Header */}
      <div className="page-header">
        <h1 style={{ color: "white" }}>🌾 Farmer's Mandi Price Dashboard</h1>
        <p style={{ color: "white" }}>Track market trends and make informed selling decisions</p>
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
            onChange={(e) => updateChartByDateRange(parseInt(e.target.value))}
          >
            <option value="7">Last 7 Days</option>
            <option value="15">Last 15 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 3 Months</option>
          </select>
        </div>

        <button onClick={fetchMarketTrends} disabled={dataLoading}>
          {dataLoading ? '🔄 Fetching Data...' : '📊 Get Market Trends'}
        </button>
      </section>

      {/* Loading and Error */}
      {loading && filteredRecords.length === 0 && (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading market data...</p>
        </div>
      )}

      {dataLoading && (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Fetching price data for the last {currentDateRange} days...</p>
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
                className={`chart-btn ${currentDateRange === 7 ? 'active' : ''} ${dataLoading ? 'disabled' : ''}`}
                onClick={() => updateChartByDateRange(7)}
                disabled={dataLoading}
              >
                {dataLoading && currentDateRange === 7 ? 'Loading...' : '7 Days'}
              </button>
              <button 
                className={`chart-btn ${currentDateRange === 15 ? 'active' : ''} ${dataLoading ? 'disabled' : ''}`}
                onClick={() => updateChartByDateRange(15)}
                disabled={dataLoading}
              >
                {dataLoading && currentDateRange === 15 ? 'Loading...' : '15 Days'}
              </button>
              <button 
                className={`chart-btn ${currentDateRange === 30 ? 'active' : ''} ${dataLoading ? 'disabled' : ''}`}
                onClick={() => updateChartByDateRange(30)}
                disabled={dataLoading}
              >
                {dataLoading && currentDateRange === 30 ? 'Loading...' : '30 Days'}
              </button>
              <button 
                className={`chart-btn ${currentDateRange === 90 ? 'active' : ''} ${dataLoading ? 'disabled' : ''}`}
                onClick={() => updateChartByDateRange(90)}
                disabled={dataLoading}
              >
                {dataLoading && currentDateRange === 90 ? 'Loading...' : '3 Months'}
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
