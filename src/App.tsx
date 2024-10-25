import { throttle } from "lodash";
import { useEffect, useRef, useState } from "react";
import ReactGlobe from "react-globe.gl";
import stars from "./stars.jpg";

export default function App() {
  const [height, setHeight] = useState(window.innerHeight);
  const [width, setWidth] = useState(window.innerWidth);
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

  return (
    <div style={{ display: "flex", justifyContent: "right" }}>
      <ReactGlobe
        ref={globeRef}
        height={height}
        width={width}
        backgroundColor="#08070e"
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        backgroundImageUrl={stars}
      />
    </div>
  );
}
