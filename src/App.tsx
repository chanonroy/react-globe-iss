import { throttle } from "lodash";
import { useEffect, useRef, useState } from "react";
import { Mesh, TetrahedronGeometry, MeshLambertMaterial } from "three";
import ReactGlobe from "react-globe.gl";
import {
  twoline2satrec,
  propagate,
  gstime,
  eciToGeodetic,
  degreesLong,
  degreesLat,
} from "satellite.js";
import stars from "./stars.jpg";

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
  const globeRef = useRef<any>();

  const handleResize = () => {
    setWidth(window.innerWidth);
    setHeight(window.innerHeight);
  };

  const throttledResize = throttle(handleResize, 100);

  useEffect(() => {
    window.addEventListener("resize", throttledResize);

    return () => {
      window.removeEventListener("resize", throttledResize); // Cleanup on unmount
    };
  }, [throttledResize]);

  async function getIssData() {
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

        // You will need GMST for some of the coordinate transforms.
        // http://en.wikipedia.org/wiki/Sidereal_time#Definition
        const currentDate = new Date();
        const previousDate = new Date(Date.now() - 12 * 60 * 60 * 1000); // 1 day

        const gmstNow = gstime(currentDate);
        const gmstPrevious = gstime(previousDate);

        // The position_velocity result is a key-value pair of ECI coordinates.
        // These are the base results from which all other coordinates are derived.
        const currentPositionGd = eciToGeodetic(
          propagate(satrec, currentDate).position as any,
          gmstNow
        );
        const previousPositionGd = eciToGeodetic(
          propagate(satrec, previousDate).position as any,
          gmstPrevious
        );

        setIssData({
          currentLat: degreesLat(currentPositionGd.latitude),
          currentLng: degreesLong(currentPositionGd.longitude),
          previousLat: -degreesLat(previousPositionGd.latitude),
          previousLng: degreesLong(previousPositionGd.longitude),
        });
      }
    } catch (error) {
      //
    }
  }

  useEffect(() => {
    // todo: clean this up
    getIssData();
  }, []);

  return (
    <div style={{ display: "flex", justifyContent: "right" }}>
      <ReactGlobe
        ref={globeRef}
        // globe properties
        height={height}
        width={width}
        backgroundColor="#08070e"
        backgroundImageUrl={stars}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        // ISS render
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
      />
    </div>
  );
}
