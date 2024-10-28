import {
  propagate,
  gstime,
  eciToGeodetic,
  degreesLong,
  degreesLat,
  SatRec,
} from "satellite.js";

export default function getISSPosition(satrec: SatRec, date: Date) {
  // You will need GMST for some of the coordinate transforms.
  // http://en.wikipedia.org/wiki/Sidereal_time#Definition
  const gmst = gstime(date);

  // The position_velocity result is a key-value pair of ECI coordinates.
  // These are the base results from which all other coordinates are derived.
  const positionGd = eciToGeodetic(
    propagate(satrec, date).position as any,
    gmst
  );

  return {
    longitude: degreesLong(positionGd.longitude),
    latitude: degreesLat(positionGd.latitude),
  };
}
