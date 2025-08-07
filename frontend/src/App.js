import React, { useState, useEffect } from 'react';
import './App.css';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

function App() {
  const [currentView, setCurrentView] = useState('home');
  const [user, setUser] = useState(null);
  const [courses, setCourses] = useState([]);
  const [selectedPair, setSelectedPair] = useState('EURUSD');
  const [userLevel, setUserLevel] = useState('beginner');
  const [loading, setLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [chatMessage, setChatMessage] = useState('');
  const [marketNews, setMarketNews] = useState([]);
  const [progress, setProgress] = useState({});
  const [subscription, setSubscription] = useState(null);
  const [subscriptionPlans, setSubscriptionPlans] = useState({});
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [liveNews, setLiveNews] = useState([]);
  const [marketAlerts, setMarketAlerts] = useState([]);
  const [pairAnalysis, setPairAnalysis] = useState({});
  const [newsLoading, setNewsLoading] = useState(false);

  const forexPairs = [
    { code: 'EURUSD', name: 'Euro/US Dollar', volatility: 'Low', pips: '0.8-1.2' },
    { code: 'GBPJPY', name: 'British Pound/Japanese Yen', volatility: 'High', pips: '1.5-2.5' },
    { code: 'XAUUSD', name: 'Gold/US Dollar', volatility: 'Medium', pips: '1.0-2.0' }
  ];

  useEffect(() => {
    fetchCourses();
    fetchMarketNews();
    fetchLiveNews();
    fetchMarketAlerts();
    initializeUser();
    fetchSubscriptionPlans();
    checkPaymentReturn();
    
    // Fetch analysis for all pairs
    forexPairs.forEach(pair => {
      fetchPairAnalysis(pair.code);
    });

    // Set up auto-refresh for live news and alerts every 5 minutes
    const newsInterval = setInterval(() => {
      fetchLiveNews();
      fetchMarketAlerts();
    }, 5 * 60 * 1000);

    return () => clearInterval(newsInterval);
  }, []);
  const checkPaymentReturn = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    const paymentSuccess = urlParams.get('payment_success');
    const paymentCancelled = urlParams.get('payment_cancelled');

    if (sessionId && paymentSuccess) {
      pollPaymentStatus(sessionId);
    } else if (paymentCancelled) {
      setPaymentStatus({ type: 'cancelled', message: 'Pago cancelado. Puedes intentarlo de nuevo.' });
    }
  };

  const pollPaymentStatus = async (sessionId, attempts = 0) => {
    const maxAttempts = 5;
    if (attempts >= maxAttempts) {
      setPaymentStatus({ type: 'error', message: 'No se pudo verificar el pago. Contacta soporte.' });
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/payment/status/${sessionId}`);
      const data = await response.json();

      if (data.payment_status === 'paid') {
        setPaymentStatus({ type: 'success', message: '¡Pago exitoso! Bienvenido a Premium.' });
        fetchUserSubscription();
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (data.status === 'expired') {
        setPaymentStatus({ type: 'error', message: 'Sesión de pago expirada.' });
      } else {
        setTimeout(() => pollPaymentStatus(sessionId, attempts + 1), 2000);
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      setPaymentStatus({ type: 'error', message: 'Error verificando pago.' });
    }
  };

  const fetchSubscriptionPlans = async () => {
    try {
      const response = await fetch(`${API_URL}/api/subscription/plans`);
      const data = await response.json();
      setSubscriptionPlans(data.plans);
    } catch (error) {
      console.error('Error fetching subscription plans:', error);
    }
  };

  const fetchUserSubscription = async (userData = null) => {
    const userToUse = userData || user;
    if (userToUse?.user_id) {
      try {
        const response = await fetch(`${API_URL}/api/user/${userToUse.user_id}/subscription`);
        const data = await response.json();
        setSubscription(data);
      } catch (error) {
        console.error('Error fetching subscription:', error);
      }
    }
  };

  const handleSubscribe = async (planId) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/subscription/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: planId,
          origin_url: window.location.origin
        })
      });

      const data = await response.json();
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      }
    } catch (error) {
      console.error('Error creating subscription:', error);
      setPaymentStatus({ type: 'error', message: 'Error creando suscripción' });
    } finally {
      setLoading(false);
    }
  };

  const initializeUser = async () => {
    // Check if user exists in localStorage, otherwise create new user
    let userId = localStorage.getItem('forex_user_id');
    if (!userId) {
      const newUser = {
        name: 'Trader Student',
        email: 'student@forexeducation.com',
        level: userLevel
      };
      
      try {
        const response = await fetch(`${API_URL}/api/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newUser)
        });
        const result = await response.json();
        userId = result.user_id;
        localStorage.setItem('forex_user_id', userId);
      } catch (error) {
        console.error('Error creating user:', error);
        return;
      }
    }
    
    try {
      const response = await fetch(`${API_URL}/api/users/${userId}`);
      const userData = await response.json();
      setUser(userData);
      // Fetch user subscription after setting user
      fetchUserSubscription(userData);
    } catch (error) {
      console.error('Error fetching user:', error);
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
    } catch (error) {
      console.error('Error fetching live news:', error);
    } finally {
      setNewsLoading(false);
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

  const fetchPairAnalysis = async (pair) => {
    try {
      const response = await fetch(`${API_URL}/api/market/analysis/${pair}`);
      const data = await response.json();
      setPairAnalysis(prev => ({ ...prev, [pair]: data }));
    } catch (error) {
      console.error(`Error fetching analysis for ${pair}:`, error);
    }
  };

  const handleAiAnalysis = async (analysisType) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/ai/analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pair: selectedPair,
          analysis_type: analysisType,
          user_level: userLevel
        })
      });
      const result = await response.json();
      setAiResponse(result.analysis.combined_insights || 'Análisis generado exitosamente');
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
      const result = await response.json();
      setAiResponse(result.response);
      setChatMessage('');
    } catch (error) {
      console.error('Error in chat:', error);
      setAiResponse('Error en la consulta. Por favor, intenta de nuevo.');
    }
    setLoading(false);
  };

  const renderHome = () => (
    <div className="home-section">
      <div className="hero-section">
        <div className="hero-content">
          <h1>Academia Forex Profesional</h1>
          <p>Aprende trading de forex desde cero hasta profesional con IA avanzada</p>
          <div className="hero-features">
            <div className="feature">
              <h3>🎯 Pares Principales</h3>
              <p>XAUUSD, GBPJPY, EURUSD</p>
            </div>
            <div className="feature">
              <h3>🤖 IA Múltiple</h3>
              <p>OpenAI + Gemini</p>
            </div>
            <div className="feature">
              <h3>📈 Análisis Real</h3>
              <p>Datos históricos reales</p>
            </div>
          </div>
        </div>
        <div className="hero-image">
          <img src="https://images.unsplash.com/photo-1639768939489-025b90ba9f23" alt="Forex Trading" />
        </div>
      </div>

      <div className="pairs-overview">
        <h2>Pares de Trading Principales</h2>
        <div className="pairs-grid">
          {forexPairs.map(pair => (
            <div key={pair.code} className="pair-card">
              <h3>{pair.code}</h3>
              <p>{pair.name}</p>
              <div className="pair-stats">
                <span className={`volatility ${pair.volatility.toLowerCase()}`}>
                  {pair.volatility} Volatilidad
                </span>
                <span className="pips">{pair.pips} pips/día</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="learning-path">
        <h2>Tu Ruta de Aprendizaje</h2>
        <div className="path-levels">
          <div className="level beginner">
            <h3>🌱 Principiante</h3>
            <p>Fundamentos básicos del forex</p>
            <ul>
              <li>Introducción al trading</li>
              <li>Lectura de gráficos</li>
              <li>Gestión de riesgo básica</li>
            </ul>
          </div>
          <div className="level intermediate">
            <h3>📊 Intermedio</h3>
            <p>Análisis técnico avanzado</p>
            <ul>
              <li>Indicadores técnicos</li>
              <li>Patrones de precio</li>
              <li>Fibonacci y canales</li>
            </ul>
          </div>
          <div className="level professional">
            <h3>🏆 Profesional</h3>
            <p>Estrategias institucionales</p>
            <ul>
              <li>Zonas de oferta/demanda</li>
              <li>Psicología del trading</li>
              <li>Trading algorítmico</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCourses = () => {
    const filteredCourses = courses.filter(course => 
      course.level === userLevel && course.pair === selectedPair
    );

    return (
      <div className="courses-section">
        <div className="courses-header">
          <h2>Cursos de Trading</h2>
          <div className="filters">
            <select 
              value={selectedPair} 
              onChange={(e) => setSelectedPair(e.target.value)}
              className="filter-select"
            >
              {forexPairs.map(pair => (
                <option key={pair.code} value={pair.code}>{pair.code}</option>
              ))}
            </select>
            <select 
              value={userLevel} 
              onChange={(e) => setUserLevel(e.target.value)}
              className="filter-select"
            >
              <option value="beginner">Principiante</option>
              <option value="intermediate">Intermedio</option>
              <option value="professional">Profesional</option>
            </select>
          </div>
        </div>

        <div className="courses-grid">
          {filteredCourses.map((course, index) => (
            <div key={course.module_id} className="course-card">
              <div className="course-header">
                <h3>{course.title}</h3>
                <span className={`level-badge ${course.level}`}>
                  {course.level}
                </span>
              </div>
              <p>{course.description}</p>
              <div className="course-content">
                <h4>📹 Contenido del Video:</h4>
                <p>{course.video_content}</p>
                <div className="course-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: progress[course.module_id] ? '100%' : '0%' }}
                    ></div>
                  </div>
                  <span>{progress[course.module_id] ? 'Completado' : 'Pendiente'}</span>
                </div>
              </div>
              <button className="start-course-btn">
                {progress[course.module_id] ? 'Revisar' : 'Comenzar'}
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderAIAnalysis = () => (
    <div className="ai-analysis-section">
      <div className="analysis-header">
        <h2>🤖 Análisis con IA Múltiple</h2>
        <p>Análisis combinado de OpenAI + Gemini para {selectedPair}</p>
      </div>

      <div className="analysis-controls">
        <div className="pair-selector">
          <label>Par de Trading:</label>
          <select 
            value={selectedPair} 
            onChange={(e) => setSelectedPair(e.target.value)}
          >
            {forexPairs.map(pair => (
              <option key={pair.code} value={pair.code}>{pair.code}</option>
            ))}
          </select>
        </div>

        <div className="analysis-buttons">
          <button 
            onClick={() => handleAiAnalysis('technical_analysis')}
            disabled={loading}
            className="analysis-btn technical"
          >
            📊 Análisis Técnico
          </button>
          <button 
            onClick={() => handleAiAnalysis('pattern_recognition')}
            disabled={loading}
            className="analysis-btn pattern"
          >
            🔍 Reconocimiento de Patrones
          </button>
          <button 
            onClick={() => handleAiAnalysis('risk_management')}
            disabled={loading}
            className="analysis-btn risk"
          >
            ⚖️ Gestión de Riesgo
          </button>
          <button 
            onClick={() => handleAiAnalysis('market_sentiment')}
            disabled={loading}
            className="analysis-btn sentiment"
          >
            💭 Sentimiento del Mercado
          </button>
        </div>
      </div>

      <div className="chat-section">
        <h3>💬 Consulta Directa con IA</h3>
        <div className="chat-input-group">
          <textarea
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            placeholder={`Pregunta sobre ${selectedPair} o trading en general...`}
            className="chat-input"
          />
          <button 
            onClick={handleChat}
            disabled={loading || !chatMessage.trim()}
            className="chat-btn"
          >
            Enviar
          </button>
        </div>
      </div>

      {loading && (
        <div className="loading">
          <div className="spinner"></div>
          <p>Generando análisis con IA...</p>
        </div>
      )}

      {aiResponse && (
        <div className="ai-response">
          <h3>Respuesta de la IA:</h3>
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
        <h2>📰 Noticias del Mercado en Tiempo Real</h2>
        <p>Mantente informado sobre eventos que afectan tus pares principales</p>
        <div className="news-controls">
          <button 
            onClick={fetchLiveNews} 
            disabled={newsLoading}
            className="refresh-btn"
          >
            {newsLoading ? '🔄 Actualizando...' : '🔄 Actualizar Noticias'}
          </button>
        </div>
      </div>

      {/* Market Alerts Section */}
      {marketAlerts.length > 0 && (
        <div className="market-alerts">
          <h3>🚨 Alertas de Mercado Activas</h3>
          <div className="alerts-grid">
            {marketAlerts.map((alert) => (
              <div key={alert.id} className={`alert-card ${alert.importance.toLowerCase()}`}>
                <div className="alert-header">
                  <span className="alert-type">{alert.type}</span>
                  <span className={`alert-importance ${alert.importance.toLowerCase()}`}>
                    {alert.importance}
                  </span>
                </div>
                <div className="alert-pair">{alert.pair}</div>
                <div className="alert-message">{alert.message}</div>
                <div className="alert-time">
                  {new Date(alert.created_at).toLocaleString('es-ES')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live News Section */}
      <div className="live-news-section">
        <h3>📡 Noticias en Tiempo Real</h3>
        {newsLoading ? (
          <div className="loading">
            <div className="spinner"></div>
            <p>Cargando noticias en tiempo real...</p>
          </div>
        ) : (
          <div className="news-grid">
            {liveNews.map((news, index) => (
              <div key={index} className={`news-card live-news ${news.impact}`}>
                <div className="news-header-card">
                  <h3>{news.title}</h3>
                  <div className="news-badges">
                    <span className={`impact-badge ${news.impact}`}>
                      {news.impact.toUpperCase()} IMPACTO
                    </span>
                    <span className={`volatility-badge ${news.volatility_expected?.toLowerCase()}`}>
                      Volatilidad: {news.volatility_expected}
                    </span>
                  </div>
                </div>
                <p className="news-content">{news.content}</p>
                
                {/* Sentiment and Analysis */}
                <div className="news-analysis">
                  <div className="sentiment-indicator">
                    <span className="sentiment-label">Sentimiento:</span>
                    <div className={`sentiment-bar ${news.sentiment >= 0 ? 'positive' : 'negative'}`}>
                      <div 
                        className="sentiment-fill" 
                        style={{ 
                          width: `${Math.abs(news.sentiment) * 100}%`,
                          backgroundColor: news.sentiment >= 0 ? '#10b981' : '#ef4444'
                        }}
                      ></div>
                    </div>
                    <span className="sentiment-value">
                      {news.sentiment > 0 ? '+' : ''}{(news.sentiment * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="news-footer">
                  <div className="news-meta">
                    <div className="affected-pairs">
                      <span className="pairs-label">Pares afectados:</span>
                      {news.pairs_affected.map(pair => (
                        <span key={pair} className="pair-tag">{pair}</span>
                      ))}
                    </div>
                    <div className="news-source">
                      <span className="source-label">Fuente:</span>
                      <span className="source-name">{news.source}</span>
                    </div>
                  </div>
                  <span className="news-time">
                    {new Date(news.timestamp).toLocaleString('es-ES')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Static News Section */}
      <div className="static-news-section">
        <h3>📰 Resumen de Noticias</h3>
        <div className="news-grid">
          {marketNews.map((news, index) => (
            <div key={index} className={`news-card ${news.impact}`}>
              <div className="news-header-card">
                <h3>{news.title}</h3>
                <span className={`impact-badge ${news.impact}`}>
                  {news.impact.toUpperCase()} IMPACTO
                </span>
              </div>
              <p>{news.content}</p>
              <div className="news-footer">
                <div className="affected-pairs">
                  {news.pairs_affected.map(pair => (
                    <span key={pair} className="pair-tag">{pair}</span>
                  ))}
                </div>
                <span className="news-time">
                  {new Date(news.timestamp).toLocaleString('es-ES')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Market Analysis Section */}
      <div className="market-analysis-section">
        <h3>🔍 Análisis por Pares</h3>
        <div className="analysis-grid">
          {forexPairs.map(pair => {
            const analysis = pairAnalysis[pair.code];
            if (!analysis) return null;

            return (
              <div key={pair.code} className="pair-analysis-card">
                <div className="analysis-header">
                  <h4>{pair.code}</h4>
                  <div className="analysis-badges">
                    <span className={`trend-badge ${analysis.trend?.toLowerCase()}`}>
                      {analysis.trend}
                    </span>
                    <span className="strength-score">
                      Fuerza: {analysis.strength}/10
                    </span>
                  </div>
                </div>
                
                <div className="key-levels">
                  <div className="support-levels">
                    <strong>Soporte:</strong>
                    {analysis.key_levels?.support?.map((level, idx) => (
                      <span key={idx} className="level-tag support">{level}</span>
                    ))}
                  </div>
                  <div className="resistance-levels">
                    <strong>Resistencia:</strong>
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
                    IA: {analysis.ai_confidence}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="news-tips">
        <h3>💡 Consejos para Trading con Noticias</h3>
        <div className="tips-grid">
          <div className="tip">
            <h4>🚨 Alto Impacto</h4>
            <p>Eventos que pueden mover el mercado significativamente</p>
            <div className="tip-advice">
              <strong>Estrategia:</strong> Considerar cerrar posiciones antes del evento o usar stops más amplios
            </div>
          </div>
          <div className="tip">
            <h4>⚠️ Medio Impacto</h4>
            <p>Noticias importantes pero predecibles</p>
            <div className="tip-advice">
              <strong>Estrategia:</strong> Monitorear de cerca y ajustar posiciones según el resultado
            </div>
          </div>
          <div className="tip">
            <h4>📊 Bajo Impacto</h4>
            <p>Información relevante pero con menor influencia inmediata</p>
            <div className="tip-advice">
              <strong>Estrategia:</strong> Usar como confirmación de tendencias existentes
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
        <p>Herramientas esenciales para proteger tu capital</p>
      </div>

      <div className="risk-tools">
        <div className="calculator">
          <h3>📊 Calculadora de Posición</h3>
          <div className="calc-inputs">
            <div className="input-group">
              <label>Capital de la cuenta:</label>
              <input type="number" placeholder="10000" />
            </div>
            <div className="input-group">
              <label>Riesgo por operación (%):</label>
              <input type="number" placeholder="2" max="5" />
            </div>
            <div className="input-group">
              <label>Distancia del Stop Loss (pips):</label>
              <input type="number" placeholder="20" />
            </div>
            <div className="input-group">
              <label>Par de trading:</label>
              <select>
                {forexPairs.map(pair => (
                  <option key={pair.code} value={pair.code}>{pair.code}</option>
                ))}
              </select>
            </div>
          </div>
          <button className="calculate-btn">Calcular Posición</button>
        </div>

        <div className="risk-rules">
          <h3>🏆 Reglas de Oro del Risk Management</h3>
          <div className="rules-list">
            <div className="rule">
              <div className="rule-number">1</div>
              <p>Nunca arriesgues más del 2% de tu capital por operación</p>
            </div>
            <div className="rule">
              <div className="rule-number">2</div>
              <p>Usa siempre Stop Loss en todas tus operaciones</p>
            </div>
            <div className="rule">
              <div className="rule-number">3</div>
              <p>Mantén una relación Risk/Reward mínima de 1:2</p>
            </div>
            <div className="rule">
              <div className="rule-number">4</div>
              <p>No abras más de 3-5 operaciones simultáneas</p>
            </div>
            <div className="rule">
              <div className="rule-number">5</div>
              <p>Diversifica entre diferentes pares de divisas</p>
            </div>
          </div>
        </div>
      </div>

      <div className="account-levels">
        <h3>💰 Niveles de Cuenta Recomendados</h3>
        <div className="levels-grid">
          <div className="account-level micro">
            <h4>🌱 Cuenta Micro</h4>
            <p>Capital: $100 - $1,000</p>
            <p>Lote mínimo: 0.01</p>
            <p>Riesgo por trade: $2-20</p>
            <p>Ideal para principiantes</p>
          </div>
          <div className="account-level mini">
            <h4>📈 Cuenta Mini</h4>
            <p>Capital: $1,000 - $10,000</p>
            <p>Lote mínimo: 0.1</p>
            <p>Riesgo por trade: $20-200</p>
            <p>Para traders intermedios</p>
          </div>
          <div className="account-level standard">
            <h4>🏆 Cuenta Estándar</h4>
            <p>Capital: $10,000+</p>
            <p>Lote mínimo: 1.0</p>
            <p>Riesgo por trade: $200+</p>
            <p>Para traders profesionales</p>
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
                <span className="regular-price">Precio Regular: €29.99/mes</span>
                <span className="discounted-price">Tu Precio: €20.99/mes</span>
                <span className="savings">¡Ahorras €9.00/mes!</span>
              </div>
              <p>Accede al canal exclusivo de trading algorítmico con IA</p>
              <div className="contact-info">
                <p><strong>Para activar tu descuento contacta:</strong></p>
                <p>📱 Telegram: @cryptojr_official</p>
                <p>📸 Instagram: cryptojr_official</p>
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
              Con Premium obtienes 30% de descuento: €20.99/mes en lugar de €29.99/mes
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
            <h4>VT Markets</h4>
            <p>Spreads competitivos, ejecución rápida</p>
            <div className="broker-features">
              <span>✅ Regulado</span>
              <span>✅ 0 comisiones</span>
              <span>✅ MT4/MT5</span>
            </div>
          </div>
          <div className="broker-card">
            <h4>IC Trading</h4>
            <p>Condiciones institucionales, swaps bajos</p>
            <div className="broker-features">
              <span>✅ ECN</span>
              <span>✅ Swaps optimizados</span>
              <span>✅ API trading</span>
            </div>
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
