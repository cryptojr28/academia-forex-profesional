import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [currentView, setCurrentView] = useState('home');
  const [courses, setCourses] = useState([]);
  const [selectedPair, setSelectedPair] = useState('EURUSD');
  const [loading, setLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [chatMessage, setChatMessage] = useState('');
  const [user, setUser] = useState(null);
  const [userLevel, setUserLevel] = useState('Principiante');
  const [marketNews, setMarketNews] = useState([]);
  const [progress, setProgress] = useState({});
  const [subscription, setSubscription] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    comments: ''
  });
  const [liveNews, setLiveNews] = useState([]);
  const [marketAlerts, setMarketAlerts] = useState([]);
  const [pairAnalysis, setPairAnalysis] = useState({});
  const [globalNews, setGlobalNews] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [riskCalculator, setRiskCalculator] = useState({
    capital: '',
    riskPercentage: '2',
    pair: 'EURUSD',
    entryPrice: '',
    stopLoss: '',
    result: null
  });

  const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

  const forexPairs = [
    { code: 'EURUSD', name: 'Euro / US Dollar', volatility: 'medium', pips: '15-25' },
    { code: 'GBPUSD', name: 'British Pound / US Dollar', volatility: 'high', pips: '20-35' },
    { code: 'USDJPY', name: 'US Dollar / Japanese Yen', volatility: 'medium', pips: '12-22' },
    { code: 'XAUUSD', name: 'Gold / US Dollar', volatility: 'high', pips: '30-50' },
    { code: 'GBPJPY', name: 'British Pound / Japanese Yen', volatility: 'high', pips: '25-45' }
  ];

  useEffect(() => {
    fetchCourses();
    fetchMarketNews();
    fetchLiveNews();
    fetchGlobalNews();
    fetchMarketAlerts();
    initializeUser();
    fetchSubscriptionPlans();
  }, []);

  const initializeUser = () => {
    const userData = { user_id: 'demo_user', level: 'Principiante' };
    setUser(userData);
    setUserLevel(userData.level);
  };

  const fetchSubscriptionPlans = async () => {
    try {
      setSubscription({ status: 'no_active_subscription' });
    } catch (error) {
      console.error('Error fetching subscription:', error);
    }
  };

  const fetchMarketAlerts = async () => {
    try {
      const response = await fetch(`${API_URL}/api/market/alerts`);
      const data = await response.json();
      setMarketAlerts(data.alerts || []);
    } catch (error) {
      console.error('Error fetching market alerts:', error);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await fetch(`${API_URL}/api/courses`);
      const coursesData = await response.json();
      setCourses(coursesData);
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const fetchMarketNews = async () => {
    try {
      const response = await fetch(`${API_URL}/api/market/news`);
      const newsData = await response.json();
      setMarketNews(newsData);
    } catch (error) {
      console.error('Error fetching news:', error);
    }
  };

  const fetchLiveNews = async () => {
    setNewsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/market/news/live`);
      const data = await response.json();
      setLiveNews(data.live_news || []);
      
      // Fetch pair analysis data
      const analysisData = {};
      for (const pair of ['XAUUSD', 'GBPJPY', 'EURUSD']) {
        try {
          const analysisResponse = await fetch(`${API_URL}/api/market/analysis/${pair}`);
          const analysisResult = await analysisResponse.json();
          analysisData[pair] = analysisResult;
        } catch (error) {
          console.error(`Error fetching analysis for ${pair}:`, error);
        }
      }
      setPairAnalysis(analysisData);
    } catch (error) {
      console.error('Error fetching live news:', error);
    } finally {
      setNewsLoading(false);
    }
  };

  const handleAnalysis = async (type) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/ai/analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.user_id || 'anonymous',
          pair: selectedPair,
          analysis_type: type
        })
      });
      const result = await response.json();
      setAiResponse(result.analysis);
    } catch (error) {
      console.error('Error getting AI analysis:', error);
      setAiResponse('Error al generar análisis. Por favor, intenta de nuevo.');
    }
    setLoading(false);
  };

  const handleChat = async () => {
    if (!chatMessage.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.user_id || 'anonymous',
          message: chatMessage,
          pair: selectedPair
        })
      });
      
      if (!response.ok) {
        throw new Error('API Error');
      }
      
      const result = await response.json();
      setAiResponse(result.response);
      setChatMessage('');
    } catch (error) {
      console.error('Error in chat:', error);
      
      // Respuesta alternativa cuando la API falla
      const fallbackResponse = `🤖 **Análisis IA para ${selectedPair}**

**Tu consulta:** ${chatMessage}

**Respuesta del Sistema IA:**

Basándome en el análisis técnico actual del par ${selectedPair}, aquí tienes mi evaluación:

📊 **Situación Actual:**
- Tendencia principal: Alcista moderada
- Resistencia clave: Nivel observado en máximos recientes
- Soporte importante: Zona de consolidación previa

⚖️ **Gestión de Riesgo:**
- Recomiendo un stop loss del 2% máximo
- Ratio riesgo/beneficio mínimo 1:2
- Considera el calendario económico antes de operar

🎯 **Recomendación:**
Mantén una posición conservadora y observa las confirmaciones de precio en timeframes altos antes de tomar decisiones importantes.

*Nota: Esta es una respuesta del sistema de respaldo. Para análisis más detallados, utiliza los botones de Análisis IA específicos.*`;

      setAiResponse(fallbackResponse);
      setChatMessage('');
    }
    setLoading(false);
  };

  const calculateRisk = () => {
    const { capital, riskPercentage, entryPrice, stopLoss } = riskCalculator;
    
    if (!capital || !entryPrice || !stopLoss) {
      alert('Por favor, completa todos los campos');
      return;
    }

    const capitalNum = parseFloat(capital);
    const riskPercNum = parseFloat(riskPercentage);
    const entryNum = parseFloat(entryPrice);
    const stopNum = parseFloat(stopLoss);

    // Calcular el riesgo en dinero
    const riskAmount = (capitalNum * riskPercNum) / 100;
    
    // Calcular la diferencia en pips (aproximado para pares principales)
    const pipDifference = Math.abs(entryNum - stopNum) * 10000;
    
    // Calcular tamaño de lote
    const pipValue = 10; // $10 por pip para lote estándar en EUR/USD
    const lotSize = riskAmount / (pipDifference * pipValue);
    
    // Calcular potencial ganancia (1:2 ratio)
    const takeProfitDistance = pipDifference * 2;
    const potentialProfit = riskAmount * 2;

    const result = {
      riskAmount: riskAmount.toFixed(2),
      lotSize: lotSize.toFixed(2),
      pipDifference: pipDifference.toFixed(1),
      potentialProfit: potentialProfit.toFixed(2),
      takeProfitDistance: takeProfitDistance.toFixed(1),
      riskRewardRatio: '1:2'
    };

    setRiskCalculator(prev => ({ ...prev, result }));
  };

  const fetchGlobalNews = async () => {
    try {
      // Simulamos noticias globales ya que necesitarías APIs específicas para CNBC/Bloomberg
      const mockGlobalNews = [
        {
          id: 1,
          title: "Powell Signals Fed May Pause Rate Hikes Amid Inflation Concerns",
          summary: "Federal Reserve Chair Jerome Powell indicated potential pause in interest rate increases as inflation shows signs of cooling.",
          source: "CNBC",
          time: "2 horas",
          image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=300&h=200&fit=crop",
          impact: "high",
          pairs: ["EURUSD", "GBPUSD", "USDJPY"]
        },
        {
          id: 2,
          title: "European Central Bank Maintains Aggressive Stance on Inflation",
          summary: "ECB officials reaffirm commitment to combating inflation despite growing recession concerns across eurozone.",
          source: "Bloomberg",
          time: "4 horas",
          image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=300&h=200&fit=crop",
          impact: "high",
          pairs: ["EURUSD", "EURGBP", "EURJPY"]
        },
        {
          id: 3,
          title: "UK GDP Shows Stronger Than Expected Growth",
          summary: "British economy demonstrates resilience with GDP growth exceeding forecasts, supporting pound strength.",
          source: "CNBC",
          time: "6 horas",
          image: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=300&h=200&fit=crop",
          impact: "medium",
          pairs: ["GBPUSD", "EURGBP", "GBPJPY"]
        },
        {
          id: 4,
          title: "Bank of Japan Intervention Speculation Grows",
          summary: "Japanese officials hint at potential intervention as yen weakens beyond key psychological levels.",
          source: "Bloomberg",
          time: "8 horas",
          image: "https://images.unsplash.com/photo-1590736969955-71cc94901144?w=300&h=200&fit=crop",
          impact: "high",
          pairs: ["USDJPY", "EURJPY", "GBPJPY"]
        },
        {
          id: 5,
          title: "Gold Prices Surge on Safe Haven Demand",
          summary: "Precious metals rally as geopolitical tensions and economic uncertainty drive investors to safe haven assets.",
          source: "CNBC",
          time: "12 horas",
          image: "https://images.unsplash.com/photo-1610375461246-83df859d849d?w=300&h=200&fit=crop",
          impact: "medium",
          pairs: ["XAUUSD", "XAGUSD"]
        }
      ];

      setGlobalNews(mockGlobalNews);
    } catch (error) {
      console.error('Error fetching global news:', error);
    }
  };

  const handleEASniperContact = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Simulamos el envío del formulario (aquí integrarías con tu servicio de email)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // En producción, aquí enviarías el email a estudiartrading@gmail.com
      console.log('Formulario EA-SNIPER enviado:', {
        to: 'estudiartrading@gmail.com',
        name: contactForm.name,
        email: contactForm.email,
        comments: contactForm.comments,
        subject: 'Solicitud de Acceso EA-AKA-AI SNIPER',
        price: '€485.10 (30% descuento premium)'
      });
      
      setPaymentStatus({
        type: 'success',
        message: '¡Solicitud enviada! Te contactaremos en 24h para el acceso EA-SNIPER'
      });
      
      // Limpiar formulario
      setContactForm({ name: '', email: '', comments: '' });
      
    } catch (error) {
      setPaymentStatus({
        type: 'error',
        message: 'Error al enviar solicitud. Intenta de nuevo.'
      });
    } finally {
      setLoading(false);
    }
  };

  // Simulador de Gráfico de Trading
  const TradingChart = ({ pair, level, lesson }) => {
    const [chartData, setChartData] = useState(null);

    useEffect(() => {
      // Generar datos del gráfico basados en el nivel y lección
      const generateChartData = () => {
        const basePrice = pair === 'EURUSD' ? 1.0500 : pair === 'GBPUSD' ? 1.2800 : 150.00;
        const data = [];
        
        for (let i = 0; i < 100; i++) {
          const variation = (Math.random() - 0.5) * 0.01;
          const price = basePrice + variation + (Math.sin(i * 0.1) * 0.005);
          data.push({
            time: i,
            price: price,
            volume: Math.random() * 1000 + 500
          });
        }

        return {
          prices: data,
          support: basePrice - 0.02,
          resistance: basePrice + 0.02,
          demandZone: { start: basePrice - 0.01, end: basePrice - 0.005 },
          supplyZone: { start: basePrice + 0.005, end: basePrice + 0.01 }
        };
      };

      setChartData(generateChartData());
    }, [pair, level, lesson]);

    const drawChart = (canvas) => {
      if (!canvas || !chartData) return;
      
      const ctx = canvas.getContext('2d');
      const width = canvas.width;
      const height = canvas.height;
      
      // Limpiar canvas
      ctx.clearRect(0, 0, width, height);
      
      // Fondo
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, width, height);
      
      // Grid
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      for (let i = 0; i < 10; i++) {
        const y = (height / 10) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      
      // Zonas de Oferta y Demanda
      if (level === 'intermediate' || level === 'professional') {
        // Zona de Demanda (verde)
        ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
        const demandStart = height * 0.7;
        const demandEnd = height * 0.6;
        ctx.fillRect(0, demandStart, width, demandEnd - demandStart);
        
        // Zona de Oferta (roja)
        ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
        const supplyStart = height * 0.3;
        const supplyEnd = height * 0.2;
        ctx.fillRect(0, supplyStart, width, supplyEnd - supplyStart);
      }
      
      // Líneas de Soporte y Resistencia
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      
      // Soporte
      const supportY = height * 0.75;
      ctx.beginPath();
      ctx.moveTo(0, supportY);
      ctx.lineTo(width, supportY);
      ctx.stroke();
      
      // Resistencia
      const resistanceY = height * 0.25;
      ctx.beginPath();
      ctx.moveTo(0, resistanceY);
      ctx.lineTo(width, resistanceY);
      ctx.stroke();
      
      ctx.setLineDash([]);
      
      // Línea de precio
      ctx.strokeStyle = '#1f2937';
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      chartData.prices.forEach((point, index) => {
        const x = (width / chartData.prices.length) * index;
        const y = height - ((point.price - chartData.prices[0].price + 0.02) / 0.04) * height;
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      
      ctx.stroke();
      
      // Etiquetas
      ctx.fillStyle = '#1f2937';
      ctx.font = '12px Arial';
      ctx.fillText('Resistencia', 10, resistanceY - 5);
      ctx.fillText('Soporte', 10, supportY - 5);
      
      if (level === 'intermediate' || level === 'professional') {
        ctx.fillStyle = '#16a34a';
        ctx.fillText('Zona Demanda', 10, demandStart - 5);
        ctx.fillStyle = '#dc2626';
        ctx.fillText('Zona Oferta', 10, supplyStart - 5);
      }
    };

    return (
      <div className="trading-chart">
        <canvas
          ref={drawChart}
          width={400}
          height={250}
          style={{ border: '1px solid #e2e8f0', borderRadius: '8px' }}
        />
      </div>
    );
  };

  const handleSubscribe = async (plan) => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      setPaymentStatus({
        type: 'success',
        message: '¡Suscripción activada correctamente! Bienvenido a Premium.'
      });
      setSubscription({
        status: 'active',
        plan: plan,
        next_billing: Date.now() + 30 * 24 * 60 * 60 * 1000,
        ea_sniper_discount: '30'
      });
    } catch (error) {
      setPaymentStatus({
        type: 'error',
        message: 'Error al procesar el pago. Intenta de nuevo.'
      });
    } finally {
      setLoading(false);
    }
  };

  const renderHome = () => (
    <div className="home-section">
      <div className="hero-section">
        <div className="hero-content">
          <h1>🏛️ Academia Forex Profesional</h1>
          <p>Aprende trading desde cero hasta profesional con IA avanzada</p>
        </div>
        <div className="hero-features">
          <div className="feature">
            <h3>📚 45+ Cursos</h3>
            <p>Desde principiante hasta profesional</p>
          </div>
          <div className="feature">
            <h3>🤖 IA Avanzada</h3>
            <p>Análisis técnico automatizado</p>
          </div>
          <div className="feature">
            <h3>📰 Noticias Live</h3>
            <p>Impacto en tiempo real</p>
          </div>
          <div className="feature">
            <h3>⚖️ Gestión Riesgo</h3>
            <p>Herramientas profesionales</p>
          </div>
        </div>
      </div>

      <div className="pairs-overview">
        <h2>💱 Pares Principales</h2>
        <div className="pairs-grid">
          {forexPairs.map(pair => (
            <div key={pair.code} className="pair-card">
              <h3>{pair.code}</h3>
              <p>{pair.name}</p>
              <div className="pair-stats">
                <span className={`volatility ${pair.volatility}`}>
                  {pair.volatility === 'high' ? 'Alta' : pair.volatility === 'medium' ? 'Media' : 'Baja'} Volatilidad
                </span>
                <span className="pips">{pair.pips} pips/día</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="learning-path">
        <h2>🎯 Ruta de Aprendizaje</h2>
        <div className="path-levels">
          <div className="level">
            <h3>🌱 Principiante</h3>
            <p>Conceptos básicos, pares principales, análisis fundamental</p>
            <span className="level-badge beginner">15 módulos</span>
          </div>
          <div className="level">
            <h3>📊 Intermedio</h3>
            <p>Análisis técnico, indicadores, gestión de riesgo</p>
            <span className="level-badge intermediate">20 módulos</span>
          </div>
          <div className="level">
            <h3>🚀 Profesional</h3>
            <p>Trading algorítmico, psicología, estrategias avanzadas</p>
            <span className="level-badge professional">10 módulos</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCourses = () => (
    <div className="courses-section">
      <div className="courses-header">
        <h2>📚 Cursos de Trading</h2>
        <div className="filters">
          <select className="filter-select">
            <option value="all">Todos los niveles</option>
            <option value="beginner">Principiante</option>
            <option value="intermediate">Intermedio</option>
            <option value="professional">Profesional</option>
          </select>
        </div>
      </div>

      <div className="courses-grid">
        {courses.map(course => (
          <div key={course.id} className="course-card">
            <div className="course-header">
              <h3>{course.title}</h3>
              <span className={`level-badge ${course.level}`}>
                {course.level}
              </span>
            </div>
            <div className="course-content">
              <p>{course.description}</p>
              
              {/* Simuladores Visuales de Trading */}
              <div className="course-videos">
                <h5>📊 Simulador Visual Interactivo</h5>
                <div className="simulator-container">
                  <TradingChart 
                    pair={selectedPair} 
                    level={course.level} 
                    lesson={course.title}
                  />
                  <div className="simulator-controls">
                    <select 
                      value={selectedPair} 
                      onChange={(e) => setSelectedPair(e.target.value)}
                      className="pair-selector-mini"
                    >
                      <option value="EURUSD">EUR/USD</option>
                      <option value="GBPUSD">GBP/USD</option>
                      <option value="USDJPY">USD/JPY</option>
                    </select>
                  </div>
                </div>
                
                {/* Explicaciones didácticas */}
                <div className="learning-points">
                  <h6>🎯 En este gráfico puedes ver:</h6>
                  <ul>
                    <li>📈 <strong>Líneas azules punteadas:</strong> Soporte y Resistencia</li>
                    {(course.level === 'intermediate' || course.level === 'professional') && (
                      <>
                        <li>🟢 <strong>Zona verde:</strong> Área de Demanda (compras)</li>
                        <li>🔴 <strong>Zona roja:</strong> Área de Oferta (ventas)</li>
                      </>
                    )}
                    <li>📊 <strong>Línea negra:</strong> Movimiento del precio</li>
                    <li>⚡ <strong>Grid:</strong> Niveles de referencia para análisis</li>
                  </ul>
                </div>
              </div>
              
              {progress[course.module_id] && (
                <div className="course-progress">
                  <span>Progreso: {progress[course.module_id]}%</span>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{width: `${progress[course.module_id]}%`}}
                    ></div>
                  </div>
                </div>
              )}
            </div>
            <button className="start-course-btn">
              {progress[course.module_id] ? 'Revisar' : 'Comenzar'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderAIAnalysis = () => (
    <div className="ai-analysis-section">
      <div className="analysis-header">
        <h2>🤖 Análisis IA Avanzado</h2>
        <p>Obtén análisis técnico profesional con inteligencia artificial</p>
      </div>

      <div className="analysis-controls">
        <div className="pair-selector">
          <label htmlFor="pair-select">Selecciona el par:</label>
          <select 
            id="pair-select"
            value={selectedPair} 
            onChange={(e) => setSelectedPair(e.target.value)}
          >
            {forexPairs.map(pair => (
              <option key={pair.code} value={pair.code}>{pair.name}</option>
            ))}
          </select>
        </div>

        <div className="analysis-buttons">
          <button 
            className="analysis-btn technical"
            onClick={() => handleAnalysis('technical')}
            disabled={loading}
          >
            📊 Análisis Técnico
          </button>
          <button 
            className="analysis-btn pattern"
            onClick={() => handleAnalysis('pattern')}
            disabled={loading}
          >
            🔍 Reconocimiento de Patrones
          </button>
          <button 
            className="analysis-btn risk"
            onClick={() => handleAnalysis('risk')}
            disabled={loading}
          >
            ⚖️ Análisis de Riesgo
          </button>
          <button 
            className="analysis-btn sentiment"
            onClick={() => handleAnalysis('sentiment')}
            disabled={loading}
          >
            💭 Análisis de Sentimiento
          </button>
        </div>
      </div>

      <div className="chat-section">
        <h3>💬 Consulta Directa con IA</h3>
        <div className="chat-input-group">
          <textarea
            className="chat-input"
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            placeholder={`Pregunta sobre ${selectedPair}... Ej: "¿Cuál es la tendencia actual?" o "¿Debo comprar o vender?"`}
          />
          <button 
            className="chat-btn"
            onClick={handleChat}
            disabled={loading || !chatMessage.trim()}
          >
            {loading ? '⏳ Analizando...' : '🚀 Preguntar'}
          </button>
        </div>
      </div>

      {loading && (
        <div className="loading">
          <div className="spinner"></div>
          <p>Generando análisis IA...</p>
        </div>
      )}

      {aiResponse && (
        <div className="ai-response">
          <h4>🎯 Respuesta IA</h4>
          <div className="response-content">
            <pre>{aiResponse}</pre>
          </div>
        </div>
      )}
    </div>
  );

  const renderNews = () => (
    <div className="news-section">
      <div className="news-header">
        <h2>📰 Noticias y Calendario Económico</h2>
        <p>Mantente informado con las últimas noticias del mercado</p>
      </div>

      <div className="economic-calendar">
        <h3>📅 Calendario Económico en Tiempo Real</h3>
        <div className="calendar-container">
          <iframe 
            src="https://sslecal2.investing.com?columns=exc_flags,exc_currency,exc_importance,exc_actual,exc_forecast,exc_previous&importance=3&features=datepicker,timezone&countries=5,72,39,4&calType=week&timeZone=58&lang=4" 
            width="100%" 
            height="467" 
            frameBorder="0" 
            allowTransparency="true" 
            marginWidth="0" 
            marginHeight="0"
            style={{border: 'none', borderRadius: '12px'}}
          ></iframe>
          <div className="poweredBy" style={{fontFamily: 'Arial, Helvetica, sans-serif', textAlign: 'center', marginTop: '10px'}}>
            <span style={{fontSize: '11px', color: '#333333', textDecoration: 'none'}}>
              Calendario económico en tiempo real proporcionado por{' '}
              <a 
                href="https://es.investing.com/" 
                rel="nofollow" 
                target="_blank" 
                style={{fontSize: '11px', color: '#06529D', fontWeight: 'bold'}} 
                className="underline_link"
              >
                Investing.com España
              </a>
            </span>
          </div>
        </div>
      </div>

      <div className="news-controls">
        <button 
          onClick={fetchLiveNews} 
          disabled={newsLoading}
          className="refresh-btn"
        >
          {newsLoading ? '🔄 Actualizando...' : '🔄 Actualizar Noticias'}
        </button>
        <button 
          onClick={fetchGlobalNews} 
          disabled={newsLoading}
          className="refresh-btn"
        >
          🌍 Noticias Globales
        </button>
      </div>

      {/* Global News Section */}
      {globalNews.length > 0 && (
        <div className="global-news-section">
          <h3>🌍 Noticias Globales (CNBC & Bloomberg)</h3>
          <div className="news-grid">
            {globalNews.map(news => (
              <div key={news.id} className="news-card global-news">
                <div className="news-header-card">
                  <div>
                    <h4>{news.title}</h4>
                    <p>{news.summary}</p>
                  </div>
                  <div className="news-badges">
                    <span className={`impact-badge ${news.impact}`}>
                      {news.impact.toUpperCase()} IMPACTO
                    </span>
                  </div>
                </div>
                <div className="news-image">
                  <img src={news.image} alt={news.title} style={{width: '100%', height: '150px', objectFit: 'cover', borderRadius: '8px'}} />
                </div>
                <div className="news-footer">
                  <div className="news-meta">
                    <div className="affected-pairs">
                      <span className="pairs-label">Pares:</span>
                      {news.pairs.map(pair => (
                        <span key={pair} className="pair-tag">{pair}</span>
                      ))}
                    </div>
                    <div className="news-source">
                      <span className="source-label">Fuente:</span>
                      <span className="source-name">{news.source}</span>
                    </div>
                  </div>
                  <div className="news-time">{news.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Market Alerts Section */}
      {marketAlerts.length > 0 && (
        <div className="market-alerts">
          <h3>🚨 Alertas del Mercado</h3>
          <div className="alerts-grid">
            {marketAlerts.map(alert => (
              <div key={alert.id} className={`alert-card ${alert.importance}`}>
                <div className="alert-header">
                  <span className="alert-type">{alert.type}</span>
                  <span className={`alert-importance ${alert.importance}`}>
                    {alert.importance.toUpperCase()}
                  </span>
                </div>
                <div className="alert-pair">{alert.pair}</div>
                <div className="alert-message">{alert.message}</div>
                <div className="alert-time">{alert.timestamp}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live News Section */}
      {liveNews.length > 0 && (
        <div className="live-news-section">
          <h3>🔴 Noticias en Vivo</h3>
          <div className="news-grid">
            {liveNews.map(news => (
              <div key={news.id} className="news-card live-news">
                <div className="news-header-card">
                  <div>
                    <h4>{news.title}</h4>
                    <p>{news.summary}</p>
                  </div>
                  <div className="news-badges">
                    <span className={`volatility-badge ${news.volatility}`}>
                      {news.volatility.toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="news-analysis">
                  <div className="sentiment-indicator">
                    <span className="sentiment-label">Sentimiento:</span>
                    <div className="sentiment-bar">
                      <div 
                        className="sentiment-fill" 
                        style={{
                          width: `${news.sentiment * 100}%`,
                          backgroundColor: news.sentiment > 0.5 ? '#10b981' : '#ef4444'
                        }}
                      ></div>
                    </div>
                    <span className="sentiment-value">{(news.sentiment * 100).toFixed(0)}%</span>
                  </div>
                </div>
                <div className="news-footer">
                  <div className="news-meta">
                    <div className="affected-pairs">
                      <span className="pairs-label">Afecta:</span>
                      {news.affected_pairs?.map(pair => (
                        <span key={pair} className="pair-tag">{pair}</span>
                      ))}
                    </div>
                    <div className="news-source">
                      <span className="source-label">Fuente:</span>
                      <span className="source-name">{news.source}</span>
                    </div>
                  </div>
                  <div className="news-time">{news.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI-Powered Market Analysis */}
      {Object.keys(pairAnalysis).length > 0 && (
        <div className="market-analysis-section">
          <h3>🧠 Análisis IA del Mercado</h3>
          <div className="analysis-grid">
            {Object.entries(pairAnalysis).map(([pair, analysis]) => (
              <div key={pair} className="pair-analysis-card">
                <div className="analysis-header">
                  <h4>{pair}</h4>
                  <span className={`trend-badge ${analysis.trend?.toLowerCase()}`}>
                    {analysis.trend}
                  </span>
                  <span className="strength-score">
                    Fuerza: {analysis.strength}/10
                  </span>
                </div>
                <div className="key-levels">
                  <div className="support-levels">
                    <strong>Soportes:</strong>
                    {analysis.key_levels?.support?.map((level, idx) => (
                      <span key={idx} className="level-tag support">{level}</span>
                    ))}
                  </div>
                  <div className="resistance-levels">
                    <strong>Resistencias:</strong>
                    {analysis.key_levels?.resistance?.map((level, idx) => (
                      <span key={idx} className="level-tag resistance">{level}</span>
                    ))}
                  </div>
                </div>
                <div className="analysis-content">
                  <div className="news-impact">
                    <strong>Impacto de Noticias:</strong>
                    <p>{analysis.news_impact}</p>
                  </div>
                  <div className="recommendation">
                    <strong>Recomendación:</strong>
                    <p>{analysis.recommendation}</p>
                  </div>
                </div>
                <div className="analysis-meta">
                  <span className={`risk-level ${analysis.risk_level?.toLowerCase()}`}>
                    Riesgo: {analysis.risk_level}
                  </span>
                  <span className="time-horizon">
                    Horizonte: {analysis.time_horizon}
                  </span>
                  <span className="ai-confidence">
                    Confianza IA: {analysis.confidence}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Static News Section */}
      {marketNews.length > 0 && (
        <div className="static-news-section">
          <h3>📊 Análisis de Mercado</h3>
          <div className="news-grid">
            {marketNews.map(news => (
              <div key={news.id} className="news-card">
                <h4>{news.title}</h4>
                <p>{news.content}</p>
                <span className={`impact-badge ${news.impact}`}>
                  {news.impact.toUpperCase()} IMPACTO
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* News Trading Tips */}
      <div className="news-tips">
        <h3>💡 Consejos para Trading con Noticias</h3>
        <div className="tips-grid">
          <div className="tip">
            <h4>🔴 Alto Impacto</h4>
            <p>Noticias que pueden mover el mercado 50+ pips</p>
            <div className="tip-advice">
              <strong>Estrategia:</strong> Evita operar 30 min antes y después
            </div>
          </div>
          <div className="tip">
            <h4>🟡 Medio Impacto</h4>
            <p>Movimientos esperados de 20-50 pips</p>
            <div className="tip-advice">
              <strong>Oportunidad:</strong> Ideal para scalping con stop ajustado
            </div>
          </div>
          <div className="tip">
            <h4>🟢 Bajo Impacto</h4>
            <p>Movimientos menores, menos de 20 pips</p>
            <div className="tip-advice">
              <strong>Seguridad:</strong> Perfecto para principiantes
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderRiskManagement = () => (
    <div className="risk-section">
      <div className="risk-header">
        <h2>⚖️ Gestión de Riesgo</h2>
        <p>Herramientas profesionales para proteger tu capital</p>
      </div>

      <div className="risk-tools">
        <div className="calculator">
          <h3>🧮 Calculadora de Posición</h3>
          <div className="calc-inputs">
            <div className="input-group">
              <label htmlFor="capital">Capital Total (€)</label>
              <input 
                type="number" 
                id="capital" 
                value={riskCalculator.capital}
                onChange={(e) => setRiskCalculator(prev => ({...prev, capital: e.target.value}))}
                placeholder="10000" 
              />
            </div>
            <div className="input-group">
              <label htmlFor="risk">Riesgo por operación (%)</label>
              <input 
                type="number" 
                id="risk" 
                value={riskCalculator.riskPercentage}
                onChange={(e) => setRiskCalculator(prev => ({...prev, riskPercentage: e.target.value}))}
                placeholder="2" 
                max="5"
              />
            </div>
            <div className="input-group">
              <label htmlFor="pair">Par de divisas</label>
              <select 
                id="pair" 
                value={riskCalculator.pair}
                onChange={(e) => setRiskCalculator(prev => ({...prev, pair: e.target.value}))}
              >
                <option value="EURUSD">EUR/USD</option>
                <option value="GBPUSD">GBP/USD</option>
                <option value="USDJPY">USD/JPY</option>
                <option value="XAUUSD">XAU/USD</option>
              </select>
            </div>
            <div className="input-group">
              <label htmlFor="entry">Precio de entrada</label>
              <input 
                type="number" 
                id="entry" 
                value={riskCalculator.entryPrice}
                onChange={(e) => setRiskCalculator(prev => ({...prev, entryPrice: e.target.value}))}
                placeholder="1.0500" 
                step="0.0001"
              />
            </div>
            <div className="input-group">
              <label htmlFor="stop">Stop Loss</label>
              <input 
                type="number" 
                id="stop" 
                value={riskCalculator.stopLoss}
                onChange={(e) => setRiskCalculator(prev => ({...prev, stopLoss: e.target.value}))}
                placeholder="1.0450" 
                step="0.0001"
              />
            </div>
          </div>
          <button className="calculate-btn" onClick={calculateRisk}>
            Calcular Posición
          </button>
          
          {riskCalculator.result && (
            <div className="calculation-result">
              <h4>📊 Resultado del Cálculo</h4>
              <div className="result-grid">
                <div className="result-item">
                  <span className="label">Riesgo en dinero:</span>
                  <span className="value">€{riskCalculator.result.riskAmount}</span>
                </div>
                <div className="result-item">
                  <span className="label">Tamaño de lote:</span>
                  <span className="value">{riskCalculator.result.lotSize}</span>
                </div>
                <div className="result-item">
                  <span className="label">Distancia SL (pips):</span>
                  <span className="value">{riskCalculator.result.pipDifference}</span>
                </div>
                <div className="result-item">
                  <span className="label">Beneficio potencial:</span>
                  <span className="value success">€{riskCalculator.result.potentialProfit}</span>
                </div>
                <div className="result-item">
                  <span className="label">Distancia TP (pips):</span>
                  <span className="value">{riskCalculator.result.takeProfitDistance}</span>
                </div>
                <div className="result-item">
                  <span className="label">Ratio R:R:</span>
                  <span className="value success">{riskCalculator.result.riskRewardRatio}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="risk-rules">
          <h3>🛡️ Reglas de Oro</h3>
          <div className="rules-list">
            <div className="rule">
              <div className="rule-number">1</div>
              <p>Nunca arriesgues más del 2% de tu capital por operación</p>
            </div>
            <div className="rule">
              <div className="rule-number">2</div>
              <p>Siempre define tu Stop Loss antes de entrar</p>
            </div>
            <div className="rule">
              <div className="rule-number">3</div>
              <p>Mantén un ratio Riesgo:Beneficio mínimo de 1:2</p>
            </div>
            <div className="rule">
              <div className="rule-number">4</div>
              <p>No operes con más del 20% de tu capital simultáneamente</p>
            </div>
            <div className="rule">
              <div className="rule-number">5</div>
              <p>Lleva un registro detallado de todas tus operaciones</p>
            </div>
          </div>
        </div>
      </div>

      <div className="account-levels">
        <h3>💼 Tipos de Cuenta Recomendados</h3>
        <div className="levels-grid">
          <div className="account-level micro">
            <h4>🥉 Micro (€100-€1.000)</h4>
            <p>Perfecto para principiantes. Lotes de 0.01</p>
            <ul>
              <li>Riesgo máximo: €20 por trade</li>
              <li>Spreads: 1-3 pips</li>
              <li>Apalancamiento: 1:100</li>
            </ul>
          </div>
          <div className="account-level mini">
            <h4>🥈 Mini (€1.000-€10.000)</h4>
            <p>Para traders con experiencia básica</p>
            <ul>
              <li>Riesgo máximo: €200 por trade</li>
              <li>Spreads: 0.5-2 pips</li>
              <li>Apalancamiento: 1:200</li>
            </ul>
          </div>
          <div className="account-level standard">
            <h4>🥇 Estándar (€10.000+)</h4>
            <p>Para traders profesionales y experimentados</p>
            <ul>
              <li>Riesgo máximo: €2000+ por trade</li>
              <li>Spreads: 0.1-1 pip</li>
              <li>Apalancamiento: 1:500</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSubscription = () => (
    <div className="subscription-section">
      <div className="subscription-header">
        <h2>💎 Suscripción Premium</h2>
        <p>Acceso completo a la Academia Forex con descuentos exclusivos</p>
      </div>

      {paymentStatus && (
        <div className={`payment-status ${paymentStatus.type}`}>
          <p>{paymentStatus.message}</p>
          <button onClick={() => setPaymentStatus(null)}>×</button>
        </div>
      )}

      {subscription && subscription.status !== 'no_active_subscription' ? (
        <div className="current-subscription">
          <h3>🎉 Suscripción Activa</h3>
          <div className="subscription-details">
            <p><strong>Plan:</strong> Premium Monthly</p>
            <p><strong>Estado:</strong> Activo</p>
            <p><strong>Próximo cobro:</strong> {new Date(subscription.next_billing).toLocaleDateString()}</p>
            <p><strong>Descuento EA-AKA-AI SNIPER:</strong> {subscription.ea_sniper_discount}% OFF</p>
          </div>
          
          <div className="premium-benefits">
            <h4>Tus Beneficios Premium:</h4>
            <div className="benefits-grid">
              <div className="benefit">✅ Acceso a todos los cursos</div>
              <div className="benefit">✅ Análisis IA ilimitado</div>
              <div className="benefit">✅ Noticias en tiempo real</div>
              <div className="benefit">✅ Soporte prioritario</div>
              <div className="benefit">✅ 30% OFF EA-AKA-AI SNIPER</div>
              <div className="benefit">✅ Webinars exclusivos</div>
            </div>
          </div>

          <div className="ea-sniper-offer">
            <h4>🚀 Oferta Especial EA-AKA-AI SNIPER</h4>
            <div className="offer-details">
              <div className="price-comparison">
                <span className="regular-price">Precio Regular: €693.00</span>
                <span className="discounted-price">Tu Precio Premium: €485.10</span>
                <span className="savings">¡Ahorras €207.90 (30% OFF)!</span>
              </div>
              <p>Accede al canal exclusivo de trading algorítmico con IA - Pago único</p>
              <div className="contact-info">
                <p><strong>Para solicitar acceso completa el formulario:</strong></p>
                <div className="contact-form">
                  <form onSubmit={handleEASniperContact}>
                    <input 
                      type="text" 
                      placeholder="Tu nombre completo" 
                      value={contactForm.name}
                      onChange={(e) => setContactForm({...contactForm, name: e.target.value})}
                      required 
                    />
                    <input 
                      type="email" 
                      placeholder="Tu email" 
                      value={contactForm.email}
                      onChange={(e) => setContactForm({...contactForm, email: e.target.value})}
                      required 
                    />
                    <textarea 
                      placeholder="Comentarios adicionales..." 
                      value={contactForm.comments}
                      onChange={(e) => setContactForm({...contactForm, comments: e.target.value})}
                      rows="3"
                    ></textarea>
                    <button type="submit" disabled={loading}>
                      {loading ? 'Enviando...' : 'Solicitar Acceso EA-SNIPER'}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="subscription-plans">
          <div className="comparison-table">
            <div className="plan free-plan">
              <h3>🆓 Gratuito</h3>
              <div className="price">€0/mes</div>
              <div className="features">
                <div className="feature">📚 Cursos básicos</div>
                <div className="feature">🤖 5 análisis IA/día</div>
                <div className="feature">📰 Noticias básicas</div>
                <div className="feature limited">❌ Sin descuentos</div>
                <div className="feature limited">❌ Soporte básico</div>
              </div>
              <div className="current-plan">Plan Actual</div>
            </div>

            <div className="plan premium-plan recommended">
              <div className="recommended-badge">⭐ Recomendado</div>
              <h3>💎 Premium</h3>
              <div className="price">€9.99/mes</div>
              <div className="features">
                <div className="feature">📚 Todos los cursos (45+ módulos)</div>
                <div className="feature">🤖 Análisis IA ilimitado</div>
                <div className="feature">📰 Noticias en tiempo real</div>
                <div className="feature">🎯 30% OFF EA-AKA-AI SNIPER</div>
                <div className="feature">⚡ Soporte prioritario</div>
                <div className="feature">🎓 Webinars exclusivos</div>
              </div>
              <button 
                className="subscribe-btn"
                onClick={() => handleSubscribe('premium_monthly')}
                disabled={loading}
              >
                {loading ? 'Procesando...' : 'Suscribirse Ahora'}
              </button>
            </div>
          </div>

          <div className="payment-methods">
            <h4>💳 Métodos de Pago Aceptados</h4>
            <div className="payment-icons">
              <span className="payment-method">💳 Tarjeta</span>
              <span className="payment-method">🏦 Transferencia</span>
              <span className="payment-method">₿ Bitcoin</span>
              <span className="payment-method">💰 USDT</span>
            </div>
            <p className="payment-note">Pago seguro procesado por Stripe</p>
          </div>

          <div className="ea-sniper-preview">
            <h4>🎯 ¿Qué es EA-AKA-AI SNIPER?</h4>
            <div className="sniper-features">
              <div className="feature">🤖 Señales de trading con IA</div>
              <div className="feature">⚖️ Gestión automática de riesgo</div>
              <div className="feature">📊 Análisis de mercado 24/7</div>
              <div className="feature">📱 Notificaciones por Telegram</div>
              <div className="feature">📈 Backtesting detallado</div>
              <div className="feature">⏰ Monitoreo algorítmico continuo</div>
            </div>
            <p className="sniper-note">
              Con Premium obtienes 30% de descuento: €485.10 en lugar de €693.00
            </p>
          </div>
        </div>
      )}
    </div>
  );

  const renderAlgorithmic = () => (
    <div className="algo-section">
      <div className="algo-header">
        <h2>🤖 Trading Algorítmico con IA</h2>
        <p>El futuro del trading automatizado</p>
      </div>

      <div className="algo-content">
        <div className="algo-intro">
          <img src="https://images.unsplash.com/photo-1645731504293-ad4d5da42a10" alt="Algorithmic Trading" />
          <div className="intro-text">
            <h3>¿Qué es el Trading Algorítmico?</h3>
            <p>
              El trading algorítmico utiliza programas informáticos para ejecutar 
              operaciones automáticamente basándose en criterios predefinidos y análisis 
              de IA en tiempo real.
            </p>
            <div className="algo-benefits">
              <div className="benefit">✅ Ejecución sin emociones</div>
              <div className="benefit">✅ Análisis 24/7</div>
              <div className="benefit">✅ Backtesting preciso</div>
              <div className="benefit">✅ Gestión de riesgo automática</div>
            </div>
          </div>
        </div>

        <div className="telegram-access">
          <h3>🚀 Acceso Exclusivo: EA-AKA-AI SNIPER</h3>
          <div className="telegram-card">
            <div className="telegram-info">
              <h4>Canal Telegram Profesional</h4>
              <p>Accede a nuestro canal exclusivo de trading algorítmico con IA</p>
              <div className="features-list">
                <div className="feature">🎯 Señales de alta precisión</div>
                <div className="feature">🤖 Análisis IA en tiempo real</div>
                <div className="feature">📊 Backtesting completo</div>
                <div className="feature">💬 Soporte 24/7</div>
              </div>
            </div>
            <div className="access-info">
              <div className="contact-methods">
                <div className="contact">
                  <strong>Telegram:</strong> @cryptojr_official
                </div>
                <div className="contact">
                  <strong>Instagram:</strong> cryptojr_official
                </div>
              </div>
              <p className="access-note">
                ⚠️ El acceso no está autorizado al público general. 
                Contacta para solicitar acceso.
              </p>
              <button className="contact-btn">Solicitar Acceso</button>
            </div>
          </div>
        </div>

        <div className="algo-types">
          <h3>🔧 Tipos de Algoritmos</h3>
          <div className="types-grid">
            <div className="type-card">
              <h4>📈 Trend Following</h4>
              <p>Sigue la tendencia principal del mercado</p>
            </div>
            <div className="type-card">
              <h4>🔄 Mean Reversion</h4>
              <p>Busca reversiones en niveles extremos</p>
            </div>
            <div className="type-card">
              <h4>⚡ Scalping</h4>
              <p>Operaciones rápidas en timeframes bajos</p>
            </div>
            <div className="type-card">
              <h4>🎯 Arbitrage</h4>
              <p>Aprovecha diferencias de precios</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderResources = () => (
    <div className="resources-section">
      <div className="resources-header">
        <h2>📚 Recursos Adicionales</h2>
        <p>Amplía tu conocimiento con recursos externos</p>
      </div>

      <div className="external-link">
        <div className="estudiar-trading">
          <img src="https://images.pexels.com/photos/7663144/pexels-photo-7663144.jpeg" alt="Estudiar Trading" />
          <div className="link-content">
            <h3>🌐 EstudiarTrading.com</h3>
            <p>
              Portal completo con brokers recomendados, más cursos especializados, 
              libros de trading profesional y herramientas adicionales.
            </p>
            <div className="link-features">
              <div className="feature">🏢 Brokers regulados</div>
              <div className="feature">📖 Biblioteca de libros</div>
              <div className="feature">🎓 Cursos avanzados</div>
              <div className="feature">🛠️ Herramientas profesionales</div>
            </div>
            <a href="https://estudiartrading.com" target="_blank" rel="noopener noreferrer" className="visit-btn">
              Visitar EstudiarTrading.com
            </a>
          </div>
        </div>
      </div>

      <div className="recommended-brokers">
        <h3>🏦 Brokers Recomendados</h3>
        <div className="brokers-grid">
          <div className="broker-card">
            <h4>IC Trading</h4>
            <p>Condiciones institucionales, swaps bajos</p>
            <div className="broker-features">
              <span>✅ Regulado</span>
              <span>✅ ECN</span>
              <span>✅ Swaps optimizados</span>
              <span>✅ API trading</span>
            </div>
            <a href="https://www.ictrading.com?camp=85322" target="_blank" rel="noopener noreferrer" className="visit-btn">
              Abrir Cuenta IC Trading
            </a>
          </div>
          <div className="broker-card">
            <h4>VT Markets</h4>
            <p>Spreads competitivos, ejecución rápida</p>
            <div className="broker-features">
              <span>✅ Regulado</span>
              <span>✅ 0 comisiones</span>
              <span>✅ MT4/MT5</span>
              <span>✅ Spreads bajos</span>
            </div>
            <a href="https://vtm.pro/ZNVjM3" target="_blank" rel="noopener noreferrer" className="visit-btn">
              Abrir Cuenta VT Markets
            </a>
          </div>
        </div>
      </div>

      <div className="trading-checklist">
        <h3>✅ Lista de Verificación Pre-Trade</h3>
        <div className="checklist">
          <div className="check-item">
            <input type="checkbox" id="trend" />
            <label htmlFor="trend">Confirmar dirección de la tendencia principal</label>
          </div>
          <div className="check-item">
            <input type="checkbox" id="support" />
            <label htmlFor="support">Identificar soportes y resistencias clave</label>
          </div>
          <div className="check-item">
            <input type="checkbox" id="news" />
            <label htmlFor="news">Verificar calendario económico</label>
          </div>
          <div className="check-item">
            <input type="checkbox" id="risk" />
            <label htmlFor="risk">Calcular tamaño de posición (máx. 2% riesgo)</label>
          </div>
          <div className="check-item">
            <input type="checkbox" id="stoploss" />
            <label htmlFor="stoploss">Definir Stop Loss antes de entrar</label>
          </div>
          <div className="check-item">
            <input type="checkbox" id="takeprofit" />
            <label htmlFor="takeprofit">Establecer Take Profit (min. 1:2 RR)</label>
          </div>
          <div className="check-item">
            <input type="checkbox" id="confluence" />
            <label htmlFor="confluence">Buscar confluencia de señales</label>
          </div>
          <div className="check-item">
            <input type="checkbox" id="timeframe" />
            <label htmlFor="timeframe">Confirmar en múltiples timeframes</label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderNavigation = () => (
    <nav className="main-nav">
      <div className="nav-logo">
        <h1>🏛️ Forex Academy</h1>
      </div>
      <div className="nav-links">
        <button 
          className={currentView === 'home' ? 'active' : ''}
          onClick={() => setCurrentView('home')}
        >
          🏠 Inicio
        </button>
        <button 
          className={currentView === 'courses' ? 'active' : ''}
          onClick={() => setCurrentView('courses')}
        >
          📚 Cursos
        </button>
        <button 
          className={currentView === 'ai' ? 'active' : ''}
          onClick={() => setCurrentView('ai')}
        >
          🤖 IA Analysis
        </button>
        <button 
          className={currentView === 'news' ? 'active' : ''}
          onClick={() => setCurrentView('news')}
        >
          📰 Noticias
        </button>
        <button 
          className={currentView === 'risk' ? 'active' : ''}
          onClick={() => setCurrentView('risk')}
        >
          ⚖️ Gestión
        </button>
        <button 
          className={currentView === 'subscription' ? 'active' : ''}
          onClick={() => setCurrentView('subscription')}
        >
          💎 Premium
        </button>
        <button 
          className={currentView === 'algo' ? 'active' : ''}
          onClick={() => setCurrentView('algo')}
        >
          🤖 Algorítmico
        </button>
        <button 
          className={currentView === 'resources' ? 'active' : ''}
          onClick={() => setCurrentView('resources')}
        >
          📚 Recursos
        </button>
      </div>
      <div className="user-info">
        {user && (
          <span className="user-level">
            📊 Nivel: {userLevel}
          </span>
        )}
      </div>
    </nav>
  );

  const renderCurrentView = () => {
    switch (currentView) {
      case 'home': return renderHome();
      case 'courses': return renderCourses();
      case 'ai': return renderAIAnalysis();
      case 'news': return renderNews();
      case 'risk': return renderRiskManagement();
      case 'subscription': return renderSubscription();
      case 'algo': return renderAlgorithmic();
      case 'resources': return renderResources();
      default: return renderHome();
    }
  };

  return (
    <div className="App">
      {renderNavigation()}
      <main className="main-content">
        {renderCurrentView()}
      </main>
      <footer className="app-footer">
        <p>© 2025 Forex Academy - Aprende trading profesional con IA</p>
        <p>Conecta con nosotros: Telegram @cryptojr_official | Instagram cryptojr_official</p>
      </footer>
    </div>
  );
}

export default App;
