"use client";

import React from 'react';
import Lottie from 'lottie-react';
import splashLoadingAnimation from '@/public/lotties/splash_loading.json';

interface LottieSpinnerProps {
  size?: number;
  className?: string;
}

const LottieSpinner: React.FC<LottieSpinnerProps> = ({ 
  size = 200, 
  className = "" 
}) => {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <Lottie 
        animationData={splashLoadingAnimation}
        style={{ width: size, height: size }}
        loop={true}
        autoplay={true}
      />
    </div>
  );
};

export default LottieSpinner;