// src/app/App.jsx
// Root shell: random default mode once on load; passes locale + mode to the page.

import { useState } from 'react';
import { KeepItGoingPage } from '../pages/keepItGoing/KeepItGoingPage.jsx';

function App() {
  const locale = 'he';
  const [mode, setMode] = useState(() => (Math.random() < 0.5 ? 'shay' : 'naor'));

  return <KeepItGoingPage locale={locale} mode={mode} setMode={setMode} />;
}

export default App;
