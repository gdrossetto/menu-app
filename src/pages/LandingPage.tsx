import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { Menu, Globe, BarChart3, QrCode, Sparkles, ChevronRight } from "lucide-react";
import aiImportImg from "../assets/landing_ai_import.png";
import dashboardImg from "../assets/landing_dashboard.png";
import mobileMenuImg from "../assets/landing_mobile.png";

export default function LandingPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const toggleLanguage = () => {
    const nextLang = i18n.language === "en" ? "pt" : "en";
    i18n.changeLanguage(nextLang);
  };

  return (
    <div className="landing-page">
      {/* Navbar */}
      <nav className="landing-nav container">
        <div className="flex items-center gap-2">
          <div className="bg-primary p-1.5 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--color-primary)' }}>
            <Menu size={20} color="white" />
          </div>
          <span className="font-bold text-xl tracking-tight">MenuQR</span>
        </div>
        
        <div className="flex items-center gap-6">
          <button 
            onClick={toggleLanguage}
            className="btn btn-ghost flex items-center gap-2 px-3"
          >
            <Globe size={18} />
            <span className="text-sm font-medium uppercase">{i18n.language}</span>
          </button>
          <Link to="/login" className="btn btn-primary">
            {t("dashboard.title")}
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="hero-section container">
        <div className="animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface border border-border mb-6">
            <Sparkles size={14} className="text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider">{t("editMenu.importAiBadge")}</span>
          </div>
          <h1 className="hero-title">{t("landing.hero.title")}</h1>
          <p className="hero-subtitle">{t("landing.hero.subtitle")}</p>
          <div className="flex justify-center gap-4">
            <button 
              onClick={() => navigate("/login")}
              className="btn btn-primary btn-lg px-8 py-4 text-lg"
              style={{ padding: '1rem 2.5rem', fontSize: '1.1rem' }}
            >
              {t("landing.hero.cta")}
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="section container">
        <h2 className="section-title">{t("dashboard.overview")}</h2>
        <p className="section-subtitle">{t("dashboard.manageMenu")}</p>

        <div className="features-grid">
          {/* Feature 1: AI Import */}
          <div className="feature-card animate-fade-in">
            <div className="feature-image-container">
              <img src={aiImportImg} alt="AI Menu Import" className="feature-image" />
            </div>
            <div className="feature-content">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={24} />
                <h3>{t("landing.features.aiImport.title")}</h3>
              </div>
              <p>{t("landing.features.aiImport.description")}</p>
            </div>
          </div>

          {/* Feature 2: QR Code */}
          <div className="feature-card animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <div className="feature-image-container">
              <img src={dashboardImg} alt="Instant QR Codes" className="feature-image" />
            </div>
            <div className="feature-content">
              <div className="flex items-center gap-2 mb-3">
                <QrCode size={24} />
                <h3>{t("landing.features.qrCode.title")}</h3>
              </div>
              <p>{t("landing.features.qrCode.description")}</p>
            </div>
          </div>

          {/* Feature 3: Analytics */}
          <div className="feature-card animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="feature-image-container">
              <img src={mobileMenuImg} alt="Public Menu" className="feature-image" />
            </div>
            <div className="feature-content">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 size={24} />
                <h3>{t("landing.features.analytics.title")}</h3>
              </div>
              <p>{t("landing.features.analytics.description")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="section bg-surface" style={{ backgroundColor: 'var(--color-surface)' }}>
        <div className="container">
          <h2 className="section-title">{t("landing.howItWorks.title")}</h2>
          <div className="steps-grid mt-12">
            <div className="step-card">
              <span className="step-number">01</span>
              <h3>{t("landing.howItWorks.step1")}</h3>
              <p>{t("landing.howItWorks.step1Desc")}</p>
            </div>
            <div className="step-card">
              <span className="step-number">02</span>
              <h3>{t("landing.howItWorks.step2")}</h3>
              <p>{t("landing.howItWorks.step2Desc")}</p>
            </div>
            <div className="step-card">
              <span className="step-number">03</span>
              <h3>{t("landing.howItWorks.step3")}</h3>
              <p>{t("landing.howItWorks.step3Desc")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="section container">
        <div className="cta-card animate-fade-in">
          <h2 className="cta-title">{t("landing.hero.title")}</h2>
          <button 
            onClick={() => navigate("/login")}
            className="btn btn-lg"
            style={{ 
              backgroundColor: 'white', 
              color: 'black', 
              padding: '1.25rem 3rem', 
              fontSize: '1.2rem',
              fontWeight: '600'
            }}
          >
            {t("landing.hero.cta")}
            <ChevronRight size={22} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer container">
        <span className="footer-logo">MenuQR</span>
        <p className="footer-desc">{t("landing.footer.description")}</p>
        
        <div className="language-selector">
          <button 
            onClick={() => i18n.changeLanguage("en")}
            className={`btn btn-ghost ${i18n.language === "en" ? "font-bold text-primary" : ""}`}
            style={i18n.language === "en" ? { color: 'var(--color-primary)', fontWeight: '700' } : {}}
          >
            English
          </button>
          <button 
            onClick={() => i18n.changeLanguage("pt")}
            className={`btn btn-ghost ${i18n.language === "pt" ? "font-bold text-primary" : ""}`}
            style={i18n.language === "pt" ? { color: 'var(--color-primary)', fontWeight: '700' } : {}}
          >
            Português
          </button>
        </div>
        
        <div className="text-sm text-muted" style={{ color: 'var(--color-text-muted)' }}>
          © {new Date().getFullYear()} MenuQR. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
