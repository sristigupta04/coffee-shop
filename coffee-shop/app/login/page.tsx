"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import {
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
} from "lucide-react";

type LoginMode = "email" | "phone";
type Form = {
  email: string;
  password: string;
  phone: string;
};

export default function Login() {
  const router = useRouter();
const [mode, setMode] = useState<LoginMode>("email");
const [form, setForm] = useState<Form>({
  email: "",
  password: "",
  phone: "",
});
 

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Email + Password Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
if(mode === "email"){
      if (!form.email || !form.password) {
        alert("Please fill all fields");
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.email)) {
        alert("Please enter a valid email address");
        return;
      }
    }
  if(mode === "phone"){
      if (!form.phone || !form.password) {
        alert("Please fill all fields");
        return;
      }
      const phoneRegex = /^\d{10}$/; // Simple regex for 10-digit phone numbers
      if (!phoneRegex.test(form.phone)) {
        alert("Please enter a valid 10-digit phone number");
        return;
      }
    }

    setLoading(true);

  try{
    const result = await signIn("credentials", {
      ...(mode === "email" ? { email: form.email } : { phone: `+91${form.phone}` }),
      password: form.password,
      redirect: false,
    });

      if(result?.ok){
        router.push("/");
        router.refresh();
      }else{
        alert("invalid credentials");
      }
    }catch{
      alert("An error occurred during login. Please try again.");
    }finally{
      setLoading(false);
    }
  };

  // Google Login
  const handleGoogleLogin = async () => {
    await signIn("google", {
      callbackUrl: "/",
    });
  };
  const changeMode = (newMode: LoginMode) => {
    setMode(newMode);
    setForm({
      email: "",
      password: "",
      phone: "",
    });
  
  setShowPassword(false);
};

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#120805]">

      {/* {/* Coffee  baclground? */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: "url('/coffee-login.jpg')",
        }}
      />

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Main Card */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-10">

        <div className="grid w-full max-w-6xl overflow-hidden rounded-[30px] border border-[#704326] bg-[#1c0d08]/95 shadow-2xl lg:grid-cols-2">

        {/* LEFT SIDE */}
<div
  className="relative flex min-h-162.5 flex-col justify-center overflow-hidden px-10 py-16 lg:px-14"
  style={{
    backgroundImage: "url('/coffee-logins.jpg')",
    backgroundSize: "cover",
    backgroundPosition: "center",
  }}
>
  {/* Dark overlay */}
  <div className="absolute inset-0 bg-black/45" />

  {/* Content */}
  <div className="relative z-10">

    <p className="mb-5 text-sm font-semibold uppercase tracking-[0.35em] text-[#d57b27]">
      Premium Quality
    </p>

    <h1 className="font-(family-name:--font-playfair) text-6xl font-bold leading-[0.95] text-[#f5e1ca] md:text-7xl">
      Discover the
      <br />
      COFFEE
      <br />
      BEANS
    </h1>

    <p className="mt-7 max-w-lg text-lg leading-8 text-[#f0dcca]">
      Explore our selection of high-quality coffee beans
      from around the world.
    </p>

    <Link
      href="/menu"
      className="mt-8 flex w-fit items-center gap-3 rounded-xl border border-[#c17b3d] px-7 py-3.5 font-semibold text-[#f5e1ca] transition hover:bg-[#a85d25]"
    >
      EXPLORE COFFEE
      <ArrowRight size={19} />
    </Link>

  </div>
</div>
          {/* RIGHT SIDE */}
          <div className="flex items-center justify-center bg-[#21120c] px-7 py-12 sm:px-12">

            <div className="w-full max-w-md">

              {/* Logo */}
              <img
                src="/logo.jpg"
                alt="Brew & White"
                className="mx-auto mb-7 h-16 w-auto rounded-xl object-contain"
              />

              {/* Heading */}
              <div className="mb-8 text-center">
                <h2 className="font-(family-name:--font-playfair) text-4xl font-bold text-[#f5e1ca]">
                  Welcome Back
                </h2>

                <p className="mt-3 text-[#bda493]">
                  Login to continue your coffee journey
                </p>
              </div>

