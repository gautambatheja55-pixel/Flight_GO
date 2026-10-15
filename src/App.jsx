import "maplibre-gl/dist/maplibre-gl.css"
import { useEffect, useRef } from 'react'
import {Map,NavigationControl,setWorkerUrl} from "maplibre-gl"
import workerUri from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "./App.css"

setWorkerUrl(workerUri);
function App() {
  const mapContainer = useRef(null);
  useEffect(() => {
    if (!mapContainer.current) return;

    const map = new Map({
      container: mapContainer.current, 
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json', // style URL
      center: [78, 20],
      zoom: 2 
    });

    map.addControl(new NavigationControl(), "top-right");
    return () => map.remove();
  },[]);

  return <div ref={mapContainer} className='map-container'/>
}
export default App;
