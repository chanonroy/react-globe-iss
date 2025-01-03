import { throttle } from "lodash";
import { useCallback, useEffect, useRef, useState } from "react";
import ReactGlobe from "react-globe.gl";
import { SatRec, twoline2satrec } from "satellite.js";
import { Mesh, MeshLambertMaterial, TetrahedronGeometry } from "three";
import stars from "./stars-min.jpg";
import getISSPosition from "./utils/get-iss-position";

interface ISSData {
  currentLat: number;
  currentLng: number;
  previousLat: number;
  previousLng: number;
}

const ALTITUDE = 0.075;

export default function App() {
  const [height, setHeight] = useState(window.innerHeight);
  const [width, setWidth] = useState(window.innerWidth);
  const [issData, setIssData] = useState<ISSData | null>(null);
  const [savedSatRec, setSavedSatRec] = useState<SatRec | null>(null);
  const globeRef = useRef<any>();

  const handleResize = () => {
    setWidth(window.innerWidth);
    setHeight(window.innerHeight);
  };

  const throttledResize = throttle(handleResize, 100);

  useEffect(() => {
    window.addEventListener("resize", throttledResize);
    return () => {
      // Cleanup on unmount
      window.removeEventListener("resize", throttledResize);
    };
  }, [throttledResize]);

  const updateISSPosition = useCallback(() => {
    if (!savedSatRec) {
      return;
    }

    // Current date and time
    const nowDate = new Date();
    const pastDate = new Date(Date.now() - 12 * 60 * 60 * 1000); // 12 hours

    const currentISSPosition = getISSPosition(savedSatRec, nowDate);
    const previousISSPosition = getISSPosition(savedSatRec, pastDate);

    setIssData({
      currentLat: currentISSPosition.latitude,
      currentLng: currentISSPosition.longitude,
      // TODO: check math here
      previousLat: -previousISSPosition.latitude,
      previousLng: previousISSPosition.longitude,
    });
  }, [savedSatRec, setIssData]);

  useEffect(() => {
    const interval = setInterval(() => {
      console.log("update");
      updateISSPosition();
    }, 1500);

    //Clearing the interval
    return () => clearInterval(interval);
  }, [updateISSPosition]);

  async function getISSData() {
    const url = "https://live.ariss.org/iss.txt";
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Response status: ${response.status}`);
      }

      const text = await response.text();

      if (text) {
        const lines = text
          .trim()
          .split("\n")
          .filter((line) => line.trim() !== "");

        const tleLine1 = lines[1];
        const tleLine2 = lines[2];

        // Initialize a satellite record
        const satrec = twoline2satrec(tleLine1, tleLine2);

        // Current date and time
        const nowDate = new Date();
        const pastDate = new Date(Date.now() - 12 * 60 * 60 * 1000); // 12 hours

        const currentISSPosition = getISSPosition(satrec, nowDate);
        const previousISSPosition = getISSPosition(satrec, pastDate);

        setIssData({
          currentLat: currentISSPosition.latitude,
          currentLng: currentISSPosition.longitude,
          // TODO: check math here
          previousLat: -previousISSPosition.latitude,
          previousLng: previousISSPosition.longitude,
        });

        globeRef.current?.pointOfView(
          {
            lat: currentISSPosition.latitude,
            lng: currentISSPosition.longitude,
            altitude: 2.5,
          },
          [1500]
        );

        setSavedSatRec(satrec);
      }
    } catch (error) {
      //
    }
  }

  useEffect(() => {
    getISSData();
  }, []);

  const linksData = [
    {
      start: {
        lat: issData?.previousLat,
        lng: issData?.previousLng,
        alt: ALTITUDE,
      },
      end: {
        lat: issData?.currentLat,
        lng: issData?.currentLng,
        alt: ALTITUDE,
      },
    },
  ];

  return (
    <div style={{ display: "flex", justifyContent: "right" }}>
      <ReactGlobe
        ref={globeRef}
        // Globe style properties
        height={height}
        width={width}
        backgroundColor="#08070e"
        backgroundImageUrl={stars}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        // ISS custom layer
        customLayerData={[
          {
            lat: issData?.currentLat,
            lon: issData?.currentLng,
            altitude: ALTITUDE,
          },
        ]}
        customThreeObject={
          issData
            ? new Mesh(
                new TetrahedronGeometry(2),
                new MeshLambertMaterial({ color: "white" })
              )
            : undefined
        }
        customThreeObjectUpdate={(obj, _) => {
          if (issData) {
            Object.assign(
              obj.position,
              globeRef.current.getCoords(
                issData.currentLat,
                issData.currentLng,
                ALTITUDE
              )
            );
          }
        }}
        // Telemetry lines custom layer
        pathsData={linksData}
        pathPoints={(link) => [(link as any).start, (link as any).end]}
        pathPointLat="lat"
        pathPointLng="lng"
        pathPointAlt="alt"
        pathStroke={2}
        pathTransitionDuration={0}
      />
    </div>
  );
}