{/* email phone toggle */}
<div className="mb-6 grid grid-cols-2 rounded-xl border border-[#684631] bg-[#2a1811] p-1">
  <button type="button"
  onClick={() => changeMode("email")}
  className={`flex items-center justify-center gap-2 rounded-lg py-3  text-sm font-semibold transition ${
    mode === "email" ?
    "bg-[#b75d08] text-white shadow-md":
    "text-[#bda493] hover:bg-[#352016]"
  }`}>
    <Mail size={19} className="text-[#c06b1b]"  />
    Email
  </button>

  <button type="button"
  onClick={() => changeMode("phone")}
  className={`flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold transition ${
    mode === "phone" ?
    "bg-[#b75d08] text-white shadow-md":
    "text-[#bda493] hover:bg-[#352016]"
  }`}>
    <Phone size={19} className="text-[#c06b1b]"  />
    Phone
  </button>
</div>

              <form onSubmit={handleLogin} className="space-y-5">

                {/* Email */}
                {mode === "email" && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#f1dfcd]">
                      Email
                    </label>
                    <div className="flex items-center rounded-xl border border-[#684631] bg-[#2a1811] px-4 focus-within:border-[#c06b1b]">

                      <Mail
                        size={19}
                        className="mr-3 text-[#c06b1b]"
                      />
                      <input
                        type="email"
                        placeholder="Enter your email"
                        value={form.email}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            email: e.target.value,
                          })
                        }
                        className="w-full bg-transparent py-4 text-[#f5e1ca] outline-none placeholder:text-[#927769]"
                      />

                    </div>
                  </div>
                )}
                {/* phone  */}
              


              {mode === "phone" && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#f1dfcd]">
                    Phone
                  </label>
                  <div className="flex items-center rounded-xl border border-[#684631] bg-[#2a1811] px-4 focus-within:border-[#c06b1b]">
                    <Phone
                      size={19}
                      className="mr-3 text-[#c06b1b]"
                    />
                    <span className="mr-2 border-r border-[#684631] pr-2 text-[#f5e1ca]">+91</span>

                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="Enter your phone number"
                      value={form.phone}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          phone: e.target.value.replace(/\D/g, ""), // Remove non-numeric characters
                        })
                      }
                      className="w-full bg-transparent py-4 text-[#f5e1ca] outline-none placeholder:text-[#927769]"
                    />
                  </div>
                </div>
              )}

                    
                {/* Password */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#f1dfcd]">
                    Password
                  </label>

                  <div className="flex items-center rounded-xl border border-[#684631] bg-[#2a1811] px-4 focus-within:border-[#c06b1b]">

                    <Lock
                      size={19}
                      className="mr-3 text-[#c06b1b]"
                    />

                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={form.password}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          password: e.target.value,
                        })
                      }
                      className="w-full bg-transparent py-4 text-[#f5e1ca] outline-none placeholder:text-[#927769]"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(!showPassword)
                      }
                      className="text-[#a88d7a] hover:text-[#e1b78f]"
                    >
                      {showPassword ? (
                        <EyeOff size={20} />
                      ) : (
                        <Eye size={20} />
                      )}
                    </button>

                  </div>
                </div>
                       
                {/* Login */}
                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#b75d08] py-4 font-semibold text-white transition hover:bg-[#cf7319] disabled:bg-gray-600"
                >
                  {loading ? "Logging in..." : 
                  mode === "email" ? "Login with Email" : "Login with Phone"}
                  {!loading && <ArrowRight size={19} />}
                </button>

              </form>
              {/* forget passwrod here we are next */}
                      <div className="mt-2 flex justify-end">
  <Link
    href="/forgot-password"
    className="text-sm font-medium text-[#d27a25] hover:underline"
  >
    Forgot Password?
  </Link>
</div>
              {/* Divider */}
              <div className="my-6 flex items-center gap-4">
                <div className="h-px flex-1 bg-[#52372a]" />
                <span className="text-xs uppercase tracking-wider text-[#927769]">
                  OR
                </span>
                <div className="h-px flex-1 bg-[#52372a]" />
              </div>

              {/* Google */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#684631] bg-[#2a1811] py-3.5 font-medium text-[#f5e1ca] transition hover:bg-[#352016]"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm font-bold text-[#4285F4]">
                  G
                </span>

                Continue with Google
              </button>

              {/* Register */}
              <p className="mt-7 text-center text-sm text-[#a88d7a]">
                Don't have an account?{" "}
                <Link
                  href="/register"
                  className="font-semibold text-[#d27a25] hover:underline"
                >
                  Register
                </Link>
              </p>

            </div>
          </div>

        </div>
      </div>
    </main>
  );
}