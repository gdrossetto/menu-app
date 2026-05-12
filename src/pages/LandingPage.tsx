import { useEffect, useState } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  QrCode,
  Smartphone,
  Sparkles,
  BarChart,
  Globe,
  MoveVertical,
  ArrowRight,
  CheckCircle2,
  AlignJustify,
  X,
  FileText,
  Pencil,
  Trash2,
  GripVertical,
  FileImage,
  type LucideIcon,
} from "lucide-react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "accent" | "ghost";
  className?: string;
  icon?: LucideIcon;
};

const Button = ({
  children,
  variant = "primary",
  className = "",
  icon: Icon,
  type = "button",
  ...props
}: ButtonProps) => {
  const baseStyle =
    "inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full font-medium transition-all duration-200 ease-in-out active:scale-95";
  const variants = {
    primary: "bg-slate-900 text-white hover:bg-slate-800 shadow-lg hover:shadow-xl",
    secondary:
      "bg-white text-slate-900 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-sm",
    accent: "bg-black text-white hover:bg-slate-800 shadow-lg hover:shadow-slate-900/25",
    ghost: "text-slate-600 hover:text-slate-900 hover:bg-slate-100",
  };

  return (
    <button
      type={type}
      className={`${baseStyle} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
      {Icon && <Icon className="w-4 h-4" />}
    </button>
  );
};

const LanguageToggle = ({ mobile = false }: { mobile?: boolean }) => {
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language.split("-")[0];
  const buttonClass = mobile
    ? "text-sm font-semibold text-slate-500 transition-colors hover:text-slate-900"
    : "text-xs font-semibold text-slate-500 transition-colors hover:text-slate-900";

  return (
    <div
      className={`inline-flex items-center rounded-full border border-slate-200 bg-white/90 p-1 shadow-sm ${
        mobile ? "self-start" : ""
      }`}
    >
      <button
        type="button"
        onClick={() => i18n.changeLanguage("en")}
        className={`${buttonClass} rounded-full px-3 py-1.5 ${
          currentLanguage === "en" ? "bg-slate-900 text-white hover:text-white" : ""
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => i18n.changeLanguage("pt")}
        className={`${buttonClass} rounded-full px-3 py-1.5 ${
          currentLanguage === "pt" ? "bg-slate-900 text-white hover:text-white" : ""
        }`}
      >
        PT
      </button>
    </div>
  );
};



const Navbar = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 z-50 w-full transition-all duration-300 ${
        isScrolled
          ? "border-b border-slate-200 bg-white/80 py-4 backdrop-blur-md"
          : "bg-transparent py-6"
      }`}
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 rotate-12 items-center justify-center rounded-lg bg-black">
              <QrCode className="h-5 w-5 -rotate-12 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              MenuQR
            </span>
          </div>

          <div className="hidden items-center gap-8 md:flex">
            <a
              href="#features"
              className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
            >
              {t("landing.nav.features", "Features")}
            </a>
            <a
              href="#how-it-works"
              className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
            >
              {t("landing.nav.howItWorks", "How it Works")}
            </a>
            <a
              href="#pricing"
              className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
            >
              {t("landing.nav.pricing", "Pricing")}
            </a>
          </div>

          <div className="hidden items-center gap-4 md:flex">
            <LanguageToggle />
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              {t("landing.nav.login", "Log in")}
            </button>
            <Button
              variant="primary"
              className="!px-5 !py-2 !text-sm"
              onClick={() => navigate("/login")}
            >
              {t("landing.nav.getStarted", "Get Started")}
            </Button>
          </div>

          <button
            type="button"
            className="p-2 text-slate-600 md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={t("landing.nav.mobileMenu", "Toggle menu")}
          >
            {mobileMenuOpen ? <X /> : <AlignJustify />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="absolute top-full left-0 flex w-full flex-col gap-4 border-b border-slate-200 bg-white px-6 py-4 shadow-lg md:hidden">
          <LanguageToggle mobile />
          <a href="#features" className="py-2 text-base font-medium text-slate-600">
            {t("landing.nav.features", "Features")}
          </a>
          <a
            href="#how-it-works"
            className="py-2 text-base font-medium text-slate-600"
          >
            {t("landing.nav.howItWorks", "How it Works")}
          </a>
          <a href="#pricing" className="py-2 text-base font-medium text-slate-600">
            {t("landing.nav.pricing", "Pricing")}
          </a>
          <hr className="border-slate-100" />
          <div className="flex flex-col gap-3 pt-2">
            <Button
              variant="secondary"
              className="w-full justify-center"
              onClick={() => navigate("/login")}
            >
              {t("landing.nav.login", "Log in")}
            </Button>
            <Button
              variant="primary"
              className="w-full justify-center"
              onClick={() => navigate("/login")}
            >
              {t("landing.nav.getStarted", "Get Started")}
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
};

const Hero = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden bg-slate-50 pt-32 pb-20 lg:pt-48 lg:pb-32">
      <div className="bg-app-grid absolute inset-0 z-0 opacity-50" />

      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid items-center gap-16 lg:grid-cols-2 lg:gap-8">
          <div className="max-w-2xl text-center lg:text-left">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-700">
              <Sparkles className="h-4 w-4" />
              {t("landing.hero.eyebrow", "AI-Powered Menu Import")}
            </div>
            <h1 className="mb-6 text-5xl leading-[1.1] font-extrabold tracking-tight text-slate-900 lg:text-6xl">
              {t("landing.hero.titlePrefix", "The modern menu for")}{" "}
              <span className="bg-gradient-to-r from-slate-600 to-slate-900 bg-clip-text text-transparent">
                {t("landing.hero.titleAccent", "modern dining.")}
              </span>
            </h1>
            <p className="mb-8 text-lg leading-relaxed text-slate-600">
              {t(
                "landing.hero.subtitle",
                "Create, manage, and share your restaurant's digital menu in seconds. No typing required—just upload a photo and let AI build your menu. Beautiful on any device, easy to update, and simple to translate.",
              )}
            </p>
            <div className="flex flex-col items-center gap-4 sm:flex-row lg:justify-start">
              <Button
                variant="accent"
                icon={ArrowRight}
                className="w-full px-8 py-4 text-lg sm:w-auto"
                onClick={() => navigate("/login")}
              >
                {t("landing.hero.primaryCta", "Start for Free")}
              </Button>
              <Button
                variant="secondary"
                icon={Smartphone}
                className="w-full px-8 py-4 text-lg sm:w-auto"
                onClick={() =>
                  document
                    .getElementById("how-it-works")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                {t("landing.hero.secondaryCta", "View Live Demo")}
              </Button>
            </div>
            <p className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-500 lg:justify-start">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              {t("landing.hero.noCard", "No credit card required")}
            </p>
          </div>

          <div className="perspective-1000 relative flex justify-center lg:justify-end">
            <div className="relative w-full max-w-[600px]">
              <div className="absolute top-1/2 left-1/2 -z-10 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-200/50 blur-[100px]" />
              <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition-transform duration-500 hover:rotate-0 md:rotate-[2deg]">
                <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3">
                  <div className="h-3 w-3 rounded-full bg-red-400" />
                  <div className="h-3 w-3 rounded-full bg-yellow-400" />
                  <div className="h-3 w-3 rounded-full bg-green-400" />
                </div>
                <img
                  src="/images/dashboard-preview.png"
                  alt="MenuQR Dashboard"
                  className="w-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const ThemePreviewer = () => {
  const { t } = useTranslation();
  const [activeTheme, setActiveTheme] = useState("classic");
  const demoRestaurantId = "20f89f6a-a00d-455d-9358-37deb286f4e2"; // The test restaurant ID

  const themes = [
    { id: "classic", name: t("landing.themes.classic", "Classic") },
    { id: "modern", name: t("landing.themes.modern", "Modern") },
    { id: "minimal", name: t("landing.themes.minimal", "Minimalist") },
    { id: "visual", name: t("landing.themes.visual", "Visual Grid") },
  ];

  return (
    <section className="bg-slate-900 py-24 text-white">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
            {t("landing.preview.title", "Four stunning themes out of the box.")}
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-slate-400">
            {t(
              "landing.preview.subtitle",
              "Switch themes instantly without touching a line of code. Your menu automatically adapts perfectly to each layout.",
            )}
          </p>
        </div>

        <div className="flex flex-col items-center gap-8 lg:flex-row lg:items-start lg:justify-center lg:gap-16">
          <div className="flex w-full flex-col gap-4 lg:w-[300px]">
            {themes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => setActiveTheme(theme.id)}
                className={`flex w-full items-center justify-between rounded-2xl border p-5 text-left transition-all duration-300 ${
                  activeTheme === theme.id
                    ? "border-slate-700 bg-slate-800 shadow-xl"
                    : "border-slate-800 bg-transparent text-slate-400 hover:border-slate-700 hover:bg-slate-800/50"
                }`}
              >
                <span className="text-lg font-semibold">{theme.name}</span>
                {activeTheme === theme.id && (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-slate-900">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                )}
              </button>
            ))}
          </div>

          <div className="relative flex justify-center">
            <div className="absolute top-1/2 left-1/2 -z-10 h-[500px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-500/20 blur-[100px]" />
            <div className="h-[760px] w-[380px] overflow-hidden rounded-[3rem] border-[8px] border-black bg-white shadow-2xl transition-all duration-500">
              <iframe
                src={`/m/${demoRestaurantId}?previewTheme=${activeTheme}`}
                className="h-full w-full border-none bg-app-surface"
                title="Theme Preview"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const Features = () => {
  const { t } = useTranslation();

  return (
    <section id="features" className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
            {t(
              "landing.featuresSection.title",
              "Everything you need to run a modern restaurant menu",
            )}
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            {t(
              "landing.featuresSection.subtitle",
              "Built with cutting-edge tech to ensure speed, reliability, and an incredible user experience for both you and your guests.",
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Card 1: Drag & Drop (Spans 2 columns) */}
          <div className="relative flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 shadow-sm transition-all duration-300 hover:shadow-app-lg lg:col-span-2">
            <div className="p-8 pb-0">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm">
                <MoveVertical className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-2xl font-bold text-slate-900">
                {t("landing.features.editor.title", "Drag & Drop Editor")}
              </h3>
              <p className="max-w-md text-slate-600">
                {t(
                  "landing.features.editor.description",
                  "Reorder categories and items instantly with a fluid drag-and-drop interface. Changes are live immediately.",
                )}
              </p>
            </div>
            <div className="mt-8 flex justify-end pl-8">
              <img
                src="/images/editor-preview.png"
                alt="Menu Editor"
                className="w-full max-w-[600px] translate-x-4 rounded-tl-2xl border-t border-l border-slate-200 shadow-2xl sm:translate-x-0"
              />
            </div>
          </div>

          {/* Card 2: Mobile First (Spans 1 column) */}
          <div className="relative flex flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 text-white shadow-sm transition-all duration-300 hover:shadow-app-lg">
            <div className="p-8 pb-0">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-white shadow-sm">
                <Smartphone className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-2xl font-bold text-white">
                {t("landing.features.mobile.title", "Mobile-First Menus")}
              </h3>
              <p className="text-slate-400">
                {t(
                  "landing.features.mobile.description",
                  "Fast, beautiful, and intuitive menus optimized for the screens your customers already have in their hands.",
                )}
              </p>
            </div>
            <div className="mt-8 flex flex-1 items-end justify-center px-8">
              <img
                src="/images/mobile-menu-preview.png"
                alt="Mobile Menu"
                className="w-full max-w-[220px] translate-y-8 rounded-t-[2rem] border-[6px] border-slate-800 shadow-2xl transition-transform duration-500 hover:translate-y-4"
              />
            </div>
          </div>

          {/* Row 2: Three equal columns */}
          {/* Card 3: Analytics */}
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition-all duration-300 hover:shadow-app-lg">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-slate-700 shadow-sm">
              <BarChart className="h-6 w-6" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-slate-900">
              {t("landing.features.analytics.title", "Real-Time Analytics")}
            </h3>
            <p className="text-slate-600">
              {t(
                "landing.features.analytics.description",
                "Track daily menu views, popular categories, and peak scanning times directly from your dashboard.",
              )}
            </p>
          </div>

          {/* Card 4: Translations */}
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition-all duration-300 hover:shadow-app-lg">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-slate-700 shadow-sm">
              <Globe className="h-6 w-6" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-slate-900">
              {t("landing.features.translations.title", "Smart Translations")}
            </h3>
            <p className="text-slate-600">
              {t(
                "landing.features.translations.description",
                "Automatically detect browser language and serve your menu seamlessly in English, Portuguese, and more.",
              )}
            </p>
          </div>

          {/* Card 5: QR Code */}
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition-all duration-300 hover:shadow-app-lg">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-slate-700 shadow-sm">
              <QrCode className="h-6 w-6" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-slate-900">
              {t("landing.features.qr.title", "Instant QR Generation")}
            </h3>
            <p className="text-slate-600">
              {t(
                "landing.features.qr.description",
                "Download high-res PNGs for your tables or use our print-optimized layouts to get started instantly.",
              )}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

const AIHighlight = () => {
  const { t } = useTranslation();

  const sampleEditorItems = [
    {
      name: t("landing.highlight.editorItems.0.name", "Mozzarella Sticks"),
      price: t("landing.highlight.editorItems.0.price", "R$7.99"),
    },
    {
      name: t("landing.highlight.editorItems.1.name", "Stuffed Mushrooms"),
      price: t("landing.highlight.editorItems.1.price", "R$8.99"),
    },
  ];

  const bullets = [
    t(
      "landing.highlight.bullets.0",
      "Recognizes categories, items, descriptions, and prices.",
    ),
    t("landing.highlight.bullets.1", "Safe review workflow: edit before you publish."),
    t(
      "landing.highlight.bullets.2",
      "Intelligently merges with existing menu structures.",
    ),
    t("landing.highlight.bullets.3", "Supports empty-menu bootstrapping instantly."),
  ];

  return (
    <section
      id="how-it-works"
      className="relative overflow-hidden border-y border-slate-200 bg-slate-50 py-24"
    >
      <div className="pointer-events-none absolute top-0 right-0 h-[800px] w-[800px] translate-x-1/3 -translate-y-1/2 rounded-full bg-slate-200/50 blur-[120px]" />

      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <div className="relative order-2 flex h-[500px] w-full items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-inner lg:order-1">
            <div className="pointer-events-none absolute inset-0 p-8 opacity-40">
              <div className="mb-4 flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-slate-400" />
                <h4 className="text-lg font-bold text-slate-900">
                  {t("landing.highlight.editorCategory", "Starters")}
                </h4>
              </div>
              <div className="space-y-3">
                {sampleEditorItems.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
                  >
                    <GripVertical className="h-4 w-4 text-slate-400" />
                    <div className="flex h-10 w-10 items-center justify-center rounded border border-slate-100 bg-slate-50">
                      <FileImage className="h-4 w-4 text-slate-300" />
                    </div>
                    <span className="flex-1 text-sm font-semibold text-slate-900">
                      {item.name}
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      {item.price}
                    </span>
                    <Pencil className="h-4 w-4 text-slate-400" />
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </div>
                ))}
              </div>
            </div>

            <div className="relative z-10 mx-4 flex w-full max-w-md flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 p-5">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <Sparkles className="h-4 w-4" />
                  {t("landing.highlight.modal.badge", "AI IMPORT")}
                </div>
                <X className="h-4 w-4 text-slate-400" />
              </div>

              <div className="p-6">
                <h3 className="mb-2 text-xl font-bold text-slate-900">
                  {t(
                    "landing.highlight.modal.title",
                    "Import menu from photo or PDF",
                  )}
                </h3>
                <p className="mb-6 text-sm text-slate-500">
                  {t(
                    "landing.highlight.modal.subtitle",
                    "Upload your current menu and we will draft categories and items for review before anything is added.",
                  )}
                </p>

                <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
                    <FileText className="h-5 w-5 text-slate-600" />
                  </div>
                  <h4 className="mb-1 text-sm font-bold text-slate-900">
                    {t(
                      "landing.highlight.modal.dropTitle",
                      "Choose a menu photo or PDF",
                    )}
                  </h4>
                  <p className="mb-6 max-w-[250px] text-xs text-slate-500">
                    {t(
                      "landing.highlight.modal.dropHint",
                      "Supported formats: JPG, PNG, WebP and PDF. Clear photos and clean PDFs work best.",
                    )}
                  </p>

                  <div className="flex flex-wrap justify-center gap-3">
                    <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm">
                      {t("landing.highlight.modal.browse", "Choose file")}
                    </div>
                    <div className="flex items-center gap-1.5 rounded-full bg-slate-500 px-4 py-2 text-xs font-bold text-white shadow-sm">
                      <Sparkles className="h-3.5 w-3.5" />
                      {t("landing.highlight.modal.createDraft", "Create draft")}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <h2 className="mb-6 text-3xl font-bold text-slate-900 sm:text-4xl">
              {t("landing.highlight.titleLineOne", "Don't type your menu.")}
              <br />
              <span className="text-slate-500">
                {t("landing.highlight.titleLineTwo", "Just snap a picture.")}
              </span>
            </h2>
            <p className="mb-8 text-lg leading-relaxed text-slate-600">
              {t(
                "landing.highlight.description",
                "Transitioning to digital has never been faster. Our built-in AI import uses advanced vision models to read your physical menu or PDF and instantly convert it into a structured, editable digital draft.",
              )}
            </p>

            <ul className="mb-8 space-y-4">
              {bullets.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 shrink-0 text-black" />
                  <span className="text-slate-600">{item}</span>
                </li>
              ))}
            </ul>

            <Button variant="primary" className="w-full sm:w-auto">
              {t("landing.highlight.cta", "See How It Works")}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

const Pricing = () => {
  const { t } = useTranslation();
  const starterFeatures = [
    t("landing.pricing.starter.features.0", "Unlimited menu items"),
    t("landing.pricing.starter.features.1", "Custom QR code generator"),
    t("landing.pricing.starter.features.2", "Mobile-optimized public menu"),
    t("landing.pricing.starter.features.3", "Basic color customization"),
    t("landing.pricing.starter.features.4", "Drag & drop editor"),
  ];

  const professionalFeatures = [
    t("landing.pricing.professional.features.0", "Everything in Starter"),
    t("landing.pricing.professional.features.1", "Unlimited AI Menu Imports"),
    t("landing.pricing.professional.features.2", "7 & 30-day view analytics"),
    t("landing.pricing.professional.features.3", "Multi-language support (i18n)"),
    t("landing.pricing.professional.features.4", "Image optimization & storage"),
    t("landing.pricing.professional.features.5", "Dedicated print-ready layouts"),
  ];

  return (
    <section id="pricing" className="bg-slate-50 py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold text-slate-900 sm:text-4xl">
            {t("landing.pricing.title", "Simple, transparent pricing")}
          </h2>
          <p className="text-lg text-slate-600">
            {t(
              "landing.pricing.subtitle",
              "Start for free, upgrade when you need advanced insights and AI power.",
            )}
          </p>
        </div>

        <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-2">
          <div className="flex flex-col rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h3 className="mb-2 text-xl font-bold text-slate-900">
              {t("landing.pricing.starter.name", "Starter")}
            </h3>
            <p className="mb-6 text-sm text-slate-500">
              {t(
                "landing.pricing.starter.description",
                "Everything you need to digitize your menu.",
              )}
            </p>
            <div className="mb-6">
              <span className="text-4xl font-extrabold text-slate-900">
                {t("landing.pricing.starter.price", "$0")}
              </span>
              <span className="text-slate-500">
                {t("landing.pricing.period", "/mo")}
              </span>
            </div>
            <ul className="mb-8 flex-1 space-y-4">
              {starterFeatures.map((feature) => (
                <li
                  key={feature}
                  className="flex items-center gap-3 text-sm text-slate-600"
                >
                  <CheckCircle2 className="h-5 w-5 text-slate-400" />
                  {feature}
                </li>
              ))}
            </ul>
            <Button variant="secondary" className="w-full">
              {t("landing.pricing.starter.cta", "Get Started")}
            </Button>
          </div>

          <div className="relative flex flex-col rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-xl md:-translate-y-4">
            <div className="absolute top-0 right-8 -translate-y-1/2 transform">
              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-wider text-black shadow-sm">
                {t("landing.pricing.professional.badge", "Most Popular")}
              </span>
            </div>
            <h3 className="mb-2 text-xl font-bold text-white">
              {t("landing.pricing.professional.name", "Professional")}
            </h3>
            <p className="mb-6 text-sm text-slate-400">
              {t(
                "landing.pricing.professional.description",
                "For restaurants that want insights and speed.",
              )}
            </p>
            <div className="mb-6">
              <span className="text-4xl font-extrabold text-white">
                {t("landing.pricing.professional.price", "$29")}
              </span>
              <span className="text-slate-400">
                {t("landing.pricing.period", "/mo")}
              </span>
            </div>
            <ul className="mb-8 flex-1 space-y-4">
              {professionalFeatures.map((feature, index) => (
                <li
                  key={feature}
                  className="flex items-center gap-3 text-sm text-slate-300"
                >
                  <CheckCircle2 className="h-5 w-5 text-white" />
                  {index === 1 ? <strong>{feature}</strong> : feature}
                </li>
              ))}
            </ul>
            <Button variant="secondary" className="w-full">
              {t(
                "landing.pricing.professional.cta",
                "Start 14-Day Free Trial",
              )}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

const CTA = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-5xl px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 p-10 text-center shadow-2xl md:p-16">
          <div className="absolute top-0 right-0 h-64 w-64 translate-x-1/2 -translate-y-1/2 transform rounded-full bg-white/5 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-64 w-64 -translate-x-1/2 translate-y-1/2 transform rounded-full bg-black/20 blur-3xl" />

          <h2 className="relative z-10 mb-6 text-3xl font-bold text-white md:text-5xl">
            {t(
              "landing.cta.title",
              "Ready to upgrade your dining experience?",
            )}
          </h2>
          <p className="relative z-10 mx-auto mb-10 max-w-2xl text-lg text-slate-300">
            {t(
              "landing.cta.subtitle",
              "Join hundreds of restaurants using MenuQR to serve customers faster, update menus instantly, and understand diner behavior.",
            )}
          </p>
          <div className="relative z-10 flex flex-col justify-center gap-4 sm:flex-row">
            <Button
              className="border-none bg-white text-slate-900 hover:bg-slate-100"
              onClick={() => navigate("/login")}
            >
              {t("landing.cta.primary", "Create Your Free Menu")}
            </Button>
            <Button className="border-none bg-slate-800 text-white hover:bg-slate-700">
              {t("landing.cta.secondary", "Contact Sales")}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

const Footer = () => {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-slate-200 bg-slate-50 py-12">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-black">
              <QrCode className="h-4 w-4 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              MenuQR
            </span>
          </div>
          <div className="flex gap-6">
            <a
              href="#"
              className="text-sm text-slate-500 transition-colors hover:text-slate-900"
            >
              {t("landing.footer.terms", "Terms")}
            </a>
            <a
              href="#"
              className="text-sm text-slate-500 transition-colors hover:text-slate-900"
            >
              {t("landing.footer.privacy", "Privacy")}
            </a>
            <a
              href="#"
              className="text-sm text-slate-500 transition-colors hover:text-slate-900"
            >
              {t("landing.footer.support", "Support")}
            </a>
          </div>
          <p className="text-sm text-slate-400">
            © {new Date().getFullYear()} MenuQR.{" "}
            {t("landing.footer.rights", "All rights reserved.")}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default function LandingPage() {
  return (
    <div className="min-h-screen font-sans text-slate-900 selection:bg-slate-200">
      <Navbar />
      <main>
        <Hero />
        <ThemePreviewer />
        <Features />
        <AIHighlight />
        <Pricing />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
