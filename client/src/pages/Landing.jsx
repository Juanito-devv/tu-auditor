import React from "react";
import { Link } from "react-router-dom";

const PHONE_MOCK = "/mockups/phone.jpg";

const DASH_MOCK = "/mockups/dashboard.jpg";

function Material({ name, className = "" }) {
  return (
    <span className={`material-symbols-outlined ${className}`}>{name}</span>
  );
}

export default function Landing() {
  return (
    <div className="bg-background text-on-background font-body-md overflow-x-hidden pb-[76px] md:pb-0">
      {/* TopAppBar (desktop only) */}
      <header className="w-full top-0 sticky bg-surface border-b-[1.5px] border-surface-variant shadow-[0px_2px_4px_rgba(0,0,0,0.15)] z-50 hidden md:block">
        <div className="flex justify-between items-center h-[64px] px-container-padding w-full max-w-7xl mx-auto">
          <div className="flex items-center gap-element-gap">
            <Material name="fact_check" className="text-primary text-2xl" />
            <span className="font-headline-md text-headline-md text-primary uppercase tracking-tight">
              Tu Auditor
            </span>
          </div>
          <button className="hover:bg-surface-container-high p-2 rounded-full active:scale-95 transition-transform duration-100">
            <Material name="account_circle" className="text-primary text-2xl" />
          </button>
        </div>
      </header>

      <main className="w-full max-w-7xl mx-auto">
        {/* 1. HERO */}
        <section className="px-section-margin py-12 md:py-24 flex flex-col md:flex-row items-center gap-8">
          <div className="w-full md:w-1/2 flex flex-col gap-6 text-center md:text-left">
            <h1 className="font-display-lg text-display-lg text-on-background leading-tight">
              <span className="text-primary-container">Escanea.</span>
              <br />
              Visualiza.
              <br />
              Decide.
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant">
              Control de inventario farmacéutico diseñado para la precisión clínica y la
              toma de decisiones basada en datos.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start mt-4">
              <Link
                to="/inicio"
                className="tactile-button bg-primary-container text-on-primary font-button-text text-button-text h-[56px] px-8 rounded-lg flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <Material name="barcode_scanner" />
                Comenzar Prueba
              </Link>
              <Link
                to="/graficos"
                className="bg-surface text-primary border-2 border-primary-container font-button-text text-button-text h-[56px] px-8 rounded-lg flex items-center justify-center gap-2 w-full sm:w-auto hover:bg-surface-container-low transition-colors"
              >
                Ver Demo
              </Link>
            </div>
          </div>

          <div className="w-full md:w-1/2 relative flex justify-center">
            <div className="relative w-64 h-[500px] bg-surface-container-lowest rounded-[2rem] border-8 border-surface-variant shadow-xl overflow-hidden">
              <img className="w-full h-full object-cover" src={PHONE_MOCK} alt="App escaneando un producto" />
              <div className="absolute top-0 left-0 w-full h-1 bg-primary-container opacity-80 animate-[scan_2s_ease-in-out_infinite]"></div>
            </div>
          </div>
        </section>

        {/* 2. BENEFICIOS */}
        <section className="px-section-margin py-16 bg-surface-container-low">
          <div className="text-center mb-12">
            <h2 className="font-headline-lg text-headline-lg text-on-background mb-4">
              Precisión Garantizada
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl mx-auto">
              Diseñado para entornos de alta exigencia donde cada dato importa.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Beneficio
              icono="timer"
              iconoBg="bg-primary-fixed"
              iconoColor="text-primary"
              titulo="Ahorro de Tiempo"
              texto="Auditorías de inventario 3x más rápidas con escaneo continuo."
            />
            <Beneficio
              icono="shield"
              iconoBg="bg-secondary-fixed"
              iconoColor="text-secondary"
              titulo="Control Total"
              texto="Trazabilidad exacta de cada lote y fechas de caducidad."
            />
            <Beneficio
              icono="insights"
              iconoBg="bg-tertiary-fixed"
              iconoColor="text-tertiary"
              titulo="Decisiones Basadas en Datos"
              texto="Gráficos predictivos para evitar rupturas de stock."
            />
          </div>
        </section>

        {/* 3. CÓMO FUNCIONA */}
        <section className="px-section-margin py-16">
          <h2 className="font-headline-lg text-headline-lg text-on-background mb-12 text-center">
            Flujo de Trabajo Simplificado
          </h2>
          <div className="flex flex-col md:flex-row gap-8 items-start relative">
            <div className="hidden md:block absolute top-12 left-[10%] right-[10%] h-1 bg-surface-variant -z-10"></div>
            <Paso numero="1" titulo="Escanea" texto="Captura el código GS1 o datamatrix del medicamento." />
            <Paso numero="2" titulo="Mira los datos" texto="Verifica lote, caducidad y stock actual al instante." />
            <Paso numero="3" titulo="Analiza el gráfico" texto="Toma decisiones de recompra basadas en tendencias." />
          </div>
        </section>

        {/* 4. PREVIEW DASHBOARD */}
        <section className="px-section-margin py-16 bg-primary-fixed-dim rounded-t-[2rem]">
          <div className="max-w-4xl mx-auto text-center mb-10">
            <h2 className="font-headline-lg text-headline-lg text-on-primary-fixed mb-4">
              Visibilidad Total del Inventario
            </h2>
            <p className="font-body-md text-body-md text-on-primary-fixed-variant">
              Paneles de control diseñados para claridad y acción rápida.
            </p>
          </div>
          <div className="tactile-card bg-surface rounded-2xl overflow-hidden p-2 md:p-6 mx-auto max-w-5xl">
            <div className="w-full bg-surface-container-lowest rounded-xl border border-surface-variant h-64 md:h-96 relative flex items-center justify-center">
              <img className="w-full h-full object-cover rounded-xl" src={DASH_MOCK} alt="Dashboard de inventario" />
            </div>
          </div>
        </section>

        {/* 5. CTA FORM */}
        <section className="px-section-margin py-20 bg-surface">
          <div className="max-w-xl mx-auto tactile-card bg-surface-container-lowest p-8 rounded-2xl">
            <h2 className="font-headline-lg text-headline-lg text-on-background mb-2 text-center">
              Solicitar Demostración
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant mb-8 text-center">
              Un especialista se pondrá en contacto para una evaluación de su farmacia.
            </p>
            <form className="flex flex-col gap-6" onSubmit={(e) => e.preventDefault()}>
              <CampoForm label="Nombre Completo" id="name" placeholder="Ej. Dra. Carmen Silva" type="text" />
              <CampoForm label="Correo Electrónico" id="email" placeholder="contacto@farmacia.com" type="email" />
              <CampoForm label="Teléfono" id="phone" placeholder="+34 600 000 000" type="tel" />
              <button className="tactile-button mt-4 bg-primary-container text-on-primary font-button-text text-button-text h-[56px] rounded-lg w-full" type="submit">
                Enviar Solicitud
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}

function Beneficio({ icono, iconoBg, iconoColor, titulo, texto }) {
  return (
    <div className="tactile-card bg-surface p-8 rounded-xl flex flex-col items-center text-center">
      <div className={`w-16 h-16 ${iconoBg} rounded-full flex items-center justify-center mb-6`}>
        <Material name={icono} className={`${iconoColor} text-3xl`} />
      </div>
      <h3 className="font-headline-md text-headline-md text-on-background mb-3">{titulo}</h3>
      <p className="font-body-md text-body-md text-on-surface-variant">{texto}</p>
    </div>
  );
}

function Paso({ numero, titulo, texto }) {
  return (
    <div className="flex-1 flex flex-col items-center text-center relative z-10 w-full">
      <div className="w-24 h-24 bg-surface tactile-card rounded-full flex items-center justify-center mb-6 border-4 border-surface-container-low">
        <span className="font-metric-xl text-metric-xl text-primary-container">{numero}</span>
      </div>
      <h4 className="font-label-lg text-label-lg text-on-background mb-2">{titulo}</h4>
      <p className="font-body-md text-body-md text-on-surface-variant">{texto}</p>
    </div>
  );
}

function CampoForm({ label, id, placeholder, type }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="font-label-lg text-label-lg text-on-surface" htmlFor={id}>
        {label}
      </label>
      <input
        className="h-[56px] bg-surface-container-lowest border-[1.5px] border-outline rounded-lg px-4 font-body-md focus:border-[3px] focus:border-primary-container focus:ring-0 transition-all outline-none"
        id={id}
        type={type}
        placeholder={placeholder}
      />
    </div>
  );
}
