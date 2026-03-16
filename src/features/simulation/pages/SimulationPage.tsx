import { SimulationMap }    from './SimulationMap';
import { ControlPanel }     from './ControlPanel';
import { StatsPanel }       from './StatsPanel';
import { SimulationLoader } from './SimulationLoader';

export const SimulationPage = () => {
  return (
    <div className="sim-module page-wrapper sim-page">

      {/* Header — coherente con UserPage */}
      <header className="sim-header">
        <div>
          <p className="page-eyebrow">Simulación / Modelo Autómata Celular</p>
          <h1 className="page-title">
            Análisis de <em>Flujos Urbanos</em>
          </h1>
        </div>
        <div className="sim-header-meta">
          <span className="sim-meta-location">SANTIAGO_DE_CALI</span>
          <span className="sim-meta-stream">POSTGIS_GEO_STREAM</span>
        </div>
      </header>

      {/* Loader */}
      <SimulationLoader />

      {/* Main grid */}
      <div className="sim-grid">

        {/* Left: map + controls */}
        <div className="sim-left">
          <div className="sim-map-container">
            <SimulationMap />
          </div>

          <ControlPanel />

          <div className="sim-tech-note">
            <p>
              * Los datos visualizados corresponden a proyecciones estocásticas
              basadas en densidades de habitabilidad históricas.
            </p>
          </div>
        </div>

        {/* Right: telemetry */}
        <StatsPanel />

      </div>
    </div>
  );
};