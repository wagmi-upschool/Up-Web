"use client";

import { UserAuthForm } from "@/components/auth/UserAuthForm";

import React from "react";

type Props = {};

function LoginComponent({}: Props) {
  return (
    <>
      <div className="relative h-[100vh]">
        {/* Background SVG */}
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: "url(/login-bg.svg)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        />

        {/* Login Form */}
        <div
          className="absolute z-10 p-8 flex justify-center items-center bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg max-w-md w-full mx-4"
          style={{ left: "64%", transform: "translateX(-50%)", bottom: "266px" }}
        >
          <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
            <div className="flex flex-col space-y-2 text-center">
              <h1 className="text-2xl font-normal font-righteous text-title-black">
                Her gün daha iyi bir sen için UP AI ile sohbete buradan devam!
              </h1>
              <p className="text-sm font-poppins text-gray-600">
                UP kullanıcı bilgilerinle giriş yap.
              </p>
              <p className="text-xs font-poppins text-gray-500">
                Şifre değişikliği işlemini mobil uygulama üzerinden
                yapabilirsin.
              </p>
            </div>
            <UserAuthForm />
          </div>
        </div>
      </div>
    </>
  );
}

export default LoginComponent;
