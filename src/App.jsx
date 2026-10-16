import "maplibre-gl/dist/maplibre-gl.css"
import { useEffect, useRef } from 'react'
import {Marker,Map,NavigationControl,setWorkerUrl} from "maplibre-gl"
import workerUri from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "./App.css"

setWorkerUrl(workerUri);
function App() {
  const mapContainer = useRef(null);
  useEffect(() => {
    if (!mapContainer.current) return;
    const map = new Map({
      container: mapContainer.current, 
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [78, 20],
      zoom: 2,
      renderWorldCopies:false
    });
  
    map.addControl(new NavigationControl(), "top-right");
    let active=true;
    let userMarker = null;

    const watchID = navigator.geolocation.watchPosition(
      (position) => {
        if (!active) return;

        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        if (!userMarker){
          const dot = document.createElement("div");
          dot.className="location_dot";
          userMarker = new Marker({element:dot}).setLngLat([longitude,latitude]).addTo(map);
      } else {
        userMarker.setLngLat([longitude,latitude]);
      }
    },
      (error)=>{
        if (!active) return;
        console.log(error);
      },
      {
        enableHighAccuracy:true,
        timeout:10000,
        maximumAge:5000,
      }
    );
    return () => {
      active=false;
      navigator.geolocation.clearWatch(watchID);
      map.remove();
  };
});

  return <div ref={mapContainer} className='map-container'/>
}
export default App;
