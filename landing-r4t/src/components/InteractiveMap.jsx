import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import productoresDatos from '../data/productores.json';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x.src || markerIcon2x,
  iconUrl: markerIcon.src || markerIcon,
  shadowUrl: markerShadow.src || markerShadow,
});

// NUEVO: Diccionario para corregir el centrado de países con islas lejanas
const vistasPersonalizadas = {
  "Costa Rica": { centro: [9.928, -83.936], zoom: 7 }, // Ignora Isla del Coco
  "Colombia": { centro: [4.570, -74.297], zoom: 5 },   // Ignora San Andrés
  "Ecuador": { centro: [-1.831, -78.183], zoom: 6 },   // Ignora Galápagos
  "Chile": { centro: [-35.675, -71.542], zoom: 5 }     // Ignora Isla de Pascua
};

function ControladorMapa({ paisSeleccionado, geoJsonActivo }) {
  const map = useMap();
  
  useEffect(() => {
    // Evita que el mapa calcule mal su centro al cargar la página a dos columnas
    setTimeout(() => map.invalidateSize(), 250);

    if (!paisSeleccionado) {
      map.flyTo([12.0, -78.0], 4, { duration: 1.5 });
      return;
    }
    
    // 1. Si el país está en nuestro diccionario, usamos las coordenadas perfectas
    if (vistasPersonalizadas[paisSeleccionado]) {
      const vista = vistasPersonalizadas[paisSeleccionado];
      map.flyTo(vista.centro, vista.zoom, { duration: 1.5 });
      return;
    }
    
    // 2. Si es un país normal sin islas alejadas, usamos el cálculo matemático
    if (geoJsonActivo) {
      const capaGeoJson = L.geoJSON(geoJsonActivo);
      const limites = capaGeoJson.getBounds();
      if (limites.isValid()) {
        map.flyToBounds(limites, { padding: [40, 40], duration: 1.5 });
      }
    }
  }, [paisSeleccionado, geoJsonActivo, map]);

  return null;
}

function MarcadorProductor({ prod }) {
  const [mostrarVideo, setMostrarVideo] = useState(false);
  
  return (
    <Marker position={prod.coordenadas} eventHandlers={{ popupclose: () => setMostrarVideo(false) }}>
      <Popup maxWidth={500} minWidth={350}>
        <div className="text-center p-1 w-[320px] sm:w-[450px]">
          <h3 className="font-bold text-xl text-[#003865]">{prod.nombre_productor}</h3>
          <p className="text-md text-gray-600 font-semibold">{prod.region_representativa}, {prod.pais}</p>
          
          <div className="flex justify-center gap-2 mt-1 mb-2">
            <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">{prod.rubro}</span>
            <span className="inline-block bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-bold">{prod.enfermedad}</span>
          </div>
          
          <p className="text-sm text-gray-500 mb-2">{prod.descripcion}</p>
          
          {mostrarVideo ? (
            <div className="mt-3 animate-fade-in">
              <div className="relative pt-[56.25%] w-full rounded overflow-hidden shadow-inner bg-black">
                <iframe
                  src={`https://player.vimeo.com/video/${prod.vimeo_id}?autoplay=1&title=0&byline=0&portrait=0`}
                  className="absolute top-0 left-0 w-full h-full border-0"
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
              <div className="mt-3 text-right">
                <a href={`https://vimeo.com/${prod.vimeo_id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-sm font-semibold text-green-700 hover:text-green-900 transition-colors bg-green-50 px-3 py-1 rounded-md border border-green-200">
                  Abrir en Vimeo ↗
                </a>
              </div>
            </div>
          ) : (
            <button onClick={(e) => { e.stopPropagation(); setMostrarVideo(true); }} className="w-full bg-[#003865] hover:bg-[#00284a] text-white font-bold py-3 px-4 rounded transition-colors mt-2 text-lg">
              ▶ Ver Testimonio
            </button>
          )}
        </div>
      </Popup>
    </Marker>
  );
}

export default function InteractiveMap() {
  const [paisSeleccionado, setPaisSeleccionado] = useState('');
  const [enfermedadSeleccionada, setEnfermedadSeleccionada] = useState('');
  const [geoJsonMundial, setGeoJsonMundial] = useState(null);

  useEffect(() => {
    fetch('https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson')
      .then(res => res.json())
      .then(data => setGeoJsonMundial(data))
      .catch(err => console.error("Error al cargar fronteras:", err));
  }, []);

  const paisesUnicos = [...new Set(productoresDatos.map(p => p.pais))].sort();
  const enfermedadesUnicas = [...new Set(productoresDatos.map(p => p.enfermedad))].sort();

  const productoresFiltrados = productoresDatos.filter(prod => {
    const coincidePais = paisSeleccionado ? prod.pais === paisSeleccionado : true;
    const coincideEnfermedad = enfermedadSeleccionada ? prod.enfermedad === enfermedadSeleccionada : true;
    return coincidePais && coincideEnfermedad;
  });

  const geoJsonActivo = useMemo(() => {
    if (!paisSeleccionado || !geoJsonMundial) return null;
    const rasgoPais = geoJsonMundial.features.find(f => f.properties.ADMIN === paisSeleccionado || f.properties.name === paisSeleccionado);
    return rasgoPais ? { type: "FeatureCollection", features: [rasgoPais] } : null;
  }, [paisSeleccionado, geoJsonMundial]);

  return (
    <div className="flex flex-col md:flex-row w-full h-full gap-4">
      
      {/* PANEL IZQUIERDO (Filtros) */}
      <div className="w-full md:w-80 lg:w-96 flex flex-col gap-6 bg-white p-5 rounded-xl shadow-sm border border-gray-200 overflow-y-auto">
        
        <div>
          <h2 className="text-xl font-bold text-gray-800">Filtros de Búsqueda</h2>
          <p className="text-sm text-gray-600 mt-1">Selecciona los criterios para explorar las experiencias en el mapa.</p>
        </div>

        <hr className="border-gray-100" />

        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">País</label>
            <select 
              value={paisSeleccionado} 
              onChange={e => setPaisSeleccionado(e.target.value)} 
              className="w-full p-2.5 border border-gray-300 rounded-md bg-white text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#003865]"
            >
              <option value="">Todos los países</option>
              {paisesUnicos.map(pais => <option key={pais} value={pais}>{pais}</option>)}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Amenaza / Enfermedad</label>
            <select 
              value={enfermedadSeleccionada} 
              onChange={e => setEnfermedadSeleccionada(e.target.value)} 
              className="w-full p-2.5 border border-gray-300 rounded-md bg-white text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#003865]"
            >
              <option value="">Todas las amenazas</option>
              {enfermedadesUnicas.map(enf => <option key={enf} value={enf}>{enf}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* PANEL DERECHO (Mapa) */}
      <div className="flex-1 relative rounded-xl overflow-hidden shadow-sm border border-gray-200 bg-white z-0">
        <MapContainer center={[12.0, -78.0]} zoom={4} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {geoJsonActivo && (
            <GeoJSON 
              key={paisSeleccionado} 
              data={geoJsonActivo} 
              style={{ color: "#ef4444", weight: 2.5, fillColor: "#ef4444", fillOpacity: 0.12 }}
            />
          )}

          <ControladorMapa paisSeleccionado={paisSeleccionado} geoJsonActivo={geoJsonActivo} />
          
          {productoresFiltrados.map((prod) => (
            <MarcadorProductor key={prod.id} prod={prod} />
          ))}
        </MapContainer>
      </div>
      
    </div>
  );
}