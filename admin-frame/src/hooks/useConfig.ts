import { useEffect, useState } from "react";

interface Config {
  clientId: string;
  shop: string;
  host: string;
  appUrl: string;
  appPath?: string;
}

let cachedConfig: Config | null = null;

export function useConfig() {
  const [config, setConfig] = useState<Config | null>(cachedConfig);

  useEffect(() => {
    if (config) return;

    const controller = new AbortController();

    fetch('/api/config', {
      signal: controller.signal,
    }).then(res => res.json())
      .then(data => {
        if (!data) return null;

        cachedConfig = data;
        setConfig(data);
      })
      .catch(err => {
        if (err.toString().includes('cleanup')) return null;

        console.error('Error fetching config:', err);
      });

    return () => {
      controller.abort('Effect cleanup');
    }
  }, [config]);

  return config;
}