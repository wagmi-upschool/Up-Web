"use client";

import { UserAuthForm } from "@/components/auth/UserAuthForm";

import React from "react";
import LoginStatic from "./LoginStatic";

type Props = {};

function LoginComponent({}: Props) {
  return (
    <>
      <div className="container relative h-[100vh] flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
        <LoginStatic />
        <div className="lg:p-8 h-full flex justify-center items-center relative bg-white">
          <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
            <div className="flex flex-col space-y-2 text-center">
              <h1 className="text-2xl font-normal font-righteous text-title-black">
                Giriş Yap
              </h1>
              <p className="text-sm font-poppins text-gray-600">
                Up mobil uygulamanızdan kullanıcı adı ve şifrenizi girin
              </p>
              <p className="text-xs font-poppins text-gray-500">
                Şifre değişikliği mobil uygulama üzerinden yapılabilir
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
