import "maplibre-gl/dist/maplibre-gl.css"
import { useEffect, useRef, useState } from 'react'
import {Marker,Map,NavigationControl,setWorkerUrl,Popup} from "maplibre-gl"
import {renderToStaticMarkup} from "react-dom/server";
import {Play,Pause} from "lucide-react";
import workerUri from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "./App.css"
import VenylRecord from "./assets/Gemini_Generated_Image_rwood9rwood9rwoo.png";

setWorkerUrl(workerUri);

    const MAP_STYLES ={
      darkMatter:"https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
      voyager:"https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
      positron:"https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
      
    }

function App() {
  const mapContainer = useRef(null);
  const audio = useRef(new Audio());
  const firstButtonRef = useRef(null);
  const secondButtonRef = useRef(null);
  const thirdButtonRef = useRef(null);
  const mapRef = useRef(null);
  const mapMenuRef = useRef(null);
  const favMenuRef = useRef(null);
  const sortMenuRef = useRef(null);
  const [mapMenuTop, setMapMenuTop] = useState(0);
  const [favSecTop, setFavSecTop] = useState(0);
  const [sortSecTop, setSortSecTop] = useState(0);
  const [isPlaying , setIsPlaying] = useState(false);
  const [currentStation, setCurrentStation] = useState(null);
  const [showMapStyles, setShowMapStyles] = useState(false);
  const [showFavSec, setShowFavSec] = useState(false);
  const [showSortSec, setSortSec] = useState(false);
  useEffect(() => {
    let userMarker = null;
    let countryDetected = false;
    let currentMarkerElement = null;
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    audio.current.addEventListener("play",handlePlay);
    audio.current.addEventListener("pause",handlePause);

    if (!mapContainer.current) return;
    const savedStyle = localStorage.getItem("mapStyle");

    const map = new Map({
      container: mapContainer.current, 
      style: MAP_STYLES[savedStyle] || MAP_STYLES.darkMatter,
      center: [78, 20],
      zoom: 2,
      renderWorldCopies:false,
      minZoom:3,
      pitchWithRotate:false
    });
    mapRef.current=map;
  
    map.addControl(new NavigationControl(), "top-right");
    let active=true;
  
    const loadStations = async() => {
      try{
        const countryResponse = await fetch (
          "https://de1.api.radio-browser.info/json/stations/search?countrycode=IN&has_geo_info=true&hidebroken=true&limit=200"
        );
        const globalResponse = await fetch(
          "https://de1.api.radio-browser.info/json/stations/search?has_geo_info=true&hidebroken=true&limit=350&order=random"
        );

        const globalStations = await globalResponse.json();
        const countryStations = await countryResponse.json();
        
        if (!countryResponse.ok || !globalResponse.ok){
          throw new Error("API request failed");
        }

        const stations = [...globalStations,...countryStations];

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
            const getIcon = (Icon) => renderToStaticMarkup(<Icon size={20}/>);

            playButton.innerHTML=getIcon(Play);
            stationName.className="station-name";
            stationCountry.className="station-country";
            playButton.className="play-button";
            playButton.setAttribute("aria-label","Play station");
            popupContent.className="mini-pop";
            popupContent.append(stationName,stationCountry,playButton);
            const popup = new Popup({offset:15}).setDOMContent(popupContent);

            playButton.addEventListener("click",async () => {
              try{
                if (audio.current.src === station.url_resolved){
                  if (audio.current.paused){
                    await audio.current.play();
                    playButton.innerHTML=getIcon(Pause);
                    playButton.setAttribute("aria-label", "Pause station");
                    setCurrentStation(station);
                    if (currentMarkerElement){
                      currentMarkerElement.classList.remove("playing");
                      currentMarkerElement = null;
                    }
                    currentMarkerElement = markerElement;
                    markerElement.classList.add("playing");
                  } else{
                    audio.current.pause();
                    playButton.innerHTML = getIcon(Play);
                    playButton.setAttribute("aria-label","Play station");
                    }
                } else{
                  audio.current.src=station.url_resolved;
                  await audio.current.play();
                  playButton.innerHTML=getIcon(Pause);
                  playButton.setAttribute("aria-label", "Pause station");
                  setCurrentStation(station);
                  if (currentMarkerElement){
                    currentMarkerElement.classList.remove("playing");
                    currentMarkerElement = null;
                  }
                  currentMarkerElement = markerElement;
                  markerElement.classList.add("playing");
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

    const watchID = navigator.geolocation.watchPosition(async (position) => {
        if (!active) return;

        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        if (!countryDetected){
          countryDetected=true;
          try {
            const response = await fetch (`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
            if (!response.ok){
              throw new Error("Location detection is failing");
            }
            const locataionData = await response.json();
            const countryCode = locataionData.countryCode;
            console.log(countryCode);
          } catch (error){
            countryDetected = false;
            console.error(error);
          }

        }

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
      mapRef.current=null;
  };
},[]);

  useEffect(()=> {
    function handleOutsideClick(event){
      const clickedInsideMenu = mapMenuRef.current?.contains(event.target) || 
      favMenuRef.current?.contains(event.target) ||
      sortMenuRef.current?.contains(event.target);

      const clickedSidebarButton = 
      firstButtonRef.current?.contains(event.target) ||
      secondButtonRef.current?.contains(event.target) ||
      thirdButtonRef.current?.contains(event.target);

      if (!clickedInsideMenu && !clickedSidebarButton){
        setShowMapStyles(false);
        setShowFavSec(false);
        setSortSec(false);
      }
    }
      document.addEventListener("mousedown",handleOutsideClick);
      return () => {
        document.removeEventListener("mousedown",handleOutsideClick);
      };
  },[]);

  return <>
    <div ref={mapContainer} className='map-container'/>
    <div className="leftbar">
      <div className="sidebar-cards">

        <button ref={firstButtonRef} 
        className="sidebar-card" 
        id="firstbutton" 
        onClick={
          () => {
            if (!showMapStyles){
              const rect = firstButtonRef.current.getBoundingClientRect();
              setMapMenuTop(rect.top + rect.height /2);
            }
            setShowMapStyles(!showMapStyles);
          }
          }>
          <div className="name"><img id="imageone" src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR03YBucBqu4TclxgpG2aA3Ui8tS08ia6Sn9gDi6G7F6g&s=10"></img></div>
        </button>

        <button
        ref={secondButtonRef} 
        className="sidebar-card" 
        id="secondbutton"
        onClick={
          () => {
            if (!showFavSec){
              const rect = secondButtonRef.current.getBoundingClientRect();
              setFavSecTop(rect.top + rect.height /2);
            }
            setShowFavSec(!showFavSec);
          }
        }>
          <div className="name"><img id="imagetwo" src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTTeN5ovDqaLlo1C5YImRDHTG70pkaFYEWuZrjU5-2r61RXBhBoyRQKKXqp&s=10"></img></div>
        </button>

        <button 
        ref={thirdButtonRef}
        className="sidebar-card" 
        id="thirdbutton"
        onClick={() => {
          if (!showSortSec){
            const rec = thirdButtonRef.current.getBoundingClientRect();
            setSortSecTop(rec.top + rec.height /2);
          }
          setSortSec(!showSortSec);
        }}>
          <div className="name"><img id="imagethree" src={VenylRecord} alt="Super cool vinyl"></img></div>
        </button>

        <div id="recordplayer" className={`name ${isPlaying ? "spinning" : ""}`}><img
        src="https://freepngimg.com/save/78198-vinyl-record/1024x1024"></img></div>

      </div>
    </div>
    {showMapStyles && (
      <div ref={mapMenuRef} className="map-style-menu" 
      style={{top: `${mapMenuTop}px`}}>
        <h3>Map style</h3>

        <button>3D</button>
        <button onClick={()=>{
          mapRef.current.setStyle("https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json")
          localStorage.setItem("mapStyle","darkMatter");
        }
        }>Default</button>

        <button onClick={() =>{
          mapRef.current.setStyle("https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json");
          localStorage.setItem("mapStyle","voyager");
        }
        }>Voyager</button>

        <button onClick={() => {
          mapRef.current.setStyle("https://basemaps.cartocdn.com/gl/positron-gl-style/style.json");
          localStorage.setItem("mapStyle","positron");
        }
        }>Positron</button>
      </div>)}

    {showFavSec && (
      <div ref={favMenuRef} className="fav-sec" 
      style={{top: `${favSecTop}px`}}>
      <h3>Fav Section</h3>
      </div>
    )}

    {showSortSec && (
      <div ref={sortMenuRef} className="sort-sec"
      style={{top: `${sortSecTop}px`}}>
        <h3>Sort: </h3>
      </div>
    )}

    <div className="bottombar">
      <div className="player-info">
        <h3>{currentStation ? currentStation.name : "Nothing Playing"}</h3>
        {currentStation ? 
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
          {isPlaying ? <Pause size={24}/> : <Play size={22}/>}
          </button>
        ): (<p>Select a radio station</p>)}
      </div>

      <div className="player-controls">
        <button></button>
      </div>
    </div>
   </>
}
export default App;
