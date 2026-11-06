import "maplibre-gl/dist/maplibre-gl.css"
import { useEffect, useRef, useState } from 'react'
import {Marker,Map,NavigationControl,setWorkerUrl,Popup} from "maplibre-gl"
import workerUri from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "./App.css"

setWorkerUrl(workerUri);
function App() {
  const mapContainer = useRef(null);
  const audio = useRef(new Audio());
  const [isPlaying , setIsPlaying] = useState(false);
  const [currentStation, setCurrentStation] = useState(null);
  useEffect(() => {
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    audio.current.addEventListener("play",handlePlay);
    audio.current.addEventListener("pause",handlePause);

    if (!mapContainer.current) return;
    const map = new Map({
      container: mapContainer.current, 
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [78, 20],
      zoom: 2,
      renderWorldCopies:false,
      minZoom:3,
      pitchWithRotate:false
    });
  
    map.addControl(new NavigationControl(), "top-right");
    let active=true;
    let userMarker = null;

    const loadStations = async() => {
      try{
        const response = await fetch(
          "https://de1.api.radio-browser.info/json/stations/search?has_geo_info=true&hidebroken=true&limit=500&order=random"
        );
        if (!response.ok){
          throw new Error("Radio api error ", response.status);
        }
        const stations = await response.json();

        if (!active) return;

        let added =0;

        stations.forEach((station) => {
          if (
            station.geo_lat == null ||
            station.geo_long == null 
          ){
            return;
          }

          const latitude=Number(station.geo_lat);
          const longitude= Number(station.geo_long);

          if (
            !Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude <-90 || latitude > 90 || longitude < -180 || longitude > 180 ){
              return;
            }

            const markerElement = document.createElement("button");

            markerElement.className="station-marker";
            markerElement.type="button";
            markerElement.title=station.name || "Radio station";
            markerElement.setAttribute(
              "aria-label", `Radio Station : ${station.name || "Unknown"}`
            );

            const popupContent = document.createElement("div");
            const stationName = document.createElement("h3");
            stationName.textContent = station.name || "Unknown station";
            const stationCountry = document.createElement("p");
            stationCountry.textContent = station.country || "Unknown country";
            const playButton = document.createElement("button");
            playButton.textContent="Play";
            stationName.className="station-name";
            stationCountry.className="station-country";
            playButton.className="play-button";
            popupContent.className="mini-pop";
            popupContent.append(stationName,stationCountry,playButton);
            const popup = new Popup({offset:15}).setDOMContent(popupContent);

            playButton.addEventListener("click",async () => {
              try{
                if (audio.current.src === station.url_resolved){
                  if (audio.current.paused){
                    await audio.current.play();
                    playButton.textContent="pause";
                    setCurrentStation(station);
                  } else{
                    audio.current.pause();
                    playButton.textContent = "play";
                    }
                } else{
                  audio.current.src=station.url_resolved;
                  await audio.current.play();
                  playButton.textContent="pause";
                  setCurrentStation(station);
                }
              } catch (error){
                  console.error(error);
                }
              });

            new Marker({element: markerElement})
            .setLngLat([longitude,latitude])
            .setPopup(popup)
            .addTo(map);
          added++;
        });
        console.log("radio go added ", added);
      } catch (error){
        if (active){
          console.error(error);
        }
      }
    };
    map.on ("load",loadStations);

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
      audio.current.removeEventListener("play", handlePlay);
      audio.current.removeEventListener("pause",handlePause);
      map.remove();
  };
},[]);

  return <>
    <div ref={mapContainer} className='map-container'/>
    <div className="leftbar"></div>
    <div className="bottombar">
      <div className="player-info">
        <h3>{currentStation ? currentStation.name : "Nothing Playing"}</h3>
        <p>{currentStation ? 
        (<button  className="bootoom_button" onClick={async () =>{
          try {
            if (audio.current.paused){
              await audio.current.play();
              setIsPlaying(true);
            } else {
              audio.current.pause();
              setIsPlaying(false);
            }
          } catch (error){
            console.error(error);
          }
        }}
        >
          {isPlaying ? "Pause" : "Play"}
          </button>
        ): (<p>Select a radio station</p>)}</p>
      </div>

      <div className="player-controls">
        <button></button>
      </div>
    </div>
   </>
}
export default App;
