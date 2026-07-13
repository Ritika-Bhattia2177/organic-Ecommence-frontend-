import { useEffect, useState } from "react";

const DeliveryLocationModal = ({ isOpen, onClose, onLocationFound }) => {
  const [activeTab, setActiveTab] = useState("auto");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [manualLocation, setManualLocation] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setStatus("idle");
      setError("");
      return;
    }

    setStatus("idle");
    setError("");
    setActiveTab("auto");
  }, [isOpen]);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setStatus("error");
      setError("Your browser does not support geolocation.");
      return;
    }

    setStatus("loading");
    setError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          source: "browser",
        };

        setStatus("success");
        onLocationFound(nextLocation);
      },
      (locationError) => {
        setStatus("error");
        if (locationError.code === 1) {
          setError("Permission denied. Please allow location access to continue.");
        } else {
          setError(locationError.message || "We could not read your location.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();

    if (!manualLocation.trim()) {
      setError("Please enter your city or area.");
      return;
    }

    const nextLocation = {
      label: manualLocation.trim(),
      source: "manual",
    };

    setStatus("success");
    setError("");
    onLocationFound(nextLocation);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 py-6 backdrop-blur-sm">
      <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] bg-white shadow-2xl dark:bg-gray-900">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 h-10 w-10 rounded-full bg-gray-100 text-gray-500 transition hover:bg-gray-200 hover:text-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          ✕
        </button>

        <div className="bg-gradient-to-br from-green-600 via-emerald-600 to-teal-600 px-8 pb-8 pt-10 text-center text-white">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/15 text-2xl shadow-lg">
            📍
          </div>
          <h2 className="text-2xl font-extrabold">Set Delivery Location</h2>
          <p className="mt-2 text-sm text-green-50/90">
            We&apos;ll use your location to show live delivery tracking and a more accurate arrival estimate.
          </p>
        </div>

        <div className="space-y-6 px-8 py-7">
          <div className="grid grid-cols-2 gap-3 rounded-2xl bg-gray-100 p-1 dark:bg-gray-800">
            <button
              type="button"
              onClick={() => setActiveTab("auto")}
              className={`rounded-xl px-4 py-3 text-sm font-bold transition ${activeTab === "auto" ? "bg-white text-green-700 shadow-md dark:bg-gray-700 dark:text-green-300" : "text-gray-500 dark:text-gray-300"}`}
            >
              🎯 Auto Detect
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("manual")}
              className={`rounded-xl px-4 py-3 text-sm font-bold transition ${activeTab === "manual" ? "bg-white text-green-700 shadow-md dark:bg-gray-700 dark:text-green-300" : "text-gray-500 dark:text-gray-300"}`}
            >
              ✏️ Enter Manually
            </button>
          </div>

          {activeTab === "auto" ? (
            <div className="space-y-4 text-center">
              <button
                type="button"
                onClick={detectLocation}
                disabled={status === "loading"}
                className="w-full rounded-2xl border-2 border-green-500 bg-green-50 px-5 py-4 font-bold text-green-700 shadow-sm transition hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-green-950/30 dark:text-green-300"
              >
                {status === "loading" ? "Detecting location..." : "Use my current location"}
              </button>

              <p className="text-xs text-gray-400 dark:text-gray-500">
                Your browser will ask for location permission.
              </p>

              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                  {error}
                </div>
              ) : null}
            </div>
          ) : (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Enter your city or area
                <input
                  type="text"
                  value={manualLocation}
                  onChange={(e) => setManualLocation(e.target.value)}
                  placeholder="Example: Green Valley, CA"
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 outline-none transition focus:border-green-500 focus:bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </label>

              <button
                type="submit"
                className="w-full rounded-2xl bg-gradient-to-r from-green-600 to-emerald-600 px-5 py-4 font-bold text-white shadow-lg transition hover:from-green-700 hover:to-emerald-700"
              >
                Save location
              </button>

              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                  {error}
                </div>
              ) : null}
            </form>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-500 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeliveryLocationModal;