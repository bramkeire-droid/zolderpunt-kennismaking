import { useState, useRef, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { MapPin, AlertCircle } from 'lucide-react';

interface PhotonFeature {
  properties: {
    name?: string;
    street?: string;
    housenumber?: string;
    postcode?: string;
    city?: string;
    country?: string;
  };
}

interface PhotonGeometry {
  coordinates: [number, number]; // [lng, lat]
}

interface PhotonFeatureWithGeometry extends PhotonFeature {
  geometry?: PhotonGeometry;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onCoordinates?: (lat: number, lng: number) => void;
  placeholder?: string;
  className?: string;
}

export default function AddressAutocomplete({ value, onChange, onCoordinates, placeholder, className }: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<PhotonFeatureWithGeometry[]>([]);
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setInputValue(value); }, [value]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const [searchError, setSearchError] = useState(false);

  const search = useCallback(async (query: string) => {
    if (query.length < 3) { setSuggestions([]); setSearchError(false); return; }
    try {
      const res = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5&lang=default&lat=50.85&lon=4.35`
      );
      if (!res.ok) {
        console.error('[AddressAutocomplete] API error:', res.status, await res.text());
        setSearchError(true);
        setSuggestions([]);
        return;
      }
      const data = await res.json();
      console.log('[AddressAutocomplete] Results:', data.features?.length ?? 0);
      setSearchError(false);
      const features = data.features || [];
      setSuggestions(features);
      if (features.length > 0) {
        console.log('[AddressAutocomplete] First suggestion:', formatAddress(features[0].properties));
      }
      setOpen(true);
    } catch (err) {
      console.error('[AddressAutocomplete] Fetch error:', err);
      setSearchError(true);
      setSuggestions([]);
    }
  }, []);

  const handleChange = (val: string) => {
    setInputValue(val);
    onChange(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 300);
  };

  const formatAddress = (props: PhotonFeature['properties']) => {
    const parts: string[] = [];
    if (props.street) {
      parts.push(props.housenumber ? `${props.street} ${props.housenumber}` : props.street);
    } else if (props.name) {
      parts.push(props.name);
    }
    if (props.postcode || props.city) {
      parts.push([props.postcode, props.city].filter(Boolean).join(' '));
    }
    return parts.join(', ');
  };

  const selectSuggestion = (feature: PhotonFeatureWithGeometry) => {
    const formatted = formatAddress(feature.properties);
    setInputValue(formatted);
    onChange(formatted);
    if (onCoordinates && feature.geometry?.coordinates) {
      const [lng, lat] = feature.geometry.coordinates;
      onCoordinates(lat, lng);
    }
    setOpen(false);
    setSuggestions([]);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Input
          value={inputValue}
          onChange={e => handleChange(e.target.value)}
          placeholder={placeholder}
          className={className}
          autoComplete="off"
        />
        {searchError && (
          <AlertCircle className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />
        )}
      </div>
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border shadow-lg max-h-[200px] overflow-auto">
          {suggestions.map((s, i) => (
            <li
              key={i}
              onClick={() => selectSuggestion(s)}
              className="px-3 py-2 text-sm cursor-pointer hover:bg-accent flex items-center gap-2"
            >
              <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
              <span>{formatAddress(s.properties)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
