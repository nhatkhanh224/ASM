"use client";

import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, Search } from "lucide-react";
import { POPULAR_CURRENCIES } from "@/libs/assetHelpers";

interface CurrencyComboboxProps {
  value: string;
  onChange: (symbol: string) => void;
  disabled?: boolean;
}

export default function CurrencyCombobox({
  value,
  onChange,
  disabled,
}: CurrencyComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = POPULAR_CURRENCIES.filter(
    (c) =>
      c.symbol.toLowerCase().includes(search.toLowerCase()) ||
      c.name.toLowerCase().includes(search.toLowerCase())
  );

  const showCustomOption =
    search.trim() !== "" &&
    !POPULAR_CURRENCIES.some(
      (c) => c.symbol.toLowerCase() === search.trim().toLowerCase()
    );

  const handleSelect = (symbol: string) => {
    onChange(symbol.toUpperCase());
    setSearch("");
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 flex items-center justify-between bg-white disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="font-medium text-gray-800">{value}</span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
              <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input
                autoFocus
                className="flex-1 bg-transparent text-sm outline-none placeholder-gray-400"
                placeholder="Tìm hoặc nhập tên coin..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && search.trim())
                    handleSelect(search.trim());
                }}
              />
            </div>
          </div>
          <ul className="max-h-56 overflow-y-auto py-1">
            {showCustomOption && (
              <li
                onClick={() => handleSelect(search.trim())}
                className="px-4 py-2.5 hover:bg-indigo-50 cursor-pointer flex items-center gap-3"
              >
                <span className="w-10 h-6 flex items-center justify-center bg-indigo-100 text-indigo-700 text-xs font-bold rounded">
                  {search.trim().toUpperCase().slice(0, 5)}
                </span>
                <span className="text-sm text-gray-700">
                  Dùng{" "}
                  <span className="font-semibold text-indigo-600">
                    {search.trim().toUpperCase()}
                  </span>
                  <span className="text-gray-400 ml-1">(tùy chỉnh)</span>
                </span>
              </li>
            )}
            {filtered.map((c) => (
              <li
                key={c.symbol}
                onClick={() => handleSelect(c.symbol)}
                className={`px-4 py-2.5 hover:bg-indigo-50 cursor-pointer flex items-center gap-3 ${
                  value === c.symbol ? "bg-indigo-50" : ""
                }`}
              >
                <span className="w-10 h-6 flex items-center justify-center bg-gray-100 text-gray-700 text-xs font-bold rounded">
                  {c.symbol.slice(0, 5)}
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-800">{c.symbol}</p>
                  <p className="text-xs text-gray-400">{c.name}</p>
                </div>
                {value === c.symbol && (
                  <span className="ml-auto text-indigo-600 text-xs font-medium">
                    ✓
                  </span>
                )}
              </li>
            ))}
            {filtered.length === 0 && !showCustomOption && (
              <li className="px-4 py-3 text-sm text-gray-400 text-center">
                Không tìm thấy. Nhấn Enter để dùng &quot;{search.toUpperCase()}&quot;
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
