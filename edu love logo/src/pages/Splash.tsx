import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import logoImage from "@/assets/edu-voice-logo.png";

const Splash = () => {
  const navigate = useNavigate();

  const handleLogoClick = () => {
    navigate("/dashboard");
  };

  // Optional: Auto-redirect after a delay
  useEffect(() => {
    const timer = setTimeout(() => {
      // Uncomment to enable auto-redirect after 3 seconds
      // navigate("/dashboard");
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-brand-dark overflow-hidden">
      {/* Intense visible flames from bottom */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute bottom-0 left-0 right-0 h-[60vh] bg-gradient-to-t from-orange-600/70 via-brand-gold/40 to-transparent animate-flame-rise" />
        <div className="absolute bottom-0 left-0 right-0 h-[70vh] bg-gradient-to-t from-orange-500/60 via-brand-gold-light/30 to-transparent animate-flame-rise-delayed" />
        <div className="absolute bottom-0 left-1/4 right-1/4 h-[65vh] bg-gradient-to-t from-red-600/50 via-brand-gold-dark/40 to-transparent animate-flame-flicker" />
        <div className="absolute bottom-0 left-1/3 right-1/3 h-[75vh] bg-gradient-to-t from-orange-700/65 via-orange-400/35 to-transparent animate-flame-intense" />
        <div className="absolute bottom-0 left-[20%] right-[20%] h-[55vh] bg-gradient-to-t from-yellow-600/55 via-yellow-500/25 to-transparent animate-flame-flicker" style={{ animationDelay: '0.5s' }} />
      </div>

      {/* Heat distortion waves */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute bottom-0 left-0 right-0 h-[80vh] bg-gradient-to-t from-transparent via-orange-400/5 to-transparent backdrop-blur-[1px] animate-heat-wave" />
        <div className="absolute bottom-0 left-0 right-0 h-[70vh] bg-gradient-to-t from-transparent via-yellow-500/5 to-transparent backdrop-blur-[2px] animate-heat-wave-delayed" />
        <div className="absolute bottom-[10vh] left-0 right-0 h-[60vh] opacity-40 animate-heat-shimmer">
          <div className="w-full h-full bg-gradient-to-r from-transparent via-orange-300/10 to-transparent blur-sm" />
        </div>
      </div>

      {/* Ember particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Large embers */}
        <div className="absolute bottom-10 left-[10%] w-2 h-2 bg-brand-gold rounded-full blur-sm animate-ember-rise" style={{ animationDelay: '0s' }} />
        <div className="absolute bottom-5 left-[25%] w-1.5 h-1.5 bg-brand-gold-light rounded-full blur-sm animate-ember-rise" style={{ animationDelay: '0.5s' }} />
        <div className="absolute bottom-20 left-[40%] w-2.5 h-2.5 bg-orange-400 rounded-full blur-sm animate-ember-rise-slow" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-8 right-[35%] w-2 h-2 bg-brand-gold rounded-full blur-sm animate-ember-rise" style={{ animationDelay: '1.5s' }} />
        <div className="absolute bottom-15 right-[20%] w-1.5 h-1.5 bg-brand-gold-light rounded-full blur-sm animate-ember-rise-slow" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-12 right-[10%] w-2 h-2 bg-orange-500 rounded-full blur-sm animate-ember-rise" style={{ animationDelay: '2.5s' }} />
        
        {/* Medium embers */}
        <div className="absolute bottom-6 left-[15%] w-1 h-1 bg-brand-gold-light rounded-full blur-[2px] animate-ember-rise-fast" style={{ animationDelay: '0.3s' }} />
        <div className="absolute bottom-10 left-[30%] w-1 h-1 bg-orange-400 rounded-full blur-[2px] animate-ember-rise" style={{ animationDelay: '0.8s' }} />
        <div className="absolute bottom-7 left-[45%] w-1.5 h-1.5 bg-brand-gold rounded-full blur-[2px] animate-ember-rise-fast" style={{ animationDelay: '1.3s' }} />
        <div className="absolute bottom-9 right-[30%] w-1 h-1 bg-brand-gold-light rounded-full blur-[2px] animate-ember-rise" style={{ animationDelay: '1.8s' }} />
        <div className="absolute bottom-11 right-[15%] w-1.5 h-1.5 bg-orange-500 rounded-full blur-[2px] animate-ember-rise-fast" style={{ animationDelay: '2.3s' }} />
        
        {/* Small embers */}
        <div className="absolute bottom-4 left-[20%] w-0.5 h-0.5 bg-brand-gold rounded-full animate-ember-rise-fast" style={{ animationDelay: '0.2s' }} />
        <div className="absolute bottom-8 left-[35%] w-0.5 h-0.5 bg-orange-300 rounded-full animate-ember-rise" style={{ animationDelay: '0.7s' }} />
        <div className="absolute bottom-5 left-[50%] w-0.5 h-0.5 bg-brand-gold-light rounded-full animate-ember-rise-fast" style={{ animationDelay: '1.2s' }} />
        <div className="absolute bottom-6 right-[40%] w-0.5 h-0.5 bg-orange-400 rounded-full animate-ember-rise" style={{ animationDelay: '1.7s' }} />
        <div className="absolute bottom-10 right-[25%] w-0.5 h-0.5 bg-brand-gold rounded-full animate-ember-rise-fast" style={{ animationDelay: '2.2s' }} />
        <div className="absolute bottom-7 right-[12%] w-0.5 h-0.5 bg-orange-300 rounded-full animate-ember-rise" style={{ animationDelay: '2.7s' }} />
      </div>

      {/* Smoke effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute bottom-0 left-[15%] w-32 h-32 bg-gray-400/10 rounded-full blur-3xl animate-smoke-rise" style={{ animationDelay: '0s' }} />
        <div className="absolute bottom-0 left-[45%] w-40 h-40 bg-gray-300/8 rounded-full blur-3xl animate-smoke-rise-slow" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-0 right-[25%] w-36 h-36 bg-gray-400/12 rounded-full blur-3xl animate-smoke-rise" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-0 left-[60%] w-28 h-28 bg-gray-300/10 rounded-full blur-3xl animate-smoke-rise-slow" style={{ animationDelay: '1.5s' }} />
      </div>
      
      {/* Main logo container */}
      <div 
        onClick={handleLogoClick}
        className="relative cursor-pointer group transition-transform duration-300 hover:scale-105 z-10"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleLogoClick();
          }
        }}
        aria-label="Click to enter dashboard"
      >
        {/* Logo wrapper with golden flame animation */}
        <div className="relative animate-golden-flame">
          {/* Shimmer effects - multiple layers for random glints */}
          <div className="absolute inset-0 overflow-hidden">
            <div 
              className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-gold-light to-transparent animate-shimmer"
              style={{ animationDelay: '0s' }}
            />
            <div 
              className="absolute top-1/4 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-gold to-transparent animate-shimmer"
              style={{ animationDelay: '0.7s' }}
            />
            <div 
              className="absolute top-1/2 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-gold-light to-transparent animate-shimmer"
              style={{ animationDelay: '1.4s' }}
            />
            <div 
              className="absolute top-3/4 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-gold to-transparent animate-shimmer"
              style={{ animationDelay: '2.1s' }}
            />
            <div 
              className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-gold-light to-transparent animate-shimmer"
              style={{ animationDelay: '2.8s' }}
            />
          </div>
          
          {/* The actual logo image */}
          <img 
            src={logoImage} 
            alt="Edu Voice Agent" 
            className="relative z-10 w-auto h-auto max-w-[90vw] max-h-[90vh] md:max-w-[600px] md:max-h-[600px] select-none"
            draggable="false"
          />

          {/* Pulsing ring effect on hover */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute inset-0 border-2 border-brand-gold/50 animate-ping" />
            <div className="absolute inset-0 border-2 border-brand-gold-light/30" />
          </div>
        </div>

        {/* Click hint text */}
        <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 text-brand-cream/70 text-sm tracking-wider opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          Click to enter
        </div>
      </div>
    </div>
  );
};

export default Splash;
