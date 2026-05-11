import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ChevronDown,
  Globe,
  Image as ImageIcon,
  Search,
  X,
} from "lucide-react";
import LoadingSpinner from "../components/LoadingSpinner";
import { supabase } from "../lib/supabase";
import { fetchMenuData } from "../lib/menuData";
import { logger } from "../lib/logger";
import type { Category, MenuItem, MenuTheme, Restaurant } from "../types/menu";

function setMetaTag(property: string, content: string) {
  let element = document.querySelector(`meta[property="${property}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute("property", property);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

const MENU_THEMES: MenuTheme[] = ["minimalist", "classic", "dark", "visual"];

interface TemplateProps {
  restaurant: Restaurant;
  visibleCategories: Category[];
  itemsByCategory: Map<string, MenuItem[]>;
  activeCategory: string;
  isScrolled: boolean;
  currentLanguage: string;
  currencySymbol: string;
  scrollToCategory: (id: string) => void;
  changeLanguage: (language: string) => void;
  openImage: (url: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  t: (key: string, options?: string | Record<string, unknown>) => string;
}

interface LanguageSwitcherProps {
  value: string;
  onChange: (language: string) => void;
  ariaLabel: string;
  className: string;
  iconClassName?: string;
  chevronClassName?: string;
  showGlobe?: boolean;
  wrapperClassName?: string;
}

function LanguageSwitcher({
  value,
  onChange,
  ariaLabel,
  className,
  iconClassName,
  chevronClassName,
  showGlobe = false,
  wrapperClassName,
}: LanguageSwitcherProps) {
  return (
    <div className={`pointer-events-auto relative ${wrapperClassName ?? ""}`}>
      {showGlobe ? (
        <Globe
          className={`pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 ${iconClassName ?? ""}`}
        />
      ) : null}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={ariaLabel}
        className={`appearance-none ${className}`}
      >
        <option value="en">EN</option>
        <option value="pt">PT</option>
      </select>
      <ChevronDown
        className={`pointer-events-none absolute top-1/2 right-3 h-3 w-3 -translate-y-1/2 ${chevronClassName ?? ""}`}
      />
    </div>
  );
}

function MinimalistTemplate({
  restaurant,
  visibleCategories,
  itemsByCategory,
  activeCategory,
  isScrolled,
  currentLanguage,
  currencySymbol,
  scrollToCategory,
  changeLanguage,
  openImage,
  searchQuery,
  setSearchQuery,
  t,
}: TemplateProps) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 font-sans text-slate-900 selection:bg-slate-200">
      <div className="pointer-events-none absolute top-0 right-0 z-10 flex w-full justify-end p-4">
        <LanguageSwitcher
          value={currentLanguage}
          onChange={changeLanguage}
          ariaLabel={t("common.language", "Language")}
          showGlobe
          className="rounded-lg border border-slate-200 bg-white py-1.5 pr-8 pl-8 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          iconClassName="text-slate-400"
          chevronClassName="text-slate-400"
        />
      </div>

      <header className="flex flex-col items-center px-6 pt-16 pb-8 text-center">
        <div className="mb-5 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-slate-200/50 bg-black text-white shadow-xl shadow-black/10">
          {restaurant.logo_url ? (
            <img
              src={restaurant.logo_url}
              alt={restaurant.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <ImageIcon className="h-8 w-8 opacity-50" />
          )}
        </div>
        <h1 className="mb-1 text-3xl font-extrabold tracking-tight text-slate-900">
          {restaurant.name}
        </h1>
        <p className="text-sm font-medium text-slate-500">
          {t("publicMenu.digitalMenu", "Digital Menu")}
        </p>

        <div className="mt-8 w-full max-w-md relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder={t("publicMenu.searchPlaceholder", "Search menu...")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 shadow-sm transition-all focus:border-slate-300 focus:outline-none focus:ring-4 focus:ring-slate-100"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </header>

      <div
        className={`sticky top-0 z-40 transition-all duration-300 ${
          isScrolled
            ? "border-b border-slate-200 bg-[#F8FAFC]/90 shadow-sm backdrop-blur-md"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto max-w-3xl px-4 py-3">
          <div className="hide-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
            {visibleCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => scrollToCategory(category.id)}
                className={`whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-200 active:scale-95 ${
                  activeCategory === category.id
                    ? "bg-black text-white shadow-md shadow-black/10"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="mx-auto mt-6 max-w-3xl px-4">
        {visibleCategories.length === 0 && searchQuery && (
          <div className="py-12 text-center text-slate-500">
            {t("publicMenu.noSearchResults", "No results found for")} "{searchQuery}"
          </div>
        )}
        {visibleCategories.map((category) => (
          <div
            key={category.id}
            id={`category-${category.id}`}
            className="mb-12 scroll-mt-32"
          >
            <h2 className="mb-6 px-1 text-2xl font-bold tracking-tight text-slate-900">
              {category.name}
            </h2>
            <div className="flex flex-col gap-3">
              {(itemsByCategory.get(category.id) ?? []).map((item) => (
                <div
                  key={item.id}
                  className={`group flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] transition-all duration-300 hover:border-slate-200 hover:shadow-lg sm:gap-4 md:p-5 ${
                    item.is_available ? "" : "grayscale opacity-70"
                  }`}
                >
                  {item.image_url ? (
                    <button
                      type="button"
                      onClick={() => openImage(item.image_url!)}
                      aria-label={t("publicMenu.openItemImage", {
                        defaultValue: "Open image for {{name}}",
                        name: item.name,
                      })}
                      className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-100/50 bg-slate-100 shadow-sm sm:h-20 sm:w-20"
                    >
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ) : null}
                  <div className="flex-1 py-1 pr-2 sm:pr-4">
                    <h3 className="mb-1 text-base leading-tight font-bold text-slate-900">
                      {item.name}
                    </h3>
                    {item.description ? (
                      <p className="line-clamp-2 text-sm leading-relaxed text-slate-500">
                        {item.description}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 px-3 py-1.5">
                    <span className="whitespace-nowrap text-sm font-bold tracking-tight text-slate-900 sm:text-base">
                      {currencySymbol}
                      {item.price.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </main>

      <footer className="mt-16 pb-8 text-center">
        <p className="text-xs font-medium text-slate-400">
          {t("publicMenu.poweredByPrefix", "Powered by")}{" "}
          <span className="font-bold text-slate-700">MenuQR</span>
        </p>
      </footer>
    </div>
  );
}

function ClassicTemplate({
  restaurant,
  visibleCategories,
  itemsByCategory,
  activeCategory,
  isScrolled,
  currentLanguage,
  currencySymbol,
  scrollToCategory,
  changeLanguage,
  openImage,
  searchQuery,
  setSearchQuery,
  t,
}: TemplateProps) {
  return (
    <div className="min-h-screen bg-[#FAFAF9] pb-24 font-serif text-stone-900 selection:bg-stone-200">
      <div className="pointer-events-none absolute top-0 right-0 z-10 flex w-full justify-end p-4">
        <LanguageSwitcher
          value={currentLanguage}
          onChange={changeLanguage}
          ariaLabel={t("common.language", "Language")}
          className="border border-stone-300 bg-transparent px-3 py-1.5 pr-8 text-xs font-semibold text-stone-700 transition-colors hover:bg-stone-100"
          chevronClassName="text-stone-400"
        />
      </div>

      <header className="mx-auto flex max-w-xl flex-col items-center border-b border-stone-200 px-6 pt-20 pb-12 text-center">
        <h1 className="mb-4 text-4xl font-normal tracking-wide text-stone-900 md:text-5xl">
          {restaurant.name}
        </h1>
        <p className="text-sm uppercase tracking-[0.2em] text-stone-500">
          {t("publicMenu.menu", "Menu")}
        </p>

        <div className="mt-8 w-full max-w-sm relative">
          <Search className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            type="text"
            placeholder={t("publicMenu.searchPlaceholder", "Search menu...")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border-b border-stone-300 bg-transparent py-2 pl-8 pr-8 text-sm text-stone-900 placeholder-stone-400 focus:border-stone-900 focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-0 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-900"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </header>

      <div
        className={`sticky top-0 z-40 transition-all duration-300 ${
          isScrolled
            ? "border-b border-stone-200 bg-[#FAFAF9]/95 shadow-sm backdrop-blur-md"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto max-w-3xl px-4 py-4">
          <div className="hide-scrollbar flex justify-start gap-6 overflow-x-auto pb-1 md:justify-center">
            {visibleCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => scrollToCategory(category.id)}
                className={`whitespace-nowrap pb-1 text-sm uppercase tracking-widest transition-all duration-200 ${
                  activeCategory === category.id
                    ? "border-b-2 border-stone-900 font-bold text-stone-900"
                    : "text-stone-400 hover:text-stone-600"
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="mx-auto mt-12 max-w-3xl px-6">
        {visibleCategories.length === 0 && searchQuery && (
          <div className="py-12 text-center italic text-stone-500">
            {t("publicMenu.noSearchResults", "No results found for")} "{searchQuery}"
          </div>
        )}
        {visibleCategories.map((category) => (
          <div
            key={category.id}
            id={`category-${category.id}`}
            className="mb-16 scroll-mt-32"
          >
            <h2 className="mb-10 text-center text-2xl italic text-stone-800">
              {category.name}
            </h2>
            <div className="flex flex-col gap-8">
              {(itemsByCategory.get(category.id) ?? []).map((item) => (
                <div
                  key={item.id}
                  className={`group flex items-start gap-4 transition-all duration-300 ${
                    item.is_available ? "" : "opacity-65"
                  }`}
                >
                  {item.image_url ? (
                    <button
                      type="button"
                      onClick={() => openImage(item.image_url!)}
                      aria-label={t("publicMenu.openItemImage", {
                        defaultValue: "Open image for {{name}}",
                        name: item.name,
                      })}
                      className="mt-1 h-14 w-14 shrink-0 overflow-hidden rounded-full border border-stone-200"
                    >
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="h-full w-full object-cover sepia-[.2]"
                      />
                    </button>
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex w-full items-baseline gap-2">
                      <h3 className="whitespace-nowrap text-lg font-semibold text-stone-900">
                        {item.name}
                      </h3>
                      <div className="relative top-[-0.375rem] flex-1 border-b-[1.5px] border-dotted border-stone-300 opacity-60" />
                      <span className="pl-2 text-lg font-semibold text-stone-900">
                        {currencySymbol}
                        {item.price.toFixed(2)}
                      </span>
                    </div>
                    {item.description ? (
                      <p className="pr-4 text-sm leading-relaxed italic text-stone-500">
                        {item.description}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </main>

      <footer className="mx-auto mt-20 max-w-md border-t border-stone-200 pt-8 pb-8 text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-stone-400">
          {t("publicMenu.poweredByPrefix", "Powered by")}{" "}
          <span className="font-bold text-stone-600">MenuQR</span>
        </p>
      </footer>
    </div>
  );
}

function DarkTemplate({
  restaurant,
  visibleCategories,
  itemsByCategory,
  activeCategory,
  isScrolled,
  currentLanguage,
  currencySymbol,
  scrollToCategory,
  changeLanguage,
  openImage,
  searchQuery,
  setSearchQuery,
  t,
}: TemplateProps) {
  return (
    <div className="min-h-screen bg-zinc-950 pb-24 font-sans text-zinc-100 selection:bg-yellow-500/30">
      <div className="pointer-events-none absolute top-0 right-0 z-10 flex w-full justify-end p-4">
        <LanguageSwitcher
          value={currentLanguage}
          onChange={changeLanguage}
          ariaLabel={t("common.language", "Language")}
          showGlobe
          className="rounded border border-zinc-800 bg-zinc-900 py-1.5 pr-8 pl-8 text-xs font-bold uppercase tracking-wider text-zinc-300 transition-colors hover:bg-zinc-800"
          iconClassName="text-yellow-500"
        />
      </div>

      <header className="flex flex-col items-center px-6 pt-20 pb-10 text-center">
        <div className="mb-6 flex h-24 w-24 rotate-[-2deg] items-center justify-center border-2 border-yellow-500 bg-zinc-900 text-yellow-500">
          {restaurant.logo_url ? (
            <img
              src={restaurant.logo_url}
              alt={restaurant.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <ImageIcon className="h-10 w-10" />
          )}
        </div>
        <h1 className="mb-2 text-4xl font-black tracking-tighter text-white uppercase">
          {restaurant.name}
        </h1>
        <p className="text-xs font-bold tracking-[0.3em] uppercase text-yellow-500">
          {t("publicMenu.scanAndOrder", "Scan & Order")}
        </p>

        <div className="mt-8 w-full max-w-md relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder={t("publicMenu.searchPlaceholder", "SEARCH MENU...")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border-2 border-zinc-800 bg-zinc-900 py-3 pl-11 pr-4 text-xs font-bold tracking-widest text-white placeholder-zinc-600 focus:border-yellow-500 focus:outline-none transition-colors uppercase"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-yellow-500"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </header>

      <div
        className={`sticky top-0 z-40 transition-all duration-300 ${
          isScrolled
            ? "border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-md"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto max-w-3xl px-4 py-3">
          <div className="hide-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
            {visibleCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => scrollToCategory(category.id)}
                className={`whitespace-nowrap border-2 px-4 py-2 text-xs font-black uppercase tracking-wider transition-all duration-200 ${
                  activeCategory === category.id
                    ? "border-yellow-500 bg-yellow-500 text-zinc-950"
                    : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-600"
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="mx-auto mt-8 max-w-3xl px-4">
        {visibleCategories.length === 0 && searchQuery && (
          <div className="py-12 text-center text-xs font-bold tracking-widest text-zinc-600 uppercase">
            {t("publicMenu.noSearchResults", "No results found for")} "{searchQuery}"
          </div>
        )}
        {visibleCategories.map((category) => (
          <div
            key={category.id}
            id={`category-${category.id}`}
            className="mb-14 scroll-mt-32"
          >
            <div className="mb-6 flex items-center gap-4">
              <h2 className="text-2xl font-black tracking-tight text-white uppercase">
                {category.name}
              </h2>
              <div className="h-0.5 flex-1 bg-zinc-800" />
            </div>

            <div className="flex flex-col gap-4">
              {(itemsByCategory.get(category.id) ?? []).map((item) => (
                <div
                  key={item.id}
                  className={`group flex items-center gap-4 border border-zinc-800 bg-zinc-900/50 p-4 transition-all duration-300 hover:border-yellow-500/50 hover:bg-zinc-900 hover:shadow-[0_0_15px_rgba(234,179,8,0.1)] ${
                    item.is_available ? "" : "opacity-65"
                  }`}
                >
                  {item.image_url ? (
                    <button
                      type="button"
                      onClick={() => openImage(item.image_url!)}
                      aria-label={t("publicMenu.openItemImage", {
                        defaultValue: "Open image for {{name}}",
                        name: item.name,
                      })}
                      className="w-20 h-20 shrink-0 border border-zinc-700 bg-zinc-800 p-1"
                    >
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="h-full w-full object-cover grayscale transition-all hover:grayscale-0"
                      />
                    </button>
                  ) : null}
                  <div className="flex-1 py-1">
                    <h3 className="mb-1 text-lg font-bold tracking-wide text-white uppercase">
                      {item.name}
                    </h3>
                    {item.description ? (
                      <p className="text-sm leading-snug text-zinc-400">
                        {item.description}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center justify-center">
                    <span className="text-xl font-black text-yellow-500">
                      {currencySymbol}
                      {item.price.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </main>

      <footer className="mt-16 pb-8 text-center">
        <p className="text-xs font-bold tracking-widest text-zinc-600 uppercase">
          {t("publicMenu.poweredByPrefix", "Powered by")}{" "}
          <span className="text-yellow-500">MenuQR</span>
        </p>
      </footer>
    </div>
  );
}

function VisualTemplate({
  restaurant,
  visibleCategories,
  itemsByCategory,
  activeCategory,
  isScrolled,
  currentLanguage,
  currencySymbol,
  scrollToCategory,
  changeLanguage,
  openImage,
  searchQuery,
  setSearchQuery,
  t,
}: TemplateProps) {
  return (
    <div className="min-h-screen bg-gray-50 pb-24 font-sans text-gray-900 selection:bg-orange-200">
      <div className="pointer-events-none absolute top-0 right-0 z-10 flex w-full justify-end p-4">
        <LanguageSwitcher
          value={currentLanguage}
          onChange={changeLanguage}
          ariaLabel={t("common.language", "Language")}
          className="rounded-full border border-gray-200 bg-white/80 px-3 py-1.5 pr-8 text-xs font-bold text-gray-700 shadow-sm backdrop-blur"
        />
      </div>

      <header className="flex flex-col items-center px-6 pt-12 pb-6 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 text-orange-600">
          {restaurant.logo_url ? (
            <img
              src={restaurant.logo_url}
              alt={restaurant.name}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            <ImageIcon className="h-8 w-8" />
          )}
        </div>
        <h1 className="mb-1 text-2xl font-bold tracking-tight text-gray-900">
          {restaurant.name}
        </h1>

        <div className="mt-6 w-full max-w-md relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-orange-400" />
          <input
            type="text"
            placeholder={t("publicMenu.searchPlaceholder", "Search menu...")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm font-bold text-gray-900 shadow-sm transition-all focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-100"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </header>

      <div
        className={`sticky top-0 z-40 transition-all duration-300 ${
          isScrolled
            ? "border-b border-gray-200 bg-white shadow-sm"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto max-w-4xl px-4 py-3">
          <div className="hide-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
            {visibleCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => scrollToCategory(category.id)}
                className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-bold transition-all duration-200 ${
                  activeCategory === category.id
                    ? "bg-orange-500 text-white shadow-md"
                    : "border border-gray-200 bg-white text-gray-500 hover:bg-gray-100"
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="mx-auto mt-8 max-w-4xl px-4">
        {visibleCategories.length === 0 && searchQuery && (
          <div className="py-12 text-center font-bold text-gray-500">
            {t("publicMenu.noSearchResults", "No results found for")} "{searchQuery}"
          </div>
        )}
        {visibleCategories.map((category) => (
          <div
            key={category.id}
            id={`category-${category.id}`}
            className="mb-12 scroll-mt-32"
          >
            <h2 className="mb-6 px-1 text-xl font-bold text-gray-900">
              {category.name}
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {(itemsByCategory.get(category.id) ?? []).map((item) => (
                <div
                  key={item.id}
                  className={`group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:shadow-xl ${
                    item.is_available ? "" : "grayscale opacity-70"
                  }`}
                >
                  {item.image_url ? (
                    <button
                      type="button"
                      onClick={() => openImage(item.image_url!)}
                      aria-label={t("publicMenu.openItemImage", {
                        defaultValue: "Open image for {{name}}",
                        name: item.name,
                      })}
                      className="h-40 w-full bg-gray-100"
                    >
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ) : (
                    <div className="flex h-32 w-full items-center justify-center border-b border-gray-100 bg-gray-50">
                      <ImageIcon className="h-8 w-8 text-gray-300" />
                    </div>
                  )}

                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="mb-2 text-base leading-tight font-bold text-gray-900">
                      {item.name}
                    </h3>
                    {item.description ? (
                      <p className="mb-4 flex-1 text-xs leading-relaxed text-gray-500">
                        {item.description}
                      </p>
                    ) : (
                      <div className="mb-4 flex-1" />
                    )}

                    <div className="mt-auto flex items-center justify-between border-t border-gray-100 pt-3">
                      <span className="text-lg font-black text-gray-900">
                        {currencySymbol}
                        {item.price.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </main>

      <footer className="mt-12 pb-8 text-center">
        <p className="text-xs font-bold text-gray-400">
          {t("publicMenu.poweredByPrefix", "Powered by")}{" "}
          <span className="text-orange-500">MenuQR</span>
        </p>
      </footer>
    </div>
  );
}

function renderTemplate(theme: MenuTheme, props: TemplateProps) {
  switch (theme) {
    case "classic":
      return <ClassicTemplate {...props} />;
    case "dark":
      return <DarkTemplate {...props} />;
    case "visual":
      return <VisualTemplate {...props} />;
    case "minimalist":
    default:
      return <MinimalistTemplate {...props} />;
  }
}

function getTheme(theme: string | null | undefined): MenuTheme {
  return MENU_THEMES.includes(theme as MenuTheme)
    ? (theme as MenuTheme)
    : "minimalist";
}

export default function PublicMenu() {
  const { restaurantId } = useParams();
  const [searchParams] = useSearchParams();
  const { t, i18n } = useTranslation();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const visibleCategories = useMemo(
    () => {
      const lowerQuery = searchQuery.toLowerCase();
      return categories.filter((category) =>
        items.some(
          (item) =>
            item.category_id === category.id &&
            item.is_available &&
            (item.name.toLowerCase().includes(lowerQuery) ||
              (item.description && item.description.toLowerCase().includes(lowerQuery)))
        ),
      );
    },
    [categories, items, searchQuery],
  );

  const itemsByCategory = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    const lowerQuery = searchQuery.toLowerCase();
    for (const category of visibleCategories) {
      map.set(
        category.id,
        items.filter(
          (item) =>
            item.category_id === category.id &&
            item.is_available &&
            (item.name.toLowerCase().includes(lowerQuery) ||
              (item.description && item.description.toLowerCase().includes(lowerQuery)))
        ),
      );
    }
    return map;
  }, [items, visibleCategories, searchQuery]);

  const loadMenu = useCallback(async () => {
    if (!restaurantId) return;

    setLoading(true);
    setError("");

    try {
      const { restaurant: rest, categories: cats, items: menuItems } =
        await fetchMenuData(restaurantId);

      setRestaurant(rest);
      setCategories(cats);
      setItems(menuItems);

      const sessionKey = `viewed_${rest.id}`;
      if (!sessionStorage.getItem(sessionKey)) {
        sessionStorage.setItem(sessionKey, "true");
        void supabase
          .from("menu_views")
          .insert({ restaurant_id: rest.id })
          .then(({ error: viewError }) => {
            if (viewError) {
              logger.error("Failed to record public menu view.", viewError, {
                restaurantId: rest.id,
              });
            }
          });
      }
    } catch (menuError) {
      logger.error("Failed to load public menu.", menuError, { restaurantId });
      setError("notFound");
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    void Promise.resolve().then(loadMenu);
  }, [loadMenu]);

  useEffect(() => {
    if (!restaurant) return;

    const menuTitle = `${restaurant.name} - ${t("publicMenu.menu", "Menu")}`;
    document.title = menuTitle;
    setMetaTag("og:title", menuTitle);
    setMetaTag(
      "og:description",
      t("publicMenu.ogDescription", {
        defaultValue: "View the digital menu for {{name}}.",
        name: restaurant.name,
      }),
    );

    if (restaurant.logo_url) {
      setMetaTag("og:image", restaurant.logo_url);
    }
  }, [restaurant, t, i18n.language]);

  const effectiveActiveCategory = visibleCategories.some(
    (category) => category.id === activeCategory,
  )
    ? activeCategory
    : (visibleCategories[0]?.id ?? "");

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);

      let currentActiveId = visibleCategories[0]?.id ?? "";

      for (const category of visibleCategories) {
        const element = document.getElementById(`category-${category.id}`);
        if (element && window.scrollY >= element.offsetTop - 150) {
          currentActiveId = category.id;
        }
      }

      if (currentActiveId && currentActiveId !== effectiveActiveCategory) {
        setActiveCategory(currentActiveId);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [effectiveActiveCategory, visibleCategories]);

  const scrollToCategory = (id: string) => {
    setActiveCategory(id);

    const element = document.getElementById(`category-${id}`);
    if (!element) return;

    const offset = 120;
    const bodyRect = document.body.getBoundingClientRect().top;
    const elementRect = element.getBoundingClientRect().top;
    const elementPosition = elementRect - bodyRect;
    const offsetPosition = elementPosition - offset;

    window.scrollTo({
      top: offsetPosition,
      behavior: "smooth",
    });
  };

  if (loading) {
    return <LoadingSpinner label={t("publicMenu.loading", "Loading menu...")} />;
  }

  if (error || !restaurant) {
    return (
      <div className="flex h-screen items-center justify-center p-8 text-center">
        <h2>{t("publicMenu.notFound", "Menu not found")}</h2>
      </div>
    );
  }

  const currentLanguage = i18n.language.split("-")[0];
  const previewTheme = searchParams.get("previewTheme");
  const activeTheme = getTheme(previewTheme ?? restaurant.menu_theme);

  if (!items.some(item => item.is_available)) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] px-6 py-16 text-center">
        <div className="mx-auto flex max-w-md flex-col items-center">
          <div className="mb-5 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-slate-200/50 bg-black text-white shadow-xl shadow-black/10">
            {restaurant.logo_url ? (
              <img
                src={restaurant.logo_url}
                alt={restaurant.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <ImageIcon className="h-8 w-8 opacity-50" />
            )}
          </div>
          <h1 className="mb-3 text-3xl font-bold text-slate-900">
            {restaurant.name}
          </h1>
          <p className="text-slate-500">
            {t("publicMenu.empty", "Menu is empty.")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {renderTemplate(activeTheme, {
        restaurant,
        visibleCategories,
        itemsByCategory,
        activeCategory: effectiveActiveCategory,
        isScrolled,
        currentLanguage,
        currencySymbol: restaurant.currency_symbol || "$",
        scrollToCategory,
        changeLanguage: (language) => i18n.changeLanguage(language),
        openImage: setSelectedImage,
        searchQuery,
        setSearchQuery,
        t: (key, options) =>
          typeof options === "string" ? t(key, options) : t(key, options ?? {}),
      })}

      {selectedImage ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-6 backdrop-blur-[4px]"
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={() => setSelectedImage(null)}
            aria-label={t("publicMenu.closeImage", "Close image preview")}
            className="absolute top-6 right-6 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white"
          >
            <X className="h-4 w-4" />
          </button>
          <img
            src={selectedImage}
            alt={t("publicMenu.imagePreviewAlt", "Full size preview")}
            className="max-h-full max-w-full rounded-[0.5rem] object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}
    </>
  );
}
