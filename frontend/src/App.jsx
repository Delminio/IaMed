import { useMemo, useState } from 'react';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export default function App() {
  const [question, setQuestion] = useState('Gestante de 31 semanas com PA 145/95, cefaleia persistente, edema e oligúria.');
  const [mode, setMode] = useState('hybrid');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const modes = useMemo(() => [
    { value: 'local', label: 'Local' },
    { value: 'internet', label: 'Internet' },
    { value: 'hybrid', label: 'Híbrido' }
  ], []);

  async function ask() {
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, mode })
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="hero">
        <div>
          <p className="eyebrow">IA médica com RAG local + web</p>
          <h1>MedScope AI</h1>
          <p className="subtitle">
            Pré-eclâmpsia e diabetes com 3 modos de resposta. O usuário final não envia PDF; a base local já vem pré-carregada por você.
          </p>
        </div>
      </div>

      <div className="panel">
        <label>Pergunta clínica</label>
        <textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={7} />

        <label>Modo</label>
        <div className="chips">
          {modes.map((item) => (
            <button
              key={item.value}
              className={mode === item.value ? 'chip active' : 'chip'}
              onClick={() => setMode(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <button className="primary" onClick={ask} disabled={loading}>
          {loading ? 'Analisando...' : 'Perguntar à IA'}
        </button>
      </div>

      <div className="grid">
        <section className="card big">
          <h2>Resposta</h2>
          <pre>{result?.error || result?.answer || 'A resposta aparecerá aqui.'}</pre>
        </section>

        <section className="card">
          <h2>Fontes locais</h2>
          {(result?.localSources || []).map((item, index) => (
            <article key={index} className="sourceItem">
              <strong>{item.title}</strong>
              <span>{item.preview}</span>
            </article>
          ))}
        </section>

        <section className="card">
          <h2>Fontes internet</h2>
          {(result?.internetSources || []).map((item, index) => (
            <article key={index} className="sourceItem">
              <strong>{item.title}</strong>
              <a href={item.url} target="_blank" rel="noreferrer">{item.url}</a>
              <span>{item.preview}</span>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
