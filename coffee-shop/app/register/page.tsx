"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Lock, Mail,Phone, User, ArrowRight } from "lucide-react";

type Form = {
  name: string;
  email: string;
  phone: string;
  password: string;
}
export default function Register() {
  const router = useRouter();

  const [form, setForm] = useState<Form>({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name || !form.email ||!form.phone || !form.password) {
      alert("Please fill all fields");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(form.email)) {
      alert("Please enter a valid email");
      return;
    }

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;

    if (!passwordRegex.test(form.password)) {
      alert(
        "Password must contain uppercase, lowercase, number, special character and be at least 8 characters."
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: `+91${form.phone.trim()}`,
          password: form.password.trim(),
        })
      });

      const data = await response.json();

  if(!response.ok){
    alert(data.message || "Something went wrong");
    setLoading(false);
    return;
  }
  alert("Registration successful! Please login.");
  router.push("/login");
}catch (error) {
  console.error("Error during registration:", error);
  alert("An error occurred during registration. Please try again.");
}finally {
  setLoading(false);
}
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#120805]">

      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: "url('/register-bg.jpg')",
        }}
      />
<div className="absolute inset-0 bg-black/40" />
<div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-10">
  <div className="grid w-full max-w-6xl overflow-hidden rounded-[30px] border border-[#704326] bg-[#1c0d08] shadow-2xl lg:grid-cols-2">

    <div className="relative hidden min-h-[650px] overflow-hidden bg-cover bg-center lg:block"
      style = {{
        backgroundImage: "url('/register-bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}  >

            {/* Image overlay */}
            <div className="absolute inset-0 bg-black/30" />

            <div className="relative z-10 flex h-full flex-col justify-end p-12">

              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#e08a35]">
                Brew & White
              </p>

              <h1 className="mt-4 font-[family-name:var(--font-playfair)] text-6xl font-bold leading-none text-[#f5e1ca]">
                Begin Your
                <br />
                Coffee
                <br />
                Journey
              </h1>

              <p className="mt-5 max-w-md text-lg leading-7 text-[#ead6c2]">
                Create your account and discover coffee,
                desserts and flavors made for every moment.
              </p>

            </div>
          </div>

          {/* RIGHT REGISTER */}
          <div className="flex min-h-[650px] items-center justify-center bg-[#21120c] px-7 py-12 sm:px-12">

            <div className="w-full max-w-md">

              {/* Logo */}
              <img
                src="/logo.jpg"
                alt="Brew & White"
                className="mx-auto mb-6 h-16 w-auto rounded-xl object-contain"
              />

              {/* Heading */}
              <div className="mb-8 text-center">
                <h2 className="font-[family-name:var(--font-playfair)] text-4xl font-bold text-[#f5e1ca]">
                  Create Account
                </h2>

                <p className="mt-3 text-[#bda493]">
                  Join us and start your coffee journey
                </p>
              </div>

              <form onSubmit={handleRegister} className="space-y-5">

                {/* Name */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#f1dfcd]">
                    Full Name
                  </label>

                  <div className="flex items-center rounded-xl border border-[#684631] bg-[#2a1811] px-4 focus-within:border-[#c06b1b]">

                    <User
                      size={19}
                      className="mr-3 text-[#c06b1b]"
                    />

                    <input
                      type="text"
                      placeholder="Enter your full name"
                      value={form.name}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          name: e.target.value,
                        })
                      }
                      className="w-full bg-transparent py-4 text-[#f5e1ca] outline-none placeholder:text-[#927769]"
                    />

                  </div>
                </div>

                {/* Email */}
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

<div>
  <label className="mb-2 block text-sm font-medium text-[#f1dfcd]">
                    Phone
                  </label>  
                  <div className="flex items-center rounded-xl border border-[#684631] bg-[#2a1811] px-4 focus-within:border-[#c06b1b]">
                    <Phone
                      size={19}
                      className="mr-3 text-[#c06b1b]"
                    />
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="Enter your phone number"
                      value={form.phone}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          phone: e.target.value,
                        })
                      }
                      className="w-full bg-transparent py-4 text-[#f5e1ca] outline-none placeholder:text-[#927769]"
                    />
                    </div>
                    

</div>
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
                      placeholder="Create a password"
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
                      className="ml-2 text-[#a88d7a] hover:text-[#e1b78f]"
                    >
                      {showPassword ? (
                        <EyeOff size={20} />
                      ) : (
                        <Eye size={20} />
                      )}
                    </button>

                  </div>
                </div>

                {/* Register */}
                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#b75d08] py-4 font-semibold text-white transition hover:bg-[#cf7319] disabled:cursor-not-allowed disabled:bg-gray-600"
                >
                  {loading ? "Registering..." : "Create Account"}

                  {!loading && <ArrowRight size={19} />}
                </button>

              </form>

              {/* Login */}
              <p className="mt-7 text-center text-sm text-[#a88d7a]">
                Already have an account?{" "}

                <Link
                  href="/login"
                  className="font-semibold text-[#d27a25] hover:underline"
                >
                  Login
                </Link>
              </p>

            </div>
          </div>

        </div>
      </div>
  
    </main>
  );
}