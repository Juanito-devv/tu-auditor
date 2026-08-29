import React from "react";

const PALETA = [
  "#1565C0", "#2E7D32", "#C62828", "#B26A00",
  "#6A1B9A", "#00838F", "#EF6C00", "#4527A0",
  "#00796B", "#AD1457",
];

/**
 * Dona estilo Material 3 con hoyo blanco y total en el centro.
 * props:
 *  - datos: [{label, value, color?}]
 *  - titulo
 *  - totalCentro: texto opcional para el centro (default = suma)
 *  - unidadLabel: texto bajo el total (ej. "Total", "Salud")
 */
export default function PieChart({ datos, titulo, totalCentro, unidadLabel = "Total" }) {
  const total = datos.reduce((a, d) => a + (Number(d.value) || 0), 0);
  const R = 90;
  const CX = 100;
  const CY = 100;
  const C = 2 * Math.PI * R;

  let offset = 0;
  const arcos = datos.map((d, i) => {
    const val = Number(d.value) || 0;
    const frac = total > 0 ? val / total : 0;
    const len = frac * C;
    const dasharray = `${len} ${C - len}`;
    const dashoffset = -offset;
    offset += len;
    return {
      key: i,
      label: d.label,
      value: val,
      color: d.color || PALETA[i % PALETA.length],
      dasharray,
      dashoffset,
      pct: total > 0 ? frac * 100 : 0,
    };
  });

  const centroTexto =
    totalCentro !== undefined ? totalCentro : String(total);

  return (
    <div>
      {titulo && (
        <h3
          style={{
            fontFamily: "Work Sans, sans-serif",
            fontWeight: 600,
            fontSize: "1.15rem",
            margin: "0 0 12px",
            color: "var(--on-surface)",
          }}
        >
          {titulo}
        </h3>
      )}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <svg
          viewBox="0 0 200 200"
          width="150"
          height="150"
          role="img"
          aria-label={titulo || "Gráfico"}
        >
          <circle cx={CX} cy={CY} r={R} fill="#e5e2e1" />
          {total === 0 ? (
            <circle cx={CX} cy={CY} r={R} fill="#cfc8ba" />
          ) : (
            arcos.map(
              (a) =>
                a.value > 0 && (
                  <circle
                    key={a.key}
                    cx={CX}
                    cy={CY}
                    r={R}
                    fill="none"
                    stroke={a.color}
                    strokeWidth="34"
                    strokeDasharray={a.dasharray}
                    strokeDashoffset={a.dashoffset}
                    transform={`rotate(-90 ${CX} ${CY})`}
                  />
                )
            )
          )}
          <circle cx={CX} cy={CY} r="62" fill="#fff" />
          <text
            x={CX}
            y={CY - 4}
            textAnchor="middle"
            style={{
              fontFamily: "Work Sans, sans-serif",
              fontSize: "22px",
              fontWeight: 700,
              fill: "var(--primary)",
            }}
          >
            {centroTexto}
          </text>
          <text
            x={CX}
            y={CY + 16}
            textAnchor="middle"
            style={{
              fontFamily: "Public Sans, sans-serif",
              fontSize: "13px",
              fill: "var(--on-surface-variant)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            {unidadLabel}
          </text>
        </svg>

        <ul style={{ listStyle: "none", margin: 0, padding: 0, flex: 1, minWidth: 160 }}>
          {arcos.map((a) => (
            <li
              key={a.key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 10,
                fontSize: "1.05rem",
                fontFamily: "Public Sans, sans-serif",
              }}
            >
              <span
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: a.color,
                  flexShrink: 0,
                }}
              />
              <span style={{ flex: 1 }}>{a.label}</span>
              <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                {a.pct.toFixed(0)}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
