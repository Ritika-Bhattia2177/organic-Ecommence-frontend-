import { useEffect, useRef, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { getSocket } from "../services/socket";
import api from "../services/api";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const createMarkerIcon = (backgroundColor, borderColor, label) =>
  L.divIcon({
    className: "",
    html: `
      <div style="
        width: 34px;
        height: 34px;
        border-radius: 9999px;
        background: ${backgroundColor};
        border: 3px solid ${borderColor};
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 11px;
        font-weight: 700;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.25);
      ">${label}</div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -30],
  });

const customerIcon = createMarkerIcon("#2563eb", "#1d4ed8", "C");
const deliveryPartnerIcon = createMarkerIcon("#16a34a", "#15803d", "D");

const defaultZoom = 16;
const animationDuration = 900;
const averageDeliverySpeedKmh = 25;

const toRadians = (degrees) => (degrees * Math.PI) / 180;

const calculateDistanceKm = (start, end) => {
  if (!start || !end) {
    return null;
  }

  const earthRadiusKm = 6371;
  const latitudeDifference = toRadians(end.latitude - start.latitude);
  const longitudeDifference = toRadians(end.longitude - start.longitude);
  const startLatitudeRadians = toRadians(start.latitude);
  const endLatitudeRadians = toRadians(end.latitude);

  const haversinePart =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(startLatitudeRadians) *
      Math.cos(endLatitudeRadians) *
      Math.sin(longitudeDifference / 2) ** 2;

  const centralAngle =
    2 * Math.atan2(Math.sqrt(haversinePart), Math.sqrt(1 - haversinePart));

  return earthRadiusKm * centralAngle;
};

const calculateEtaMinutes = (distanceKm) => {
  if (distanceKm === null) {
    return null;
  }

  return Math.max(1, Math.round((distanceKm / averageDeliverySpeedKmh) * 60));
};

const AutoFitBounds = ({ customerMapPosition, deliveryPartnerMapPosition }) => {
  const map = useMap();

  useEffect(() => {
    if (customerMapPosition && deliveryPartnerMapPosition) {
      map.fitBounds([customerMapPosition, deliveryPartnerMapPosition], {
        padding: [40, 40],
        maxZoom: 15,
      });
      return;
    }

    if (customerMapPosition) {
      map.setView(customerMapPosition, Math.max(map.getZoom(), 14));
      return;
    }

    if (deliveryPartnerMapPosition) {
      map.setView(deliveryPartnerMapPosition, Math.max(map.getZoom(), 14));
    }
  }, [customerMapPosition, deliveryPartnerMapPosition, map]);

  return null;
};

const LocationMap = ({
  title = "Live delivery tracking",
  description = "Your location stays fixed while the delivery partner moves from live Socket.IO updates.",
  height = "24rem",
  zoom = defaultZoom,
  className = "",
  orderId = null,
  customerLocation = null,
  autoRequestCustomerLocation = true,
}) => {
  const [customerPosition, setCustomerPosition] = useState(null);
  const [deliveryPartnerPosition, setDeliveryPartnerPosition] = useState(null);
  const [liveUpdate, setLiveUpdate] = useState(null);
  const [status, setStatus] = useState("requesting");
  const [error, setError] = useState("");
  const initialRequestTimerRef = useRef(null);
  const deliveryPartnerCurrentRef = useRef(null);
  const animationFrameRef = useRef(null);
  const animationStartRef = useRef(0);
  const animationFromRef = useRef(null);
  const animationToRef = useRef(null);
  const socketRef = useRef(null);

  const stopPartnerAnimation = () => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    animationStartRef.current = 0;
    animationFromRef.current = null;
    animationToRef.current = null;
  };

  const setDeliveryPartnerInstantly = (nextPosition) => {
    deliveryPartnerCurrentRef.current = nextPosition;
    setDeliveryPartnerPosition(nextPosition);
  };

  const animateDeliveryPartnerTo = (nextPosition) => {
    if (!deliveryPartnerCurrentRef.current) {
      setDeliveryPartnerInstantly(nextPosition);
      return;
    }

    stopPartnerAnimation();

    const startPosition = deliveryPartnerCurrentRef.current;
    animationFromRef.current = startPosition;
    animationToRef.current = nextPosition;
    animationStartRef.current = performance.now();

    const step = (now) => {
      const progress = Math.min(
        (now - animationStartRef.current) / animationDuration,
        1
      );
      const easedProgress = 1 - Math.pow(1 - progress, 3);

      const currentPosition = {
        latitude:
          startPosition.latitude +
          (nextPosition.latitude - startPosition.latitude) * easedProgress,
        longitude:
          startPosition.longitude +
          (nextPosition.longitude - startPosition.longitude) * easedProgress,
      };

      deliveryPartnerCurrentRef.current = currentPosition;
      setDeliveryPartnerPosition(currentPosition);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(step);
      } else {
        animationFrameRef.current = null;
        animationFromRef.current = null;
        animationToRef.current = null;
      }
    };

    animationFrameRef.current = requestAnimationFrame(step);
  };

  const requestCustomerLocation = () => {
    if (!autoRequestCustomerLocation) {
      return;
    }

    if (!navigator.geolocation) {
      setStatus("error");
      setError("Geolocation is not supported in this browser.");
      return;
    }

    setStatus("requesting");
    setError("");

    navigator.geolocation.getCurrentPosition(
      (location) => {
        const fixedCustomerPosition = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };

        setCustomerPosition(fixedCustomerPosition);

        setStatus("ready");
      },
      (locationError) => {
        setStatus("error");
        if (locationError.code === 1) {
          setError("Permission denied. Please allow location access in your browser.");
        } else {
          setError(locationError.message || "We could not access your location.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  useEffect(() => {
    if (!customerLocation) {
      return;
    }

    const latitude = Number(customerLocation.latitude);
    const longitude = Number(customerLocation.longitude);

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return;
    }

    setCustomerPosition({ latitude, longitude });
    setStatus("ready");
  }, [customerLocation]);

  useEffect(() => {
    const fetchLatestOrderLocation = async () => {
      if (!orderId) {
        return;
      }

      try {
        const response = await api.get(`/location/${orderId}/latest`);
        const latestLocation = response?.data?.data;

        if (!latestLocation) {
          return;
        }

        const latitude = Number(latestLocation.latitude);
        const longitude = Number(latestLocation.longitude);

        if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
          return;
        }

        const nextPosition = { latitude, longitude };
        setLiveUpdate({ ...latestLocation, latitude, longitude });
        setDeliveryPartnerInstantly(nextPosition);
        setStatus("ready");
      } catch (requestError) {
        console.error("Failed to fetch latest order location", requestError);
      }
    };

    fetchLatestOrderLocation();
  }, [orderId]);

  useEffect(() => {
    socketRef.current = getSocket();

    const handleLocationReceive = (payload) => {
      if (orderId && String(payload?.orderId) !== String(orderId)) {
        return;
      }

      if (payload?.latitude === undefined || payload?.longitude === undefined) {
        return;
      }

      const latitude = Number(payload.latitude);
      const longitude = Number(payload.longitude);

      if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
        return;
      }

      const nextPosition = {
        latitude,
        longitude,
      };

      setLiveUpdate({
        ...payload,
        latitude,
        longitude,
        source: payload.source || "socket",
      });
      animateDeliveryPartnerTo(nextPosition);
      setStatus("ready");
    };

    socketRef.current.on("location:receive", handleLocationReceive);

    if (autoRequestCustomerLocation && !customerLocation) {
      initialRequestTimerRef.current = window.setTimeout(() => {
        requestCustomerLocation();
      }, 0);
    }

    return () => {
      if (initialRequestTimerRef.current !== null) {
        clearTimeout(initialRequestTimerRef.current);
        initialRequestTimerRef.current = null;
      }

      stopPartnerAnimation();
      socketRef.current?.off("location:receive", handleLocationReceive);
    };
  }, [autoRequestCustomerLocation, customerLocation, orderId]);

  const customerMapPosition = customerPosition
    ? [customerPosition.latitude, customerPosition.longitude]
    : null;

  const deliveryPartnerMapPosition = deliveryPartnerPosition
    ? [deliveryPartnerPosition.latitude, deliveryPartnerPosition.longitude]
    : null;

  const distanceKm = calculateDistanceKm(
    customerPosition,
    deliveryPartnerPosition
  );
  const etaMinutes = calculateEtaMinutes(distanceKm);
  const mapCenter = customerMapPosition || deliveryPartnerMapPosition || [20.5937, 78.9629];
  const canRenderMap = Boolean(customerMapPosition || deliveryPartnerMapPosition);

  return (
    <section
      className={`overflow-hidden rounded-3xl border border-green-100 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800 ${className}`}
    >
      <div className="flex flex-col gap-3 border-b border-green-100 px-6 py-5 dark:border-gray-700 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
            {title}
          </h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            {description}
          </p>
        </div>

        <button
          type="button"
          onClick={requestCustomerLocation}
          disabled={!autoRequestCustomerLocation}
          className="rounded-full bg-green-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-green-700"
        >
          {!autoRequestCustomerLocation
            ? "Auto location disabled"
            : status === "requesting"
            ? "Requesting customer location..."
            : customerPosition
              ? "Recheck customer location"
              : "Use my location"}
        </button>
      </div>

      <div style={{ height }} className="relative bg-green-50 dark:bg-gray-900">
        {status === "error" ? (
          <div className="flex h-full items-center justify-center p-6 text-center">
            <div className="max-w-md">
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                Location access is needed to show the customer marker.
              </p>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                {error}
              </p>
              <button
                type="button"
                onClick={requestCustomerLocation}
                className="mt-5 rounded-full border border-green-600 px-5 py-2.5 text-sm font-semibold text-green-700 transition hover:bg-green-50 dark:text-green-300 dark:hover:bg-gray-800"
              >
                Try again
              </button>
            </div>
          </div>
        ) : canRenderMap ? (
          <>
            <MapContainer
              key={`${mapCenter[0]}-${mapCenter[1]}-${String(orderId || "default")}`}
              center={mapCenter}
              zoom={zoom}
              scrollWheelZoom
              className="h-full w-full"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <AutoFitBounds
                customerMapPosition={customerMapPosition}
                deliveryPartnerMapPosition={deliveryPartnerMapPosition}
              />
              <Marker position={customerMapPosition} icon={customerIcon}>
                <Popup>Customer location is fixed here.</Popup>
              </Marker>
              {deliveryPartnerMapPosition ? (
                <Marker position={deliveryPartnerMapPosition} icon={deliveryPartnerIcon}>
                  <Popup>Delivery partner location.</Popup>
                </Marker>
              ) : null}
            </MapContainer>
            <div className="absolute left-4 top-4 space-y-2 rounded-2xl bg-white/95 px-4 py-3 text-xs font-semibold text-gray-700 shadow-lg backdrop-blur dark:bg-gray-900/95 dark:text-gray-200">
              <p>
                {liveUpdate
                  ? `Delivery update: ${liveUpdate.source} · ${new Date(liveUpdate.timestamp || Date.now()).toLocaleTimeString()}`
                  : "Waiting for delivery partner updates..."}
              </p>
              <p>
                {distanceKm !== null
                  ? `Distance: ${distanceKm.toFixed(2)} km`
                  : customerMapPosition
                    ? "Distance: waiting for partner location..."
                    : "Distance: enable your location for distance and ETA"}
              </p>
              <p>
                {etaMinutes !== null
                  ? `Estimated arrival: about ${etaMinutes} min`
                  : customerMapPosition
                    ? "Estimated arrival: waiting for partner location..."
                    : "Estimated arrival: enable your location for ETA"}
              </p>
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-center">
            <div className="max-w-md">
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                Waiting for location permission...
              </p>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                The browser will ask for permission so we can fix the customer marker on the map.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default LocationMap;