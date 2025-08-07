import React from 'react';

function App() {
  return (
    <div>
      <h1>Academia Forex Profesional</h1>
      <p>Backend conectado: {process.env.REACT_APP_BACKEND_URL}</p>
    </div>
  );
}

export default App;
